import { apiFetch } from "./client";

export interface SessionSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface SessionDetail {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  messages: Message[];
  created_at: string;
}

export interface Obligation {
  code: string;
  title: string;
  due_date_rule: string;
  amount_kzt: number | null;
  basis: string;
}

export interface Citation {
  article_number: string;
  article_title: string;
  snippet: string;
}

export interface ChatMessageResponse {
  message_id: string;
  answer_text: string;
  action_plan: string[];
  obligations: Obligation[];
  clarifying_questions: string[];
  citations: Citation[];
  confidence: number;
  disclaimer: string;
}

export function listSessions() {
  return apiFetch<{ sessions: SessionSummary[] }>("/api/v1/chat/sessions");
}

export function createSession() {
  return apiFetch<SessionDetail>("/api/v1/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ channel: "web", locale: "ru-KZ" }),
  });
}

export function getSession(sessionId: string) {
  return apiFetch<SessionDetail>(`/api/v1/chat/sessions/${sessionId}`);
}

export function sendMessage(sessionId: string, text: string) {
  return apiFetch<ChatMessageResponse>(
    `/api/v1/chat/sessions/${sessionId}/messages`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
}
