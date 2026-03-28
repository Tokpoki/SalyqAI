const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function createSession() {
  return request('/api/v1/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({
      channel: 'web',
      locale: 'ru-KZ',
    }),
  });
}

export function sendMessage(sessionId, text) {
  return request(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function getSession(sessionId) {
  return request(`/api/v1/chat/sessions/${sessionId}`);
}
