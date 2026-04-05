"""Tax regime optimization engine for IP (sole proprietors) in Kazakhstan.

Deterministic calculations based on НК РК 2026.
Compares Simplified / General / Self-employed regimes and recommends the cheapest.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from src.calculator.constants import TaxConstants, get_constants
from src.calculator.ip_calc import calc_ip_self, calc_semiannual_simplified, calc_employee


# OKED prefixes that are NOT eligible for self-employed (ЕСП).
# ЕСП is for simple personal services only — not for businesses requiring
# premises, equipment, licenses, or organizational structure.
_SELF_EMPLOYED_BANNED_PREFIXES = (
    "01", "02", "03",           # Agriculture, forestry, fishing
    "05", "06", "07", "08", "09",  # Mining
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",  # Manufacturing
    "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
    "30", "31", "32", "33",
    "35",                       # Energy/utilities
    "36", "37", "38", "39",     # Water/waste
    "41", "42", "43",           # Construction
    "45", "46", "47",           # Trade (wholesale/retail)
    "49", "50", "51",           # Transport
    "55",                       # Accommodation (hotels etc.)
    "56",                       # Food services (restaurants)
    "64", "65", "66",           # Finance/insurance
    "68",                       # Real estate
    "84",                       # Public administration
    "85",                       # Education (institutional)
    "86", "87", "88",           # Healthcare
    "92",                       # Gambling
)


def _calc_annual_contributions(monthly_income: float, c: TaxConstants) -> dict:
    """Calculate annual IP self-contributions (ОПВ, СО, ВОСМС) — same for all regimes."""
    monthly = calc_ip_self(monthly_income, c)
    monthly_total = sum(item["amount"] for item in monthly)
    return {
        "monthly_items": monthly,
        "monthly_total": monthly_total,
        "annual_total": monthly_total * 12,
    }


def _calc_simplified(annual_income: float, monthly_income: float, c: TaxConstants) -> dict:
    """Упрощённая декларация — ст. 687-688 НК РК.
    3% от дохода за полугодие (1.5% ИПН + 1.5% соцналог) + ежемесячные взносы.
    Лимит: 24,038 МРП за полугодие, до 30 работников.
    """
    semiannual_income = annual_income / 2
    semi = calc_semiannual_simplified(semiannual_income)
    annual_tax = semi["total"] * 2
    contributions = _calc_annual_contributions(monthly_income, c)

    income_limit_semi = 24_038 * c.mrp
    eligible = annual_income / 2 <= income_limit_semi

    return {
        "regime": "simplified",
        "regime_name_ru": "Упрощённая декларация (СНР)",
        "regime_name_kz": "Жеңілдетілген декларация",
        "regime_name_en": "Simplified Declaration",
        "annual_tax": annual_tax,
        "annual_contributions": contributions["annual_total"],
        "annual_total": annual_tax + contributions["annual_total"],
        "monthly_total": round((annual_tax + contributions["annual_total"]) / 12),
        "tax_rate": "3%",
        "eligible": eligible,
        "details": {
            "semiannual_tax": semi["total"],
            "ipn_part": semi["ipn"],
            "social_tax_part": semi["social_tax"],
            "monthly_contributions": contributions["monthly_items"],
            "income_limit_semi": income_limit_semi,
        },
        "article": "ст. 687-688 НК РК",
    }


def _calc_general(annual_income: float, monthly_income: float, c: TaxConstants) -> dict:
    """Общеустановленный режим (ОУР) — ст. 358 НК РК.
    ИПН 10% от (доход - ОПВ - стандартный вычет 30 МРП/мес).
    Соцналог = 2 МРП/мес минус СО.
    """
    contributions = _calc_annual_contributions(monthly_income, c)
    annual_opv = next(
        (item["amount"] for item in contributions["monthly_items"] if item["code"] == "OPV"), 0
    ) * 12
    annual_so = next(
        (item["amount"] for item in contributions["monthly_items"] if item["code"] == "SO"), 0
    ) * 12

    # ИПН: 10% от (годовой доход - ОПВ - стандартный вычет 30 МРП * 12 мес)
    standard_deduction = 30 * c.mrp * 12
    ipn_base = max(0, annual_income - annual_opv - standard_deduction)

    # Прогрессивная шкала: до 230,000 МРП — 10%, свыше — +15%
    threshold = 230_000 * c.mrp
    if ipn_base <= threshold:
        ipn = round(ipn_base * 0.10)
    else:
        ipn = round(threshold * 0.10 + (ipn_base - threshold) * 0.15)

    # Социальный налог: 2 МРП/мес минус СО (ст. 687 НК РК для ИП без работников)
    monthly_soc_tax = max(0, 2 * c.mrp - next(
        (item["amount"] for item in contributions["monthly_items"] if item["code"] == "SO"), 0
    ))
    annual_soc_tax = monthly_soc_tax * 12

    annual_tax = ipn + annual_soc_tax
    annual_total = annual_tax + contributions["annual_total"]

    return {
        "regime": "general",
        "regime_name_ru": "Общеустановленный режим (ОУР)",
        "regime_name_kz": "Жалпы белгіленген тәртіп",
        "regime_name_en": "General Regime",
        "annual_tax": annual_tax,
        "annual_contributions": contributions["annual_total"],
        "annual_total": annual_total,
        "monthly_total": round(annual_total / 12),
        "tax_rate": "10% ИПН + соцналог",
        "eligible": True,
        "details": {
            "ipn": ipn,
            "ipn_base": ipn_base,
            "standard_deduction": standard_deduction,
            "social_tax": annual_soc_tax,
            "monthly_contributions": contributions["monthly_items"],
        },
        "article": "ст. 358 НК РК",
    }


def _is_oked_eligible_self_employed(oked_code: str | None) -> bool:
    """Check if OKED is eligible for self-employed (ЕСП) regime."""
    if not oked_code:
        return True  # No OKED set — assume eligible
    prefix2 = oked_code[:2]
    return prefix2 not in _SELF_EMPLOYED_BANNED_PREFIXES


def _calc_self_employed(
    annual_income: float,
    c: TaxConstants,
    has_employees: bool,
    oked_code: str | None = None,
    taxpayer_type: str | None = None,
) -> dict:
    """СНР для самозанятых — ЕСП = 1 МРП/мес."""
    oked_ok = _is_oked_eligible_self_employed(oked_code)
    eligible = not has_employees and oked_ok and taxpayer_type != "legal_entity"
    annual_esp = c.mrp * 12

    ineligibility_reasons = []
    if has_employees:
        ineligibility_reasons.append("наличие работников")
    if not oked_ok:
        ineligibility_reasons.append(f"ОКЭД {oked_code} не подходит для ЕСП")
    if taxpayer_type == "legal_entity":
        ineligibility_reasons.append("юрлицо не может применять ЕСП")

    return {
        "regime": "self_employed",
        "regime_name_ru": "СНР для самозанятых (ЕСП)",
        "regime_name_kz": "Өзін-өзі жұмыспен қамтыған (БСТ)",
        "regime_name_en": "Self-Employed (ESP)",
        "annual_tax": annual_esp,
        "annual_contributions": 0,
        "annual_total": annual_esp,
        "monthly_total": c.mrp,
        "tax_rate": f"1 МРП/мес ({c.mrp} ₸)",
        "eligible": eligible,
        "details": {
            "esp_monthly": c.mrp,
            "note": "ЕСП включает ОПВ, СО, ВОСМС, ИПН и соцналог" if eligible
                else f"Недоступен: {', '.join(ineligibility_reasons)}",
        },
        "article": "ст. 774 НК РК",
    }


def _calc_employee_costs(salary_groups: list[dict], c: TaxConstants) -> dict:
    """Calculate total annual employer cost for all employee salary groups."""
    total_monthly_employer = 0
    total_monthly_deductions = 0
    total_employees = 0
    group_details = []

    for group in salary_groups:
        salary = group.get("salary", 0)
        count = group.get("count", 0)
        if salary <= 0 or count <= 0:
            continue

        emp = calc_employee(salary, c)
        total_monthly_employer += emp["total_employer_cost"] * count
        total_monthly_deductions += emp["total_deductions"] * count
        total_employees += count
        group_details.append({
            "salary": salary,
            "count": count,
            "employer_cost_per_employee": emp["total_employer_cost"],
            "total_employer_cost": emp["total_employer_cost"] * count,
        })

    return {
        "total_employees": total_employees,
        "monthly_employer_cost": total_monthly_employer,
        "annual_employer_cost": total_monthly_employer * 12,
        "groups": group_details,
    }


def _get_deadlines(regime: str, today: date) -> list[dict]:
    """Get upcoming tax deadlines based on regime."""
    year = today.year
    all_deadlines = []

    # Common deadlines for all IP
    monthly_deadlines = []
    for month in range(1, 13):
        d = date(year, month, 25)
        if d >= today:
            monthly_deadlines.append({
                "title_ru": "ОПВ, СО, ВОСМС за себя",
                "title_kz": "МЗЖ, ӘА, МӘМС өзі үшін",
                "title_en": "OPV, SO, VOSMS self-contributions",
                "date": d.isoformat(),
                "form": None,
            })
            if len(monthly_deadlines) >= 3:
                break
    all_deadlines.extend(monthly_deadlines)

    if regime == "simplified":
        if date(year, 8, 15) >= today:
            all_deadlines.append({
                "title_ru": "Сдача декларации 910.00 (1 полугодие)",
                "title_kz": "910.00 декларациясын тапсыру (1 жарты жыл)",
                "title_en": "Submit 910.00 declaration (H1)",
                "date": date(year, 8, 15).isoformat(),
                "form": "910.00",
            })
        if date(year, 8, 25) >= today:
            all_deadlines.append({
                "title_ru": "Уплата 3% налога (1 полугодие)",
                "title_kz": "3% салық төлеу (1 жарты жыл)",
                "title_en": "Pay 3% tax (H1)",
                "date": date(year, 8, 25).isoformat(),
                "form": "910.00",
            })
        if date(year + 1, 2, 15) >= today:
            all_deadlines.append({
                "title_ru": "Сдача декларации 910.00 (2 полугодие)",
                "title_kz": "910.00 декларациясын тапсыру (2 жарты жыл)",
                "title_en": "Submit 910.00 declaration (H2)",
                "date": date(year + 1, 2, 15).isoformat(),
                "form": "910.00",
            })
        if date(year + 1, 2, 25) >= today:
            all_deadlines.append({
                "title_ru": "Уплата 3% налога (2 полугодие)",
                "title_kz": "3% салық төлеу (2 жарты жыл)",
                "title_en": "Pay 3% tax (H2)",
                "date": date(year + 1, 2, 25).isoformat(),
                "form": "910.00",
            })
    elif regime == "general":
        if date(year, 3, 31) >= today:
            all_deadlines.append({
                "title_ru": "Сдача декларации 220.00",
                "title_kz": "220.00 декларациясын тапсыру",
                "title_en": "Submit 220.00 declaration",
                "date": date(year, 3, 31).isoformat(),
                "form": "220.00",
            })
        if date(year, 4, 10) >= today:
            all_deadlines.append({
                "title_ru": "Уплата ИПН за год",
                "title_kz": "Жыл үшін ЖТС төлеу",
                "title_en": "Pay annual IIT",
                "date": date(year, 4, 10).isoformat(),
                "form": "220.00",
            })
    elif regime == "self_employed":
        for month in range(1, 13):
            d = date(year, month, 25)
            if d >= today:
                all_deadlines.append({
                    "title_ru": f"Уплата ЕСП за {_month_name_ru(month)}",
                    "title_kz": f"{_month_name_kz(month)} үшін БСТ төлеу",
                    "title_en": f"Pay ESP for {_month_name_en(month)}",
                    "date": d.isoformat(),
                    "form": None,
                })
                if len([dl for dl in all_deadlines if "ЕСП" in dl.get("title_ru", "")]) >= 3:
                    break

    all_deadlines.sort(key=lambda x: x["date"])
    return all_deadlines[:8]


def _month_name_ru(m: int) -> str:
    names = ["", "январь", "февраль", "март", "апрель", "май", "июнь",
             "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"]
    return names[m]


def _month_name_kz(m: int) -> str:
    names = ["", "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
             "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"]
    return names[m]


def _month_name_en(m: int) -> str:
    names = ["", "January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"]
    return names[m]


def optimize(profile: dict, year: int = 2026) -> dict:
    """Run full optimization analysis for a user profile.

    Args:
        profile: User's taxpayer profile (taxpayer_type, tax_regime, annual_income_kzt, etc.)
        year: Tax year for calculations.

    Returns:
        Optimization result with regime comparison, savings, risks, and deadlines.
    """
    c = get_constants(year)
    annual_income = profile.get("annual_income_kzt") or 0
    current_regime = profile.get("tax_regime") or "simplified"
    has_employees = (profile.get("employees_count") or 0) > 0
    oked_banned = profile.get("oked_banned", False)
    oked_code = profile.get("oked_code")
    taxpayer_type = profile.get("taxpayer_type")

    # Parse employee salary groups
    raw_groups = profile.get("employee_salary_groups")
    salary_groups: list[dict] = []
    if isinstance(raw_groups, str):
        try:
            salary_groups = json.loads(raw_groups)
        except (json.JSONDecodeError, TypeError):
            pass
    elif isinstance(raw_groups, list):
        salary_groups = raw_groups

    total_employees = sum(g.get("count", 0) for g in salary_groups)
    if total_employees > 0:
        has_employees = True

    if not annual_income:
        return {
            "profile_complete": False,
            "missing_fields": ["annual_income_kzt"],
            "regimes": [],
            "best_regime": None,
            "current_regime": current_regime,
            "potential_annual_savings": 0,
            "risks": [],
            "deadlines": _get_deadlines(current_regime, date.today()),
            "recommendations": [],
        }

    monthly_income = annual_income / 12

    # Calculate employee costs (same for simplified & general regimes)
    employee_costs = _calc_employee_costs(salary_groups, c) if salary_groups else None
    annual_employee_cost = employee_costs["annual_employer_cost"] if employee_costs else 0

    # Calculate all regimes (IP's own taxes + contributions)
    simplified = _calc_simplified(annual_income, monthly_income, c)
    general = _calc_general(annual_income, monthly_income, c)
    self_employed = _calc_self_employed(annual_income, c, has_employees, oked_code, taxpayer_type)

    # Add employee costs to simplified and general
    if annual_employee_cost > 0:
        for regime in [simplified, general]:
            regime["annual_employee_cost"] = annual_employee_cost
            regime["annual_total"] += annual_employee_cost
            regime["monthly_total"] = round(regime["annual_total"] / 12)
            regime["details"]["employee_costs"] = employee_costs

    # Apply eligibility restrictions
    if oked_banned:
        simplified["eligible"] = False

    # Simplified has employee limit of 30
    if total_employees > 30:
        simplified["eligible"] = False

    regimes = [simplified, general, self_employed]

    # Find best eligible regime
    eligible_regimes = [r for r in regimes if r["eligible"]]
    best = min(eligible_regimes, key=lambda r: r["annual_total"]) if eligible_regimes else None

    # Current regime total
    regime_map = {"simplified": simplified, "general": general, "self_employed": self_employed}
    current = regime_map.get(current_regime, simplified)
    savings = max(0, current["annual_total"] - best["annual_total"]) if best else 0

    # Risks
    risks = []
    semi_limit = 24_038 * c.mrp
    if current_regime == "simplified" and annual_income / 2 > semi_limit * 0.8:
        pct = round(annual_income / 2 / semi_limit * 100)
        risks.append({
            "type": "income_limit",
            "severity": "high" if pct >= 100 else "medium",
            "message_ru": f"Ваш полугодовой доход — {pct}% от лимита упрощёнки ({semi_limit:,.0f} ₸). {'Превышен лимит!' if pct >= 100 else 'Приближаетесь к лимиту.'}",
            "message_kz": f"Жарты жылдық табысыңыз жеңілдетілген шектің {pct}%-ы.",
            "message_en": f"Semi-annual income is {pct}% of simplified regime limit.",
        })
    if oked_banned and current_regime == "simplified":
        risks.append({
            "type": "oked_banned",
            "severity": "high",
            "message_ru": f"Ваш ОКЭД ({oked_code or '?'}) запрещён для упрощённой декларации. Необходимо перейти на ОУР.",
            "message_kz": "Сіздің ОКЭД жеңілдетілген декларация үшін тыйым салынған.",
            "message_en": f"Your OKED ({oked_code or '?'}) is banned for simplified regime.",
        })
    if total_employees > 25 and current_regime == "simplified":
        risks.append({
            "type": "employee_limit",
            "severity": "high" if total_employees > 30 else "medium",
            "message_ru": f"У вас {total_employees} работников. Лимит для упрощёнки — 30 человек.",
            "message_kz": f"Сізде {total_employees} жұмысшы бар. Жеңілдетілген шек — 30 адам.",
            "message_en": f"You have {total_employees} employees. Simplified regime limit is 30.",
        })
    if annual_income > 20_000 * c.mrp:
        risks.append({
            "type": "vat_registration",
            "severity": "medium",
            "message_ru": f"При обороте > {20_000 * c.mrp:,.0f} ₸/год обязательна постановка на учёт по НДС.",
            "message_kz": "НДС есебіне тұру міндетті.",
            "message_en": "VAT registration required when turnover exceeds threshold.",
        })

    # Recommendations
    recommendations = []
    if best and best["regime"] != current_regime and savings > 0:
        recommendations.append({
            "title_ru": f"Перейдите на {best['regime_name_ru']}",
            "title_kz": f"{best['regime_name_kz']} режиміне көшіңіз",
            "title_en": f"Switch to {best['regime_name_en']}",
            "description_ru": f"Экономия составит {savings:,.0f} ₸ в год ({round(savings / 12):,.0f} ₸/мес)",
            "description_kz": f"Жылына {savings:,.0f} ₸ үнемдейсіз",
            "description_en": f"Save {savings:,.0f} ₸ per year ({round(savings / 12):,.0f} ₸/month)",
            "impact_kzt": savings,
        })

    return {
        "profile_complete": True,
        "regimes": regimes,
        "best_regime": best["regime"] if best else None,
        "current_regime": current_regime,
        "potential_annual_savings": savings,
        "risks": risks,
        "deadlines": _get_deadlines(current_regime, date.today()),
        "recommendations": recommendations,
        "employee_summary": employee_costs,
        "constants": {"mrp": c.mrp, "mzp": c.mzp, "year": year},
    }
