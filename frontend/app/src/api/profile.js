import { apiFetch } from './client';

export function getProfile(config = {}) {
  return apiFetch('/api/v1/user/profile', {}, { auth: config.auth ?? true });
}

export function updateProfile(fields, config = {}) {
  return apiFetch('/api/v1/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  }, { auth: config.auth ?? true });
}
