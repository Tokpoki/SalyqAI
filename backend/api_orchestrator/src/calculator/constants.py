"""Tax constants per year (Budget Law of RK 2025-2027)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TaxConstants:
    year: int
    mzp: int   # Минимальная заработная плата
    mrp: int   # Месячный расчётный показатель


CONSTANTS_BY_YEAR: dict[int, TaxConstants] = {
    2025: TaxConstants(year=2025, mzp=85_000, mrp=3_932),
    2026: TaxConstants(year=2026, mzp=85_000, mrp=4_053),
    2027: TaxConstants(year=2027, mzp=85_000, mrp=4_180),
}


def get_constants(year: int) -> TaxConstants:
    if year in CONSTANTS_BY_YEAR:
        return CONSTANTS_BY_YEAR[year]
    latest = max(CONSTANTS_BY_YEAR.keys())
    return CONSTANTS_BY_YEAR[latest]
