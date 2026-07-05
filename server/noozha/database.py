"""Async SQLAlchemy engine + per-request session DI.

Mirrors the LaTabdhir pattern: one shared `AsyncEngine` singleton per process,
sessions yielded via `get_session`, and `create_db_and_tables` runs `SQLModel.metadata.create_all`
at app startup (no Alembic for this small scope; reseed if you change a column).
"""

from collections.abc import AsyncGenerator
from typing import Any

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import AsyncAdaptedQueuePool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from noozha.settings import Settings

_PG_SERVER_SETTINGS = {
    # Abort any single statement that runs longer than 30s.
    "statement_timeout": "30000",
    # Release a connection that's been idle inside a transaction for >60s.
    "idle_in_transaction_session_timeout": "60000",
    "application_name": "noozha-api",
}

_engine: AsyncEngine | None = None


async def create_app_engine(settings: Settings) -> AsyncEngine:
    """Build the AsyncEngine for the long-lived API process."""
    is_postgres = settings.database_url.startswith(("postgresql", "postgres"))
    connect_args: dict[str, Any] = (
        {"server_settings": _PG_SERVER_SETTINGS, "statement_cache_size": 0}
        if is_postgres
        else {}
    )

    return create_async_engine(
        settings.database_url,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=5,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=3600,
        pool_pre_ping=True,
        echo=False,
        connect_args=connect_args,
    )


async def get_engine() -> AsyncEngine:
    """Return the shared async engine (lazy singleton)."""
    global _engine  # noqa: PLW0603 — one shared AsyncEngine per process
    if _engine is None:
        _engine = await create_app_engine(Settings())  # ty: ignore[missing-argument]
    return _engine


async def get_session(
    engine: AsyncEngine = Depends(get_engine),
) -> AsyncGenerator[AsyncSession, Any]:
    """FastAPI dependency: yield a transaction-aware async session per request."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_db_and_tables(engine: AsyncEngine) -> None:
    """Idempotent `create_all` + the pre-Alembic ALTERs. Safe on every boot."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await _apply_pre_alembic_migrations(engine)


async def _apply_pre_alembic_migrations(engine: AsyncEngine) -> None:
    """Idempotent schema deltas that `create_all` cannot apply on its own
    (it only creates missing tables; it never alters existing ones).

    Every statement here MUST be `IF NOT EXISTS`/idempotent so it's safe to
    run on every container boot. SQLite skips — its tests recreate fresh tables.
    """
    if "sqlite" in str(engine.url):
        return

    async with engine.begin() as conn:
        # 2026-06-25: per-reservation food-children count (subset of food_persons
        # paying the -50% child rate). Added without dropping the table because
        # `create_all` already exists in prod with the old schema.
        await conn.execute(
            text(
                "ALTER TABLE reservations "
                "ADD COLUMN IF NOT EXISTS food_children INTEGER NOT NULL DEFAULT 0"
            )
        )
        # 2026-06-25: optional tip ("pour boire") recorded post-visit. Counts as
        # revenue — folded into total_price so existing stats keep working.
        await conn.execute(
            text(
                "ALTER TABLE reservations "
                "ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0"
            )
        )
        # 2026-07-05: optional "supplément" (add-on at booking time, quoted at
        # the devis — e.g. an extra platter). Semantically distinct from a tip
        # (post-visit gift) — it's agreed at booking so has a short label to
        # remember what was billed for.
        await conn.execute(
            text(
                "ALTER TABLE reservations "
                "ADD COLUMN IF NOT EXISTS extra_amount NUMERIC(10, 2) NOT NULL DEFAULT 0"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS extra_reason VARCHAR"
            )
        )
