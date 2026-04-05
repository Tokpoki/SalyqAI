import { apiFetch } from "./client";

export interface RegimeBreakdown {
  regime: string;
  regime_name_ru: string;
  regime_name_kz: string;
  regime_name_en: string;
  annual_tax: number;
  annual_contributions: number;
  annual_total: number;
  monthly_total: number;
  tax_rate: string;
  eligible: boolean;
  details: Record<string, unknown>;
  article: string;
}

export interface Risk {
  type: string;
  severity: "high" | "medium" | "low";
  message_ru: string;
  message_kz: string;
  message_en: string;
}

export interface Deadline {
  title_ru: string;
  title_kz: string;
  title_en: string;
  date: string;
  form: string | null;
}

export interface Recommendation {
  title_ru: string;
  title_kz: string;
  title_en: string;
  description_ru: string;
  description_kz: string;
  description_en: string;
  impact_kzt: number;
}

export interface OptimizationResult {
  profile_complete: boolean;
  missing_fields?: string[];
  regimes: RegimeBreakdown[];
  best_regime: string | null;
  current_regime: string;
  potential_annual_savings: number;
  risks: Risk[];
  deadlines: Deadline[];
  recommendations: Recommendation[];
  constants?: { mrp: number; mzp: number; year: number };
}

export function getOptimization() {
  return apiFetch<OptimizationResult>("/api/v1/optimizer/analyze");
}
