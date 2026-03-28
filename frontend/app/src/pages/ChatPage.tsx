import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Scale, Loader2, Sparkles, Plus, MessageSquare } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import {
  listSessions as _listSessions,
  createSession as _createSession,
  getSession as _getSession,
  sendMessage as _sendMessage,
  deleteSession as _deleteSession,
  type SessionSummary,
  type Obligation,
  type Citation,
} from "@/api/chat";
import { getMe as _getMe } from "@/api/auth";
import { DEV_BYPASS, mockApi } from "@/lib/dev";

const api = {
  getMe: DEV_BYPASS ? mockApi.getMe : _getMe,
  listSessions: DEV_BYPASS ? mockApi.listSessions : _listSessions,
  createSession: DEV_BYPASS ? mockApi.createSession : _createSession,
  getSession: DEV_BYPASS ? mockApi.getSession : _getSession,
  sendMessage: DEV_BYPASS ? mockApi.sendMessage : _sendMessage,
  deleteSession: _deleteSession,
};

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  obligations?: Obligation[];
  citations?: Citation[];
  actionPlan?: string[];
  clarifyingQuestions?: string[];
  confidence?: number;
  disclaimer?: string;
}

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    async function init() {
      try {
        const [me, sessionsData] = await Promise.all([api.getMe(), api.listSessions()]);
        setUserEmail(me.email);
        setSessions(sessionsData.sessions);
      } catch {
        // Auth failed
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setIsSending(false);
      return;
    }

    let cancelled = false;
    setMessages([]);
    setIsSending(false);

    async function loadChat() {
      try {
        const session = await api.getSession(chatId!);
        if (cancelled) return;
        setMessages(
          session.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            obligations: m.obligations,
            citations: m.citations,
            actionPlan: m.action_plan,
            clarifyingQuestions: m.clarifying_questions,
            confidence: m.confidence ?? undefined,
            disclaimer: m.disclaimer ?? undefined,
          })),
        );
      } catch {
        if (!cancelled) setMessages([]);
      }
    }
    loadChat();

    return () => { cancelled = true; };
  }, [chatId]);

  const refreshSessions = useCallback(async () => {
    try {
      const data = await api.listSessions();
      setSessions(data.sessions);
    } catch {
      // silent
    }
  }, []);

  async function handleNewChat() {
    setIsCreating(true);
    try {
      const session = await api.createSession();
      await refreshSessions();
      navigate(`/chat/${session.id}`);
    } catch {
      // silent
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteChat(sessionId: string) {
    try {
      await api.deleteSession(sessionId);
      await refreshSessions();
      if (chatId === sessionId) {
        navigate("/chat");
      }
    } catch {
      // silent
    }
  }

  async function handleSend(text: string) {
    if (!chatId || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const userMsg: UIMessage = { id: tempId, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await api.sendMessage(chatId, text);
      const assistantMsg: UIMessage = {
        id: res.message_id,
        role: "assistant",
        content: res.answer_text,
        obligations: res.obligations,
        citations: res.citations,
        actionPlan: res.action_plan,
        clarifyingQuestions: res.clarifying_questions,
        confidence: res.confidence,
        disclaimer: res.disclaimer,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      refreshSessions();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Произошла ошибка. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-emerald-500/20">
            <Scale size={20} className="text-white animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          sessions={sessions}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isCreating={isCreating}
          userEmail={userEmail}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebar(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              <Sidebar
                sessions={sessions}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
                isCreating={isCreating}
                userEmail={userEmail}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3">
          <button
            onClick={() => setMobileSidebar(true)}
            className="md:hidden rounded-xl p-2 hover:bg-accent transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg gradient-bg">
              <Scale size={12} className="text-white" />
            </div>
            <h1 className="text-sm font-semibold">Salyq AI</h1>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!chatId ? (
            <EmptyState onNewChat={handleNewChat} />
          ) : messages.length === 0 ? (
            <EmptyChat />
          ) : (
            <div className="mx-auto max-w-3xl py-4">
              {messages.map((m) => (
                <ChatMessage key={m.id} {...m} />
              ))}
              {isSending && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Input */}
        {chatId && (
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput onSend={handleSend} disabled={isSending} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  const suggestions = [
    "Какие налоги платит ИП на упрощёнке?",
    "Сроки сдачи декларации по ИПН?",
    "Как рассчитать НДС для ТОО?",
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      {/* Decorative bg */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg shadow-xl shadow-emerald-500/20">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">
          Добро пожаловать в <span className="gradient-text">Salyq AI</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Выберите чат из списка или создайте новый, чтобы задать вопрос о налогах
        </p>

        <button
          onClick={onNewChat}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-bg px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} />
          Новый чат
        </button>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {suggestions.map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3.5 py-2 text-xs text-muted-foreground"
            >
              <MessageSquare size={12} />
              {s}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[200px] w-[200px] rounded-full bg-teal-500/5 blur-[80px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare size={20} className="text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Задайте вопрос о налогах в Казахстане
        </p>
      </motion.div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary border border-border/50">
        <Sparkles size={14} className="text-primary" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-card border border-border/50 px-5 py-3.5 shadow-sm">
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          className="h-2 w-2 rounded-full bg-primary/50"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          className="h-2 w-2 rounded-full bg-primary/50"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          className="h-2 w-2 rounded-full bg-primary/50"
        />
      </div>
    </div>
  );
}
