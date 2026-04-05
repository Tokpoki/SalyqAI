"""Pure calculation functions for IP and salary taxes in Kazakhstan."""

from __future__ import annotations

from typing import Literal, TypedDict

from .constants import TaxConstants


class SalaryCalcProfile(TypedDict):
    ipn_rate: Literal[0.10, 0.15]
    residency: Literal[
        "resident",
        "non_resident_eaeu",
        "non_resident_with_vnz",
        "non_resident_without_vnz",
        "stateless",
    ]
    disability: Literal["none", "group_1_2", "group_3"]
    pension_status: Literal["not_pensioner", "age_pensioner", "service_pensioner"]
    category: Literal["other", "student", "astana_hub_participant", "many_children_mother"]
    family_deduction: Literal["none", "parent_23_5", "each_parent_11_75"]
    use_standard_deduction: bool
    is_ip_owner: bool
    is_gph_contract: bool


DEFAULT_SALARY_PROFILE: SalaryCalcProfile = {
    "ipn_rate": 0.10,
    "residency": "resident",
    "disability": "none",
    "pension_status": "not_pensioner",
    "category": "other",
    "family_deduction": "none",
    "use_standard_deduction": True,
    "is_ip_owner": False,
    "is_gph_contract": False,
}


def _pct(rate: float) -> str:
    pct = rate * 100
    if float(pct).is_integer():
        return f"{int(pct)}%"
    return f"{pct:.1f}%"


def calc_ip_self(declared_income: float, c: TaxConstants) -> list[dict]:
    """Calculate monthly contributions for IP owner."""
    items: list[dict] = []

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


def calc_semiannual_simplified(semiannual_income: float) -> dict:
    """Calculate semi-annual tax for simplified regime (ст. 687-688 НК РК)."""
    total = round(semiannual_income * 0.03)
    ipn = round(semiannual_income * 0.015)
    social_tax = total - ipn
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


def _monthly_deduction_amount(profile: SalaryCalcProfile, c: TaxConstants) -> float:
    """Calculate total IIT deduction amount used in salary formula."""
    if profile["residency"] in {"non_resident_without_vnz", "stateless"}:
        return 0.0

    deduction = 0.0

    if profile["use_standard_deduction"]:
        deduction += (14 if profile["is_gph_contract"] else 30) * c.mrp

    if profile["disability"] == "group_1_2":
        deduction += c.mrp * (882 / 12)
    elif profile["disability"] == "group_3":
        deduction += c.mrp * 12

    if profile["category"] == "many_children_mother":
        deduction += c.mrp * (882 / 12)

    if profile["family_deduction"] == "parent_23_5":
        deduction += c.mrp * 23.5
    elif profile["family_deduction"] == "each_parent_11_75":
        deduction += c.mrp * 11.75

    return round(deduction)


