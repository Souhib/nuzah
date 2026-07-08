"""SQLModel table definitions. Every concrete table inherits from `BaseTable`."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import TIMESTAMP, Column, Numeric
from sqlalchemy import Enum as SqlEnum
from sqlmodel import Field

from noozha.api.schemas.shared import BaseTable


class Slot(StrEnum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"


class Status(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class FoodFormula(StrEnum):
    # Legacy per-person platter formula — kept so existing 14€/pers reservations
    # remain editable without their price changing. New bookings use PLATTERS_30.
    PLATTERS_14 = "platters_14"
    # Current platter formula — priced per platter (~40 pieces), stored in
    # `food_platters`; `food_persons` is unused for this formula.
    PLATTERS_30 = "platters_30"
    MENU_19 = "menu_19"


class DepositMethod(StrEnum):
    WERO = "wero"
    REVOLUT = "revolut"
    PAYPAL = "paypal"
    CASH = "cash"
    OTHER = "other"


class ContactChannel(StrEnum):
    """Where the reservation was booked from — informational, no pricing effect."""

    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    PHONE = "phone"
    OTHER = "other"


class AdminUser(BaseTable, table=True):
    __tablename__ = "admin_users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=320)
    password_hash: str = Field(max_length=200)


class Reservation(BaseTable, table=True):
    __tablename__ = "reservations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    slot: Slot = Field(
        sa_column=Column(
            SqlEnum(Slot, name="slot", values_callable=lambda e: [m.value for m in e]),
            nullable=False,
        ),
    )
    start_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False, index=True),
    )
    end_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False),
    )

    customer_name: str = Field(max_length=200)
    customer_phone: str = Field(max_length=40)
    contact_channel: ContactChannel | None = Field(
        default=None,
        sa_column=Column(
            SqlEnum(
                ContactChannel,
                name="contact_channel",
                values_callable=lambda e: [m.value for m in e],
            ),
            nullable=True,
        ),
    )

    adults: int = Field(default=0, ge=0, le=50)
    children: int = Field(default=0, ge=0, le=50)
    # Babies (0-3 y.o.) — informational only, never contributes to pricing
    # or tier calculation. Stored so the admin knows the actual head count.
    babies: int = Field(default=0, ge=0, le=50)

    # Snapshot pricing — frozen at booking time. Future grid changes don't rewrite history.
    base_price_pool: Decimal = Field(
        sa_column=Column(Numeric(10, 2), nullable=False),
    )
    food_formula: FoodFormula | None = Field(
        default=None,
        sa_column=Column(
            SqlEnum(
                FoodFormula,
                name="food_formula",
                values_callable=lambda e: [m.value for m in e],
            ),
            nullable=True,
        ),
    )
    food_persons: int | None = Field(default=None, ge=0, le=60)
    food_children: int = Field(default=0, ge=0, le=60)
    food_platters: int = Field(default=0, ge=0, le=20)
    food_price_total: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column(Numeric(10, 2), nullable=False, default=Decimal("0")),
    )
    discount_amount: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column(Numeric(10, 2), nullable=False, default=Decimal("0")),
    )
    discount_reason: str | None = Field(default=None, max_length=500)
    extra_amount: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column(Numeric(10, 2), nullable=False, default=Decimal("0")),
    )
    extra_reason: str | None = Field(default=None, max_length=500)
    tip_amount: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column(Numeric(10, 2), nullable=False, default=Decimal("0")),
    )

    total_price: Decimal = Field(
        sa_column=Column(Numeric(10, 2), nullable=False),
    )

    deposit_paid: bool = Field(default=False)
    deposit_method: DepositMethod | None = Field(
        default=None,
        sa_column=Column(
            SqlEnum(
                DepositMethod,
                name="deposit_method",
                values_callable=lambda e: [m.value for m in e],
            ),
            nullable=True,
        ),
    )

    status: Status = Field(
        default=Status.PENDING,
        sa_column=Column(
            SqlEnum(
                Status, name="status", values_callable=lambda e: [m.value for m in e]
            ),
            nullable=False,
            default="pending",
        ),
    )

    notes: str | None = Field(default=None, max_length=2000)
