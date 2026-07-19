"""Magic numbers and policy constants. Importable from anywhere in the API."""

from decimal import Decimal

# --- Tariff grid (EUR/pers, 4h slot) ---------------------------------------
# Single source of truth for adult prices. Child price = adult * CHILD_PRICE_RATIO.
ADULT_PRICE_GRID: dict[str, dict[str, Decimal]] = {
    "morning": {
        "small": Decimal("20"),
        "medium": Decimal("18"),
        "large": Decimal("17"),
    },
    "afternoon": {
        "small": Decimal("20"),
        "medium": Decimal("18"),
        "large": Decimal("17"),
    },
    "evening": {
        "small": Decimal("20"),
        "medium": Decimal("18"),
        "large": Decimal("17"),
    },
    "night": {
        "small": Decimal("20"),
        "medium": Decimal("18"),
        "large": Decimal("17"),
    },
}

# Children pay 50% of the adult rate (under 14yo — babies under 3 are free).
CHILD_PRICE_RATIO = Decimal("0.5")
CHILD_AGE_THRESHOLD_YEARS = 14
BABY_AGE_THRESHOLD_YEARS = 3

# Tier brackets — by TOTAL guest count (adults + children).
TIER_SMALL_MAX = 6
TIER_MEDIUM_MAX = 10
TIER_LARGE_MAX = 15

# Food formulas priced per person (€/pers). Legacy platter formula kept for
# historical reservations already booked at that rate.
FOOD_PRICE_PER_PERSON: dict[str, Decimal] = {
    "platters_14": Decimal("14"),
    "menu_19": Decimal("19"),
}

# Food formulas priced per platter (€/plateau) — one platter ≈ 40 pieces.
FOOD_PRICE_PER_PLATTER: dict[str, Decimal] = {
    "platters_30": Decimal("30"),
}

# Default slot hours (Europe/Paris wall clock).
# Each tuple is (start_hour, end_hour, crosses_midnight).
SLOT_DEFAULT_HOURS: dict[str, tuple[int, int, bool]] = {
    "morning": (10, 14, False),
    "afternoon": (14, 18, False),
    "evening": (18, 22, False),
    "night": (22, 2, True),
}

PARIS_TZ_NAME = "Europe/Paris"
