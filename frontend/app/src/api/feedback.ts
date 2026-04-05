import { apiFetch } from "./client";

export function sendFeedback(
  sessionId: string,
  messageId: string,
  rating: "up" | "down",
  reason?: string,
) {
  return apiFetch<{ id: string; rating: string }>("/api/v1/feedback", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      message_id: messageId,
      rating,
      reason,
    }),
  });
}
