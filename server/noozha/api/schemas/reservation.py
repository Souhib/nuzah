"""Reservation request / response / breakdown schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from noozha.api.schemas.shared import BaseModel, Money

Slot = Literal["morning", "afternoon", "evening", "night"]
Status = Literal["pending", "confirmed", "cancelled"]
FoodFormula = Literal["platters_14", "platters_30", "menu_19"]
DepositMethod = Literal["wero", "revolut", "paypal", "cash", "other"]


class ReservationBase(BaseModel):
    """Fields shared between create / update / response."""

    slot: Slot
    date: str = Field(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="ISO date (YYYY-MM-DD) in Europe/Paris.",
    )
    start_at: datetime | None = Field(
        default=None,
        description="Override start time. Defaults to the slot's standard hour.",
    )
    end_at: datetime | None = Field(
        default=None,
        description="Override end time. Defaults to the slot's standard hour.",
    )
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_phone: str = Field(default="", max_length=40)
    adults: int = Field(..., ge=0, le=50)
    children: int = Field(..., ge=0, le=50)
    food_formula: FoodFormula | None = None
    food_persons: int | None = Field(default=None, ge=0, le=60)
    food_children: int = Field(default=0, ge=0, le=60)
    food_platters: int = Field(default=0, ge=0, le=20)
    discount_amount: Money = Field(default=0)  # type: ignore[assignment]
    discount_reason: str | None = Field(default=None, max_length=500)
    extra_amount: Money = Field(default=0)  # type: ignore[assignment]
    extra_reason: str | None = Field(default=None, max_length=500)
    tip_amount: Money = Field(default=0)  # type: ignore[assignment]
    deposit_paid: bool = False
    deposit_method: DepositMethod | None = None
    status: Status = "pending"
    notes: str | None = Field(default=None, max_length=2000)


class ReservationCreate(ReservationBase):
    """POST /reservations payload — same shape as the base."""


class ReservationUpdate(BaseModel):
    """PATCH /reservations/{id} — every field optional."""

    slot: Slot | None = None
    date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_at: datetime | None = None
    end_at: datetime | None = None
    customer_name: str | None = Field(default=None, min_length=1, max_length=200)
    customer_phone: str | None = Field(default=None, max_length=40)
    adults: int | None = Field(default=None, ge=0, le=50)
    children: int | None = Field(default=None, ge=0, le=50)
    food_formula: FoodFormula | None = None
    clear_food: bool = False  # set true to explicitly null out the food fields
    food_persons: int | None = Field(default=None, ge=0, le=60)
    food_children: int | None = Field(default=None, ge=0, le=60)
    food_platters: int | None = Field(default=None, ge=0, le=20)
    discount_amount: Money | None = None
    discount_reason: str | None = Field(default=None, max_length=500)
    extra_amount: Money | None = None
    extra_reason: str | None = Field(default=None, max_length=500)
    tip_amount: Money | None = None
    deposit_paid: bool | None = None
    deposit_method: DepositMethod | None = None
    status: Status | None = None
    notes: str | None = Field(default=None, max_length=2000)


class PriceBreakdown(BaseModel):
    """Detailed price decomposition — useful for the form's live preview."""

    tier: Literal["small", "medium", "large"]
    adult_unit_price: Money
    child_unit_price: Money
    pool_total: Money
    food_total: Money
    extra: Money
    discount: Money
    tip: Money
    grand_total: Money


class EstimateRequest(BaseModel):
    """POST /reservations/estimate — quick preview without persisting."""

    slot: Slot
    adults: int = Field(..., ge=0, le=50)
    children: int = Field(..., ge=0, le=50)
    food_formula: FoodFormula | None = None
    food_persons: int | None = Field(default=None, ge=0, le=60)
    food_children: int = Field(default=0, ge=0, le=60)
    food_platters: int = Field(default=0, ge=0, le=20)
    discount_amount: Money = Field(default=0)  # type: ignore[assignment]
    extra_amount: Money = Field(default=0)  # type: ignore[assignment]
    tip_amount: Money = Field(default=0)  # type: ignore[assignment]


class ReservationResponse(BaseModel):
    id: UUID
    slot: Slot
    start_at: datetime
    end_at: datetime
    customer_name: str
    customer_phone: str
    adults: int
    children: int
    base_price_pool: Money
    food_formula: FoodFormula | None
    food_persons: int | None
    food_children: int
    food_platters: int
    food_price_total: Money
    discount_amount: Money
    discount_reason: str | None
    extra_amount: Money
    extra_reason: str | None
    tip_amount: Money
    total_price: Money
    deposit_paid: bool
    deposit_method: DepositMethod | None
    status: Status
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ReservationListResponse(BaseModel):
    reservations: list[ReservationResponse]
