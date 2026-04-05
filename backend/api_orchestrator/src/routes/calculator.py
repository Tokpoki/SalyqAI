"""Calculator routes - pure math, no LLM."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user
from src.calculator.constants import get_constants
from src.calculator.ip_calc import (
    calc_employee,
    calc_ip_self,
    calc_salary_with_profile,
    calc_semiannual_simplified,
)

router = APIRouter(prefix="/api/v1/calculator", tags=["Calculator"])


class EmployeeInput(BaseModel):
    name: str | None = None
    salary: float = Field(gt=0)


class IPMonthlyRequest(BaseModel):
    declared_income: float = Field(gt=0)
    tax_regime: Literal["simplified", "general"] = "simplified"
    semiannual_income: float | None = Field(default=None, ge=0)
    employees: list[EmployeeInput] = []
    year: int = 2026


class SalaryMonthlyRequest(BaseModel):
    gross_salary: float = Field(gt=0)
    year: int = 2026

    ipn_rate_percent: Literal[10, 15] = 10
    residency: Literal[
        "resident",
        "non_resident_eaeu",
        "non_resident_with_vnz",
        "non_resident_without_vnz",
        "stateless",
    ] = "resident"
    disability: Literal["none", "group_1_2", "group_3"] = "none"
    pension_status: Literal["not_pensioner", "age_pensioner", "service_pensioner"] = "not_pensioner"
    category: Literal["other", "student", "astana_hub_participant", "many_children_mother"] = "other"
    family_deduction: Literal["none", "parent_23_5", "each_parent_11_75"] = "none"
    use_standard_deduction: bool = True
    is_ip_owner: bool = False
    is_gph_contract: bool = False


@router.post("/ip-monthly")
def calculate_ip_monthly(
    body: IPMonthlyRequest,
    _user: dict = Depends(get_current_user),
):
    c = get_constants(body.year)

    self_items = calc_ip_self(body.declared_income, c)
    self_total = sum(item["amount"] for item in self_items)

    semi = None
    if body.tax_regime == "simplified" and body.semiannual_income is not None:
        semi = calc_semiannual_simplified(body.semiannual_income)

    emp_results = []
    for emp in body.employees:
        result = calc_employee(emp.salary, c)
        result["name"] = emp.name
        emp_results.append(result)

    employees_total = sum(
        e["total_deductions"] + e["total_employer_cost"] for e in emp_results
    )

    return {
        "year": c.year,
        "mzp": c.mzp,
        "mrp": c.mrp,
        "self_contributions": self_items,
        "self_total": self_total,
        "semiannual_tax": semi,
        "employees": emp_results,
        "employees_total_monthly": employees_total,
        "grand_total_monthly": self_total + employees_total,
    }


@router.post("/salary-monthly")
def calculate_salary_monthly(
    body: SalaryMonthlyRequest,
    _user: dict = Depends(get_current_user),
):
    c = get_constants(body.year)

    profile = {
        "ipn_rate": 0.10 if body.ipn_rate_percent == 10 else 0.15,
        "residency": body.residency,
        "disability": body.disability,
        "pension_status": body.pension_status,
        "category": body.category,
        "family_deduction": body.family_deduction,
        "use_standard_deduction": body.use_standard_deduction,
        "is_ip_owner": body.is_ip_owner,
        "is_gph_contract": body.is_gph_contract,
    }

    employee = calc_salary_with_profile(body.gross_salary, c, profile)

    return {
        "year": c.year,
        "mzp": c.mzp,
        "mrp": c.mrp,
        "gross_salary": body.gross_salary,
        "deductions": employee["deductions"],
        "employer_costs": employee["employer_costs"],
        "total_deductions": employee["total_deductions"],
        "total_employer_cost": employee["total_employer_cost"],
        "net_salary": employee["net_salary"],
        "payroll_cost": body.gross_salary + employee["total_employer_cost"],
        "ipn_deduction_total": employee["ipn_deduction_total"],
        "profile": employee["profile"],
    }
