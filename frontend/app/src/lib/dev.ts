/**
 * Dev mode utilities — mock data when backend is unavailable.
 * Active only when VITE_DEV_BYPASS=true in .env
 */

import type { SessionSummary, SessionDetail, ChatMessageResponse } from "@/api/chat";

export const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === "true";

const MOCK_USER = {
  user_id: "dev-user-1",
  email: "test@mail.com",
  name: "Тестовый пользователь",
  profile: {
    user_id: "dev-user-1",
    taxpayer_type: "sole_proprietor",
    tax_regime: "упрощённая декларация",
    annual_income_kzt: 12400000,
    employees_count: null,
    activity_type: "Разработка ПО",
    has_foreign_income: false,
    has_rental_income: false,
    residency_status: "resident",
    updated_at: new Date().toISOString(),
  },
};

const MOCK_SESSIONS: SessionSummary[] = [
  {
    id: "dev-session-1",
    title: "ИП налоги упрощёнка",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dev-session-2",
    title: "Арендный доход",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

let devMessages: Record<string, SessionDetail["messages"]> = {
  "dev-session-1": [
    {
      id: "m1",
      role: "user",
      content: "Какие налоги платит ИП на упрощёнке?",
      created_at: new Date().toISOString(),
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "ИП на упрощённой декларации (форма 910.00) уплачивает:\n\n1. **3% от дохода** — единый налог (ИПН + социальный налог)\n2. **ОПВ** — 10% от заявленного дохода\n3. **СО** — 3.5% от заявленного дохода\n\nДекларация подаётся раз в полугодие, до 15 августа за 1-е полугодие и до 15 февраля за 2-е.",
      created_at: new Date().toISOString(),
    },
  ],
  "dev-session-2": [],
};

let sessionCounter = 3;

export const mockApi = {
  getMe: async () => MOCK_USER,

  listSessions: async () => ({ sessions: MOCK_SESSIONS }),

  createSession: async (): Promise<SessionDetail> => {
    const id = `dev-session-${sessionCounter++}`;
    const s: SessionSummary = {
      id,
      title: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_SESSIONS.unshift(s);
    devMessages[id] = [];
    return { ...s, user_id: MOCK_USER.user_id, status: "active", messages: [] };
  },

  getSession: async (id: string): Promise<SessionDetail> => ({
    id,
    user_id: MOCK_USER.user_id,
    title: MOCK_SESSIONS.find((s) => s.id === id)?.title || "Новый чат",
    status: "active",
    messages: devMessages[id] || [],
    created_at: new Date().toISOString(),
  }),

  sendMessage: async (sessionId: string, text: string): Promise<ChatMessageResponse> => {
    const userMsg = {
      id: `m-${Date.now()}`,
      role: "user" as const,
      content: text,
      created_at: new Date().toISOString(),
    };
    if (!devMessages[sessionId]) devMessages[sessionId] = [];
    devMessages[sessionId].push(userMsg);

    // Update session title from first message
    const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
    if (session && !session.title) {
      session.title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
    }

    await new Promise((r) => setTimeout(r, 800)); // simulate latency

    const assistantMsg = {
      id: `m-${Date.now() + 1}`,
      role: "assistant" as const,
      content: `Это dev-режим без бэкенда. Ваш вопрос: "${text}"\n\nВ реальном режиме здесь будет ответ от Salyq AI с цитатами из НК РК.`,
      created_at: new Date().toISOString(),
    };
    devMessages[sessionId].push(assistantMsg);

    return {
      message_id: assistantMsg.id,
      answer_text: assistantMsg.content,
      action_plan: ["Проверить статус ИП", "Подать декларацию 910.00"],
      obligations: [
        {
          code: "FORM_910_00",
          title: "Декларация 910.00",
          due_date_rule: "До 15 августа за 1-е полугодие",
          amount_kzt: 186000,
          basis: "ст. 686 НК РК",
        },
      ],
      clarifying_questions: ["Укажите точный доход за полугодие"],
      citations: [
        {
          article_number: "686",
          article_title: "Упрощённая декларация для ИП",
          snippet: "Исчисление налогов по упрощённой декларации производится...",
        },
      ],
      confidence: 0.87,
      disclaimer: "Это примерный ответ. Проконсультируйтесь с налоговым специалистом.",
    };
  },

  getProfile: async () => MOCK_USER.profile,

  updateProfile: async (fields: Record<string, unknown>) => ({
    ...MOCK_USER.profile,
    ...fields,
    updated_at: new Date().toISOString(),
  }),
};
