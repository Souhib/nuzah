"""Reservation controller — every DB call + pricing decision lives here."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from noozha.api.models.table import Reservation
from noozha.api.schemas.error import (
    InvalidGuestCountError,
    ReservationNotFoundError,
)
from noozha.api.schemas.reservation import (
    EstimateRequest,
    PriceBreakdown,
    ReservationCreate,
    ReservationUpdate,
)
from noozha.api.utils.pricing import compute_total_price, default_slot_hours


class ReservationController:
    """All reservation read/write logic."""

    @staticmethod
    def _ensure_guests(adults: int, children: int) -> None:
        if adults + children < 1:
            raise InvalidGuestCountError

    @staticmethod
    def _resolve_hours(
        slot: str,
        iso_date: str,
        start_at: datetime | None,
        end_at: datetime | None,
    ) -> tuple[datetime, datetime]:
        """Fill in default slot hours when the admin doesn't override them."""
        default_start, default_end = default_slot_hours(slot, iso_date)  # type: ignore[arg-type]
        return start_at or default_start, end_at or default_end

    # --- read paths ---------------------------------------------------------
    @staticmethod
    async def list_(
        session: AsyncSession,
        *,
        from_iso: str | None = None,
        to_iso: str | None = None,
        status: str | None = None,
        customer_phone: str | None = None,
        customer_name: str | None = None,
    ) -> list[Reservation]:
        """List reservations, optionally filtered by start_at range, status,
        and customer identity. `customer_phone` matches exactly (best signal);
        `customer_name` uses case-insensitive substring match (fallback when
        no phone is on file)."""
        conditions = []
        if from_iso:
            conditions.append(
                Reservation.start_at
                >= datetime.fromisoformat(f"{from_iso}T00:00:00+00:00")
            )
        if to_iso:
            conditions.append(
                Reservation.start_at
                <= datetime.fromisoformat(f"{to_iso}T23:59:59+00:00")
            )
        if status:
            conditions.append(Reservation.status == status)
        if customer_phone:
            conditions.append(Reservation.customer_phone == customer_phone)
        elif customer_name:
            # `.ilike` is a SQLAlchemy column operator; `ty` sees `str` and
            # trips — provably a false positive here (the class attribute is
            # a Column at runtime, only the instance attribute is `str`).
            conditions.append(
                Reservation.customer_name.ilike(  # ty: ignore[unresolved-attribute]
                    f"%{customer_name}%"
                )
            )
        stmt = select(Reservation)
        if conditions:
            stmt = stmt.where(and_(*conditions))
        stmt = stmt.order_by(Reservation.start_at)
        result = await session.exec(stmt)
        return list(result.all())

    @staticmethod
    async def get(session: AsyncSession, reservation_id: UUID) -> Reservation:
        result = await session.exec(
            select(Reservation).where(Reservation.id == reservation_id)
        )
        reservation = result.first()
        if reservation is None:
            raise ReservationNotFoundError
        return reservation

    # --- write paths --------------------------------------------------------
    @classmethod
    async def create(
        cls, session: AsyncSession, payload: ReservationCreate
    ) -> Reservation:
        cls._ensure_guests(payload.adults, payload.children)
        start_at, end_at = cls._resolve_hours(
            payload.slot, payload.date, payload.start_at, payload.end_at
        )
        food_children = min(payload.food_children, payload.food_persons or 0)
        breakdown = compute_total_price(
            slot=payload.slot,
            adults=payload.adults,
            children=payload.children,
            food_formula=payload.food_formula,
            food_persons=payload.food_persons,
            food_children=food_children,
            food_platters=payload.food_platters,
            discount=payload.discount_amount,
            tip=payload.tip_amount,
            extra=payload.extra_amount,
        )
        reservation = Reservation(
            slot=payload.slot,  # type: ignore[arg-type]
            start_at=start_at,  # type: ignore[arg-type]
            end_at=end_at,  # type: ignore[arg-type]
            customer_name=payload.customer_name.strip(),
            customer_phone=payload.customer_phone.strip(),
            adults=payload.adults,
            children=payload.children,
            babies=payload.babies,
            base_price_pool=breakdown["pool"],  # type: ignore[arg-type]
            food_formula=payload.food_formula,  # type: ignore[arg-type]
            food_persons=payload.food_persons,
            food_children=food_children,
            food_platters=payload.food_platters,
            food_price_total=breakdown["food"],  # type: ignore[arg-type]
            discount_amount=breakdown["discount"],  # type: ignore[arg-type]
            discount_reason=payload.discount_reason,
            extra_amount=breakdown["extra"],  # type: ignore[arg-type]
            extra_reason=payload.extra_reason,
            tip_amount=breakdown["tip"],  # type: ignore[arg-type]
            total_price=breakdown["total"],  # type: ignore[arg-type]
            deposit_paid=payload.deposit_paid,
            deposit_method=payload.deposit_method,  # type: ignore[arg-type]
            status=payload.status,  # type: ignore[arg-type]
            notes=payload.notes,
        )
        session.add(reservation)
        await session.commit()
        await session.refresh(reservation)
        return reservation

    @classmethod
    async def update(  # noqa: PLR0915 — legitimately many partial-update branches
        cls,
        session: AsyncSession,
        reservation_id: UUID,
        payload: ReservationUpdate,
    ) -> Reservation:
        reservation = await cls.get(session, reservation_id)

        # Apply field-level overrides, defaulting to the existing value.
        slot = payload.slot or reservation.slot.value  # type: ignore[union-attr]
        iso_date = payload.date or reservation.start_at.date().isoformat()
        adults = payload.adults if payload.adults is not None else reservation.adults
        children = (
            payload.children if payload.children is not None else reservation.children
        )
        babies = (
            payload.babies if payload.babies is not None else reservation.babies
        )
        cls._ensure_guests(adults, children)

        food_formula = (
            None
            if payload.clear_food
            else (
                payload.food_formula
                if payload.food_formula is not None
                else (
                    reservation.food_formula.value if reservation.food_formula else None
                )
            )
        )
        food_persons = (
            None
            if payload.clear_food
            else (
                payload.food_persons
                if payload.food_persons is not None
                else reservation.food_persons
            )
        )
        food_children = (
            0
            if payload.clear_food
            else (
                payload.food_children
                if payload.food_children is not None
                else reservation.food_children
            )
        )
        if food_persons is not None:
            food_children = min(food_children, food_persons)
        food_platters = (
            0
            if payload.clear_food
            else (
                payload.food_platters
                if payload.food_platters is not None
                else reservation.food_platters
            )
        )
        discount = (
            payload.discount_amount
            if payload.discount_amount is not None
            else reservation.discount_amount
        )
        tip = (
            payload.tip_amount
            if payload.tip_amount is not None
            else reservation.tip_amount
        )
        extra = (
            payload.extra_amount
            if payload.extra_amount is not None
            else reservation.extra_amount
        )

        start_at, end_at = cls._resolve_hours(
            slot, iso_date, payload.start_at, payload.end_at
        )
        breakdown = compute_total_price(
            slot=slot,  # type: ignore[arg-type]
            adults=adults,
            children=children,
            food_formula=food_formula,  # type: ignore[arg-type]
            food_persons=food_persons,
            food_children=food_children,
            food_platters=food_platters,
            discount=Decimal(str(discount)),
            tip=Decimal(str(tip)),
            extra=Decimal(str(extra)),
        )

        reservation.slot = slot  # type: ignore[assignment]
        reservation.start_at = start_at  # type: ignore[assignment]
        reservation.end_at = end_at  # type: ignore[assignment]
        if payload.customer_name is not None:
            reservation.customer_name = payload.customer_name.strip()
        if payload.customer_phone is not None:
            reservation.customer_phone = payload.customer_phone.strip()
        reservation.adults = adults
        reservation.children = children
        reservation.babies = babies
        reservation.food_formula = food_formula  # type: ignore[assignment]
        reservation.food_persons = food_persons
        reservation.food_children = food_children
        reservation.food_platters = food_platters
        reservation.base_price_pool = breakdown["pool"]  # type: ignore[assignment]
        reservation.food_price_total = breakdown["food"]  # type: ignore[assignment]
        reservation.discount_amount = breakdown["discount"]  # type: ignore[assignment]
        if payload.discount_reason is not None:
            reservation.discount_reason = payload.discount_reason
        reservation.extra_amount = breakdown["extra"]  # type: ignore[assignment]
        if payload.extra_reason is not None:
            reservation.extra_reason = payload.extra_reason
        reservation.tip_amount = breakdown["tip"]  # type: ignore[assignment]
        reservation.total_price = breakdown["total"]  # type: ignore[assignment]
        if payload.deposit_paid is not None:
            reservation.deposit_paid = payload.deposit_paid
            # Auto-clear the method when unpaying: the front sends
            # deposit_method=null in that case but our partial-update
            # semantics treat null as "no change" — without this the old
            # method would linger.
            if not payload.deposit_paid:
                reservation.deposit_method = None
        if payload.deposit_method is not None:
            reservation.deposit_method = payload.deposit_method  # type: ignore[assignment]
        if payload.status is not None:
            reservation.status = payload.status  # type: ignore[assignment]
        if payload.notes is not None:
            reservation.notes = payload.notes

        session.add(reservation)
        await session.commit()
        await session.refresh(reservation)
        return reservation

    @classmethod
    async def delete(cls, session: AsyncSession, reservation_id: UUID) -> None:
        reservation = await cls.get(session, reservation_id)
        await session.delete(reservation)
        await session.commit()

    # --- pricing preview ----------------------------------------------------
    @staticmethod
    def estimate(payload: EstimateRequest) -> PriceBreakdown:
        food_children = min(payload.food_children, payload.food_persons or 0)
        breakdown = compute_total_price(
            slot=payload.slot,
            adults=payload.adults,
            children=payload.children,
            food_formula=payload.food_formula,
            food_persons=payload.food_persons,
            food_children=food_children,
            food_platters=payload.food_platters,
            discount=payload.discount_amount,
            tip=payload.tip_amount,
            extra=payload.extra_amount,
        )
        return PriceBreakdown(
            tier=breakdown["tier"],  # type: ignore[arg-type]
            adult_unit_price=breakdown["adult_unit"],  # type: ignore[arg-type]
            child_unit_price=breakdown["child_unit"],  # type: ignore[arg-type]
            pool_total=breakdown["pool"],  # type: ignore[arg-type]
            food_total=breakdown["food"],  # type: ignore[arg-type]
            extra=breakdown["extra"],  # type: ignore[arg-type]
            discount=breakdown["discount"],  # type: ignore[arg-type]
            tip=breakdown["tip"],  # type: ignore[arg-type]
            grand_total=breakdown["total"],  # type: ignore[arg-type]
        )
