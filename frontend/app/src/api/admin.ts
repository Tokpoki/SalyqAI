import { apiFetch } from "./client";

export interface AdminStats {
  total_users: number;
  total_sessions: number;
  total_messages: number;
  total_user_messages: number;
  active_today_users: number;
  registered_today: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  session_count: number;
  message_count: number;
  user_message_count: number;
  last_active: string | null;
}

export interface AdminConversation {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  message_count: number;
  first_question: string | null;
  first_answer: string | null;
}

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  confidence: number | null;
  advice_json: unknown;
}

export interface AdminConversationDetail {
  id: string;
  user_id: string;
  title: string | null;
  user_name: string;
  user_email: string;
  messages: ConversationMessage[];
}

export interface ActivityEvent {
  event_type: "registration" | "message";
  user_id: string;
  email: string;
  name: string;
  content: string | null;
  session_id: string | null;
  created_at: string;
}

export function checkAdmin() {
  return apiFetch<{ is_admin: boolean }>("/api/v1/admin/check");
}

export function getAdminStats() {
  return apiFetch<AdminStats>("/api/v1/admin/stats");
}

export function getAdminUsers(limit = 100, offset = 0) {
  return apiFetch<{ users: AdminUser[] }>(`/api/v1/admin/users?limit=${limit}&offset=${offset}`);
}

export function getAdminConversations(limit = 50, offset = 0) {
  return apiFetch<{ conversations: AdminConversation[] }>(
    `/api/v1/admin/conversations?limit=${limit}&offset=${offset}`,
  );
}

export function getAdminConversation(sessionId: string) {
  return apiFetch<AdminConversationDetail>(`/api/v1/admin/conversations/${sessionId}`);
}

export function getAdminActivity(limit = 50) {
  return apiFetch<{ events: ActivityEvent[] }>(`/api/v1/admin/activity?limit=${limit}`);
}
