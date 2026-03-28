import { apiFetch } from './client';

export function listSessions(config = {}) {
  return apiFetch('/api/v1/chat/sessions', {}, { auth: config.auth ?? true });
}

export function createSession(payload, config = {}) {
  const hasPayload = payload && Object.keys(payload).length > 0;

  return apiFetch('/api/v1/chat/sessions', {
    method: 'POST',
    ...(hasPayload ? { body: JSON.stringify(payload) } : {}),
  }, { auth: config.auth ?? true });
}

export function getSession(sessionId, config = {}) {
  return apiFetch(`/api/v1/chat/sessions/${sessionId}`, {}, { auth: config.auth ?? true });
}

export function sendMessage(sessionId, text, config = {}) {
  return apiFetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  }, { auth: config.auth ?? true });
}
