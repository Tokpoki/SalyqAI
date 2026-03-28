import { useNavigate, useParams } from "react-router-dom";
import { Plus, Settings, MessageSquare, Moon, Sun, Trash2, Scale } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/api/chat";

interface SidebarProps {
  sessions: SessionSummary[];
  onNewChat: () => void;
  onDeleteChat?: (sessionId: string) => void;
  isCreating: boolean;
  userEmail?: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
    }
  }, []);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {dark ? "Светлая тема" : "Тёмная тема"}
    </button>
  );
}

export default function Sidebar({ sessions, onNewChat, onDeleteChat, isCreating, userEmail }: SidebarProps) {
  const navigate = useNavigate();
  const { chatId } = useParams();

  const grouped: Record<string, SessionSummary[]> = {};
  for (const s of sessions) {
    const label = formatDate(s.created_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(s);
  }

  return (
    <div className="flex h-full w-[280px] flex-col bg-card/50 backdrop-blur-sm border-r border-border/50">
      {/* Header */}
      <div className="p-4">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
            <Scale size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">Salyq AI</span>
        </div>

        <button
          onClick={onNewChat}
          disabled={isCreating}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl gradient-bg px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]",
            isCreating && "opacity-50 cursor-not-allowed",
          )}
        >
          <Plus size={16} />
          Новый чат
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3">
        <AnimatePresence>
          {Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {label}
              </p>
              {items.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "group flex w-full items-center rounded-xl text-left text-sm transition-all",
                    chatId === s.id
                      ? "bg-primary/10 text-foreground font-medium"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <button
                    onClick={() => navigate(`/chat/${s.id}`)}
                    className="flex flex-1 items-center gap-2.5 px-3 py-2.5 min-w-0"
                  >
                    <MessageSquare size={14} className={cn(
                      "shrink-0",
                      chatId === s.id ? "text-primary" : "text-muted-foreground/50"
                    )} />
                    <span className="truncate text-[13px]">
                      {s.title || "Новый чат"}
                    </span>
                  </button>
                  {onDeleteChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(s.id);
                      }}
                      className="shrink-0 p-1.5 mr-2 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="border-t border-border/50 p-3 space-y-1">
        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          <Settings size={16} />
          Настройки
        </button>
        <ThemeToggle />
        {userEmail && (
          <p className="truncate px-3 pt-1 text-[11px] text-muted-foreground/50">{userEmail}</p>
        )}
      </div>
    </div>
  );
}
