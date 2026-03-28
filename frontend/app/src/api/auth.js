import { apiFetch } from './client';
import { setTokens } from '../lib/auth';

function storeTokens(payload) {
  if (!payload) {
    return payload;
  }

  setTokens({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  });

  return payload;
}

export async function register(payload) {
  return storeTokens(await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }));
}

export async function login(email, password) {
  return storeTokens(await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));
}

export async function refresh(refreshToken) {
  return storeTokens(await apiFetch('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }));
}

export function getMe() {
  return apiFetch('/api/v1/auth/me', {}, { auth: true });
}
