import { apiFetch } from "./client";
import type { Profile } from "./auth";

export type { Profile };

export function getProfile() {
  return apiFetch<Profile>("/api/v1/user/profile");
}

export function updateProfile(fields: Partial<Omit<Profile, "user_id" | "updated_at">>) {
  return apiFetch<Profile>("/api/v1/user/profile", {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}
