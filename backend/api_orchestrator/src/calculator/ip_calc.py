"""Pure calculation functions for IP (sole proprietor) taxes in Kazakhstan.

All formulas follow the Tax Code of RK (Салық кодексі) 2025-2026.
References to specific articles are noted in comments.
"""

from __future__ import annotations

from .constants import TaxConstants


# ─── IP "за себя" (monthly) ────────────────────────────────────────────────

def calc_ip_self(declared_income: float, c: TaxConstants) -> list[dict]:
    """Calculate monthly contributions for IP owner.

    Args:
        declared_income: Monthly declared income in KZT.
        c: Tax constants for the target year.

    Returns list of contribution dicts.
    """
    items: list[dict] = []

    # ОПВ — ст. 25 Закона о пенсионном обеспечении
    # 10% от заявленного дохода, min 10%*1МЗП, max 10%*50МЗП
    opv_base = max(c.mzp, min(declared_income, 50 * c.mzp))
    opv = round(opv_base * 0.10)
    items.append({
        "code": "OPV",
        "name_ru": "ОПВ",
        "name_en": "Mandatory pension contributions",
        "name_kz": "МЗЖ",
        "rate": "10%",
        "base": opv_base,
        "amount": opv,
        "article": "ст. 25 Закона о пенсионном обеспечении",
    })

    # СО — ст. 15 Закона о социальном страховании
    # 3.5% от (доход - ОПВ), min 3.5%*1МЗП, max 3.5%*7МЗП
    so_base_raw = declared_income - opv
    so_base = max(c.mzp, min(so_base_raw, 7 * c.mzp))
    so = round(so_base * 0.035)
    items.append({
        "code": "SO",
        "name_ru": "СО",
        "name_en": "Social contributions",
        "name_kz": "ӘА",
        "rate": "3.5%",
        "base": so_base,
        "amount": so,
        "article": "ст. 15 Закона о соц. страховании",
    })

    # ВОСМС — ст. 28 Закона об ОСМС
    # 5% от 1.4 * МЗП (фиксированная сумма)
    vosms_base = round(1.4 * c.mzp)
    vosms = round(vosms_base * 0.05)
    items.append({
        "code": "VOSMS",
        "name_ru": "ВОСМС",
        "name_en": "Medical insurance contributions",
        "name_kz": "МӘМС жарна",
        "rate": "5%",
        "base": vosms_base,
        "amount": vosms,
        "article": "ст. 28 Закона об ОСМС",
    })

    return items


# ─── Полугодовой налог (упрощёнка) ──────────────────────────────────────

def calc_semiannual_simplified(semiannual_income: float) -> dict:
    """Calculate semi-annual tax for simplified regime (ст. 687-688 НК РК).

    3% of total semi-annual income, split equally:
      - ИПН (IIT) = 1.5%
      - Социальный налог = 1.5%
    """
    total = round(semiannual_income * 0.03)
    ipn = round(semiannual_income * 0.015)
    social_tax = total - ipn  # avoid rounding mismatch
    return {
        "semiannual_income": semiannual_income,
        "rate": "3%",
        "total": total,
        "ipn": ipn,
        "ipn_rate": "1.5%",
        "social_tax": social_tax,
        "social_tax_rate": "1.5%",
        "article": "ст. 687-688 НК РК",
        "monthly_equivalent": round(total / 6),
    }


# ─── Расчёт за работника ────────────────────────────────────────────────

def calc_employee(salary: float, c: TaxConstants) -> dict:
    """Calculate all taxes/contributions for one employee.

    Returns dict with deductions (from salary) and employer_costs (on top).
    """
    deductions: list[dict] = []
    employer_costs: list[dict] = []

    # === Удержания из зарплаты (deductions) ===

    # ОПВ работника — 10% от ЗП
    opv = round(min(salary, 50 * c.mzp) * 0.10)
    deductions.append({
        "code": "OPV",
        "name_ru": "ОПВ",
        "name_en": "Pension contributions",
        "name_kz": "МЗЖ",
        "rate": "10%",
        "base": salary,
        "amount": opv,
    })

    # ВОСМС работника — 2% от ЗП
    vosms_emp = round(salary * 0.02)
    deductions.append({
        "code": "VOSMS",
        "name_ru": "ВОСМС",
        "name_en": "Medical insurance (employee)",
        "name_kz": "МӘМС жарна",
        "rate": "2%",
        "base": salary,
        "amount": vosms_emp,
    })

    # ИПН — 10% от (ЗП - ОПВ - ВОСМС - 14МРП)
    # ст. 353 НК РК — стандартный вычет 14 МРП
    ipn_base = salary - opv - vosms_emp - (14 * c.mrp)
    ipn_base = max(ipn_base, 0)
    ipn = round(ipn_base * 0.10)
    deductions.append({
        "code": "IPN",
        "name_ru": "ИПН",
        "name_en": "Individual income tax",
        "name_kz": "ЖТС",
        "rate": "10%",
        "base": ipn_base,
        "amount": ipn,
        "article": "ст. 353 НК РК",
    })

    # === Расходы работодателя (employer costs) ===

    # ОППВ — 1.5% от ЗП (обязательные профессиональные пенсионные взносы)
    oppv = round(min(salary, 50 * c.mzp) * 0.015)
    employer_costs.append({
        "code": "OPPV",
        "name_ru": "ОППВ",
        "name_en": "Professional pension contributions",
        "name_kz": "КМПЖ",
        "rate": "1.5%",
        "base": salary,
        "amount": oppv,
    })

    # СО — 3.5% от (ЗП - ОПВ), min 1 МЗП, max 7 МЗП
    so_base_raw = salary - opv
    so_base = max(c.mzp, min(so_base_raw, 7 * c.mzp))
    so = round(so_base * 0.035)
    employer_costs.append({
        "code": "SO",
        "name_ru": "СО",
        "name_en": "Social contributions",
        "name_kz": "ӘА",
        "rate": "3.5%",
        "base": so_base,
        "amount": so,
    })

    # ОСМС — 3% от ЗП (обязательное социальное мед. страхование — за счёт работодателя)
    osms = round(salary * 0.03)
    employer_costs.append({
        "code": "OSMS",
        "name_ru": "ОСМС",
        "name_en": "Medical insurance (employer)",
        "name_kz": "МӘМС",
        "rate": "3%",
        "base": salary,
        "amount": osms,
    })

    # Социальный налог — 9.5% от (ЗП - ОПВ) минус СО, min 0
    # ст. 485 НК РК
    soc_tax_base = salary - opv
    soc_tax_raw = round(soc_tax_base * 0.095)
    soc_tax = max(soc_tax_raw - so, 0)
    employer_costs.append({
        "code": "SOC_TAX",
        "name_ru": "Соц. налог",
        "name_en": "Social tax",
        "name_kz": "Әлеуметтік салық",
        "rate": "9.5% − СО",
        "base": soc_tax_base,
        "amount": soc_tax,
        "article": "ст. 485 НК РК",
    })

    total_deductions = sum(d["amount"] for d in deductions)
    total_employer = sum(e["amount"] for e in employer_costs)
    net_salary = salary - total_deductions

    return {
        "salary": salary,
        "deductions": deductions,
        "employer_costs": employer_costs,
        "total_deductions": total_deductions,
        "total_employer_cost": total_employer,
        "net_salary": net_salary,
    }
