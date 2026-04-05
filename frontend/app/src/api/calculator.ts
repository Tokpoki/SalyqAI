import { apiFetch } from "./client";

export interface EmployeeInput {
  name?: string;
  salary: number;
}

export interface IPMonthlyRequest {
  declared_income: number;
  tax_regime: "simplified" | "general";
  semiannual_income?: number;
  employees: EmployeeInput[];
  year?: number;
}

export interface ContributionItem {
  code: string;
  name_ru: string;
  name_en: string;
  name_kz: string;
  rate: string;
  base: number;
  amount: number;
  article?: string;
}

export interface EmployeeResult {
  name?: string;
  salary: number;
  deductions: ContributionItem[];
  employer_costs: ContributionItem[];
  total_deductions: number;
  total_employer_cost: number;
  net_salary: number;
}

export interface SemiannualTax {
  semiannual_income: number;
  rate: string;
  total: number;
  ipn: number;
  ipn_rate: string;
  social_tax: number;
  social_tax_rate: string;
  article: string;
  monthly_equivalent: number;
}

export interface IPMonthlyResponse {
  year: number;
  mzp: number;
  mrp: number;
  self_contributions: ContributionItem[];
  self_total: number;
  semiannual_tax: SemiannualTax | null;
  employees: EmployeeResult[];
  employees_total_monthly: number;
  grand_total_monthly: number;
}

export function calculateIPMonthly(data: IPMonthlyRequest) {
  return apiFetch<IPMonthlyResponse>("/api/v1/calculator/ip-monthly", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface SalaryMonthlyRequest {
  gross_salary: number;
  year?: number;
  ipn_rate_percent?: 10 | 15;
  residency?:
    | "resident"
    | "non_resident_eaeu"
    | "non_resident_with_vnz"
    | "non_resident_without_vnz"
    | "stateless";
  disability?: "none" | "group_1_2" | "group_3";
  pension_status?: "not_pensioner" | "age_pensioner" | "service_pensioner";
  category?: "other" | "student" | "astana_hub_participant" | "many_children_mother";
  family_deduction?: "none" | "parent_23_5" | "each_parent_11_75";
  use_standard_deduction?: boolean;
  is_ip_owner?: boolean;
  is_gph_contract?: boolean;
}

export interface SalaryProfile {
  ipn_rate: number;
  residency:
    | "resident"
    | "non_resident_eaeu"
    | "non_resident_with_vnz"
    | "non_resident_without_vnz"
    | "stateless";
  disability: "none" | "group_1_2" | "group_3";
  pension_status: "not_pensioner" | "age_pensioner" | "service_pensioner";
  category: "other" | "student" | "astana_hub_participant" | "many_children_mother";
  family_deduction: "none" | "parent_23_5" | "each_parent_11_75";
  use_standard_deduction: boolean;
  is_ip_owner: boolean;
  is_gph_contract: boolean;
}

export interface SalaryMonthlyResponse {
  year: number;
  mzp: number;
  mrp: number;
  gross_salary: number;
  deductions: ContributionItem[];
  employer_costs: ContributionItem[];
  total_deductions: number;
  total_employer_cost: number;
  net_salary: number;
  payroll_cost: number;
  ipn_deduction_total: number;
  profile: SalaryProfile;
}

export function calculateSalaryMonthly(data: SalaryMonthlyRequest) {
  return apiFetch<SalaryMonthlyResponse>("/api/v1/calculator/salary-monthly", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
