"""Single source of truth for tariff calculation.

The grid lives in `noozha.api.constants.ADULT_PRICE_GRID`; this module just
applies it to a (slot, adults, children, food, discount) tuple and returns a
breakdown that controllers store + the front displays.
"""

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from zoneinfo import ZoneInfo

from noozha.api.constants import (
    ADULT_PRICE_GRID,
    CHILD_PRICE_RATIO,
    FOOD_PRICE_PER_PERSON,
    PARIS_TZ_NAME,
    SLOT_DEFAULT_HOURS,
    TIER_MEDIUM_MAX,
    TIER_SMALL_MAX,
)

Slot = Literal["morning", "afternoon", "evening", "night"]
Tier = Literal["small", "medium", "large"]
FoodFormula = Literal["platters_14", "menu_19"]


def _quantize(value: Decimal) -> Decimal:
    """Round to 2 decimals using banker-safe HALF_UP."""
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_tier(total_guests: int) -> Tier:
    """Bracket the group size into a tariff tier."""
    if total_guests <= TIER_SMALL_MAX:
        return "small"
    if total_guests <= TIER_MEDIUM_MAX:
        return "medium"
    return "large"


def compute_pool_price(
    slot: Slot, adults: int, children: int
) -> tuple[Tier, Decimal, Decimal, Decimal]:
    """Return `(tier, adult_unit_price, child_unit_price, pool_total)`."""
    tier = get_tier(adults + children)
    adult_unit = ADULT_PRICE_GRID[slot][tier]
    child_unit = _quantize(adult_unit * CHILD_PRICE_RATIO)
    total = _quantize(adult_unit * adults + child_unit * children)
    return tier, adult_unit, child_unit, total


def compute_food_price(
    formula: FoodFormula | None,
    persons: int | None,
    children: int | None = 0,
) -> Decimal:
    """Return total food cost (€) for the given formula.

    `persons` is the TOTAL number of people who eat. `children` is the subset
    that pays the child rate (50% of the adult rate, mirroring the pool grid).
    Returns `Decimal("0")` if no formula picked or no eaters.
    """
    if not formula or not persons or persons <= 0:
        return Decimal("0")
    children = max(0, min(children or 0, persons))
    adults = persons - children
    unit = FOOD_PRICE_PER_PERSON[formula]
    return _quantize(unit * adults + unit * CHILD_PRICE_RATIO * children)


def compute_total_price(
    *,
    slot: Slot,
    adults: int,
    children: int,
    food_formula: FoodFormula | None = None,
    food_persons: int | None = None,
    food_children: int | None = None,
    discount: Decimal | None = None,
    tip: Decimal | None = None,
    extra: Decimal | None = None,
) -> dict[str, Decimal | Tier]:
    """Aggregate the full price breakdown.

    Returns a dict with keys: `tier`, `adult_unit`, `child_unit`, `pool`, `food`,
    `extra`, `discount`, `tip`, `total`. All numeric values are quantized to 2 decimals.
    Formula: total = pool + food + extra - discount + tip.
    """
    tier, adult_unit, child_unit, pool = compute_pool_price(slot, adults, children)
    food = compute_food_price(food_formula, food_persons, food_children)
    discount_value = max(Decimal("0"), discount or Decimal("0"))
    tip_value = max(Decimal("0"), tip or Decimal("0"))
    extra_value = max(Decimal("0"), extra or Decimal("0"))
    total = max(
        Decimal("0"),
        _quantize(pool + food + extra_value - discount_value + tip_value),
    )
    return {
        "tier": tier,
        "adult_unit": adult_unit,
        "child_unit": child_unit,
        "pool": pool,
        "food": food,
        "extra": extra_value,
        "discount": discount_value,
        "tip": tip_value,
        "total": total,
    }


# --- Slot hour helpers ------------------------------------------------------
def default_slot_hours(slot: Slot, iso_date: str) -> tuple[datetime, datetime]:
    """Compute the standard `(start_at, end_at)` for a slot on a given date.

    `iso_date` is interpreted in `Europe/Paris`. The returned datetimes are
    tz-aware (`Europe/Paris`); Postgres `TIMESTAMP WITH TIME ZONE` stores them
    as UTC under the hood.
    """
    tz = ZoneInfo(PARIS_TZ_NAME)
    start_h, end_h, crosses_midnight = SLOT_DEFAULT_HOURS[slot]
    year, month, day = (int(x) for x in iso_date.split("-"))
    start_at = datetime(year, month, day, start_h, 0, 0, tzinfo=tz)
    if crosses_midnight:
        end_at = (start_at + timedelta(hours=24 - start_h + end_h)).replace(
            hour=end_h, minute=0, second=0
        )
    else:
        end_at = datetime(year, month, day, end_h, 0, 0, tzinfo=tz)
    return start_at, end_at
