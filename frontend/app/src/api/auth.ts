import { apiFetch } from "./client";
import { setTokens } from "@/lib/auth";

interface AuthResponse {
  user_id: string;
  email: string;
  name: string;
  access_token: string;
  refresh_token: string;
}

interface UserInfo {
  user_id: string;
  email: string;
  name: string;
  profile: Profile | null;
}

export interface Profile {
  user_id: string;
  taxpayer_type: string | null;
  tax_regime: string | null;
  annual_income_kzt: number | null;
  employees_count: number | null;
  activity_type: string | null;
  has_foreign_income: boolean | null;
  has_rental_income: boolean | null;
  residency_status: string | null;
  oked_code: string | null;
  oked_name: string | null;
  oked_banned: boolean | null;
  language: string | null;
  updated_at: string;
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  profile?: Record<string, unknown>;
}) {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getMe() {
  return apiFetch<UserInfo>("/api/v1/auth/me");
}
