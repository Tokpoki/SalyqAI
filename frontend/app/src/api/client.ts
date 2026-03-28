import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${API}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`API error ${status}`);
  }
}

interface FetchOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { auth = true, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API}${path}`, { ...init, headers });

  if (res.status === 401 && auth) {
    if (!refreshPromise) refreshPromise = refreshAccessToken();
    const ok = await refreshPromise;
    refreshPromise = null;

    if (ok) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${API}${path}`, { ...init, headers });
    } else {
      clearTokens();
      window.location.href = "/login";
      throw new ApiError(401, null);
    }
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(res.status, payload);
  }

  if (res.status === 204) return null as T;
  return res.json();
}