def calc_salary_with_profile(
    salary: float,
    c: TaxConstants,
    profile: SalaryCalcProfile | None = None,
) -> dict:
    """Calculate salary taxes with advanced profile controls."""
    p = profile or DEFAULT_SALARY_PROFILE
    deductions: list[dict] = []
    employer_costs: list[dict] = []

    is_full_social_resident = p["residency"] in {
        "resident",
        "non_resident_eaeu",
        "non_resident_with_vnz",
    }
    is_no_vnz_or_stateless = p["residency"] in {"non_resident_without_vnz", "stateless"}
    is_resident = p["residency"] == "resident"
    is_pensioner = p["pension_status"] in {"age_pensioner", "service_pensioner"}
    is_astana_hub = p["category"] == "astana_hub_participant"
    is_gph = p["is_gph_contract"]

    opv_rate = 0.0 if (is_pensioner or is_no_vnz_or_stateless) else 0.10
    opv = round(min(salary, 50 * c.mzp) * opv_rate)
    deductions.append({
        "code": "OPV",
        "name_ru": "ОПВ",
        "name_en": "Pension contributions",
        "name_kz": "МЗЖ",
        "rate": _pct(opv_rate),
        "base": salary,
        "amount": opv,
    })

    vosms_emp_rate = 0.02 if (is_full_social_resident and not is_gph and not is_pensioner) else 0.0
    vosms_emp = round(salary * vosms_emp_rate)
    deductions.append({
        "code": "VOSMS",
        "name_ru": "ВОСМС",
        "name_en": "Medical insurance (employee)",
        "name_kz": "МӘМС жарна",
        "rate": _pct(vosms_emp_rate),
        "base": salary,
        "amount": vosms_emp,
    })

    ipn_deduction_total = _monthly_deduction_amount(p, c)
    ipn_base = max(salary - opv - vosms_emp - ipn_deduction_total, 0)
    ipn_rate_effective = 0.0 if (is_astana_hub and is_resident) else p["ipn_rate"]
    ipn = round(ipn_base * ipn_rate_effective)
    deductions.append({
        "code": "IPN",
        "name_ru": "ИПН",
        "name_en": "Individual income tax",
        "name_kz": "ЖТС",
        "rate": _pct(ipn_rate_effective),
        "base": ipn_base,
        "amount": ipn,
        "article": "ст. 353 НК РК",
    })

    oppv_rate = 0.0 if (is_pensioner or is_gph or p["is_ip_owner"] or is_no_vnz_or_stateless) else 0.015
    oppv = round(min(salary, 50 * c.mzp) * oppv_rate)
    employer_costs.append({
        "code": "OPPV",
        "name_ru": "ОППВ",
        "name_en": "Professional pension contributions",
        "name_kz": "КМПЖ",
        "rate": _pct(oppv_rate),
        "base": salary,
        "amount": oppv,
    })

    so_base_raw = salary - opv
    if is_full_social_resident and not is_gph and not is_pensioner:
        so_base = max(c.mzp, min(so_base_raw, 7 * c.mzp))
        so = round(so_base * 0.035)
        so_rate = "3.5%"
    else:
        so_base = so_base_raw
        so = 0
        so_rate = "0%"

    employer_costs.append({
        "code": "SO",
        "name_ru": "СО",
        "name_en": "Social contributions",
        "name_kz": "ӘА",
        "rate": so_rate,
        "base": so_base,
        "amount": so,
    })

    osms_rate = 0.03 if (is_full_social_resident and not is_gph and not is_pensioner) else 0.0
    osms = round(salary * osms_rate)
    employer_costs.append({
        "code": "OSMS",
        "name_ru": "ОСМС",
        "name_en": "Medical insurance (employer)",
        "name_kz": "МӘМС",
        "rate": _pct(osms_rate),
        "base": salary,
        "amount": osms,
    })

    soc_tax_base = salary - opv
    if is_full_social_resident and not is_gph and not p["is_ip_owner"]:
        soc_tax_raw = round(soc_tax_base * 0.095)
        soc_tax = max(soc_tax_raw - so, 0)
        soc_tax_rate = "9.5% - СО"
    else:
        soc_tax = 0
        soc_tax_rate = "0%"
    if is_astana_hub and not is_resident:
        soc_tax = 0
        soc_tax_rate = "0% (Astana Hub)"

    employer_costs.append({
        "code": "SOC_TAX",
        "name_ru": "Соц. налог",
        "name_en": "Social tax",
        "name_kz": "Әлеуметтік салық",
        "rate": soc_tax_rate,
        "base": soc_tax_base,
        "amount": soc_tax,
        "article": "ст. 485 НК РК",
    })

    total_deductions = sum(d["amount"] for d in deductions)
    total_employer = sum(e["amount"] for e in employer_costs)

    return {
        "salary": salary,
        "deductions": deductions,
        "employer_costs": employer_costs,
        "total_deductions": total_deductions,
        "total_employer_cost": total_employer,
        "net_salary": salary - total_deductions,
        "ipn_deduction_total": ipn_deduction_total,
        "profile": p,
    }


def calc_employee(salary: float, c: TaxConstants) -> dict:
    """Backward-compatible employee calculation for existing IP calculator."""
    return calc_salary_with_profile(salary, c, DEFAULT_SALARY_PROFILE)
