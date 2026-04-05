import { apiFetch, getApiBase } from "./client";
import { getAccessToken } from "@/lib/auth";

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
  action_plan?: string[];
  obligations?: Obligation[];
  clarifying_questions?: string[];
  citations?: Citation[];
  confidence?: number | null;
  disclaimer?: string | null;
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
  kbk: string | null;
  knp: string | null;
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

export function deleteSession(sessionId: string) {
  return apiFetch<{ ok: boolean }>(
    `/api/v1/chat/sessions/${sessionId}`,
    { method: "DELETE" },
  );
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (data: ChatMessageResponse) => void;
  onError: (error: Error) => void;
}

export async function sendMessageStream(
  sessionId: string,
  text: string,
  callbacks: StreamCallbacks,
) {
  const token = getAccessToken();
  const API = getApiBase();

  try {
    const res = await fetch(
      `${API}/api/v1/chat/sessions/${sessionId}/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!res.ok) {
      throw new Error(`Stream error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No stream reader");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === "token") {
            callbacks.onToken(event.content);
          } else if (event.type === "done") {
            callbacks.onDone(event as ChatMessageResponse);
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
