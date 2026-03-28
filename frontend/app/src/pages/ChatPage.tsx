import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Scale, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { cn } from "@/lib/utils";
import {
  listSessions as _listSessions,
  createSession as _createSession,
  getSession as _getSession,
  sendMessage as _sendMessage,
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

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load user info + sessions on mount
  useEffect(() => {
    async function init() {
      try {
        const [me, sessionsData] = await Promise.all([api.getMe(), api.listSessions()]);
        setUserEmail(me.email);
        setSessions(sessionsData.sessions);
      } catch {
        // Auth failed - ProtectedRoute should handle redirect
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Load messages when chatId changes
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    async function loadChat() {
      try {
        const session = await api.getSession(chatId!);
        setMessages(
          session.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        );
      } catch {
        setMessages([]);
      }
    }
    loadChat();
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

  async function handleSend(text: string) {
    if (!chatId || isSending) return;

    // Optimistic user message
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
      refreshSessions(); // Update sidebar titles
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          sessions={sessions}
          onNewChat={handleNewChat}
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
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black md:hidden"
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
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <button
            onClick={() => setMobileSidebar(true)}
            className="md:hidden rounded-lg p-1.5 hover:bg-accent"
          >
            <Menu size={20} />
          </button>
          <Scale size={20} className="text-primary" />
          <h1 className="text-sm font-semibold">Salyq AI</h1>
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
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <Scale size={48} className="mb-4 text-muted-foreground/30" />
      <h2 className="text-lg font-medium text-muted-foreground">
        Salyq AI
      </h2>
      <p className="mt-1 text-sm text-muted-foreground/70">
        Выберите чат из списка или создайте новый
      </p>
      <button
        onClick={onNewChat}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Новый чат
      </button>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <Scale size={40} className="mb-3 text-muted-foreground/20" />
      <p className="text-sm text-muted-foreground">
        Задайте вопрос о налогах в Казахстане
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
        <Scale size={14} />
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-secondary/70 px-4 py-3 rounded-tl-sm">
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          className="h-2 w-2 rounded-full bg-muted-foreground"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          className="h-2 w-2 rounded-full bg-muted-foreground"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          className="h-2 w-2 rounded-full bg-muted-foreground"
        />
      </div>
    </div>
  );
}
