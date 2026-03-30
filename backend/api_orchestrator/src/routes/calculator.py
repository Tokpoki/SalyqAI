"""Calculator routes — pure math, no LLM."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user
from src.calculator.constants import get_constants
from src.calculator.ip_calc import calc_ip_self, calc_semiannual_simplified, calc_employee

router = APIRouter(prefix="/api/v1/calculator", tags=["Calculator"])


# ─── Request / Response models ───────────────────────────────────────────

class EmployeeInput(BaseModel):
    name: str | None = None
    salary: float = Field(gt=0)


class IPMonthlyRequest(BaseModel):
    declared_income: float = Field(gt=0)
    tax_regime: Literal["simplified", "general"] = "simplified"
    semiannual_income: float | None = Field(default=None, ge=0)
    employees: list[EmployeeInput] = []
    year: int = 2026


# ─── Endpoint ────────────────────────────────────────────────────────────

@router.post("/ip-monthly")
def calculate_ip_monthly(
    body: IPMonthlyRequest,
    _user: dict = Depends(get_current_user),
):
    c = get_constants(body.year)

    # IP owner contributions
    self_items = calc_ip_self(body.declared_income, c)
    self_total = sum(item["amount"] for item in self_items)

    # Semi-annual (simplified only)
    semi = None
    if body.tax_regime == "simplified" and body.semiannual_income is not None:
        semi = calc_semiannual_simplified(body.semiannual_income)

    # Employees
    emp_results = []
    for emp in body.employees:
        result = calc_employee(emp.salary, c)
        result["name"] = emp.name
        emp_results.append(result)

    employees_total = sum(
        e["total_deductions"] + e["total_employer_cost"]
        for e in emp_results
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
