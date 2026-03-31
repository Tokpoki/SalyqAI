import { useNavigate, useParams } from "react-router-dom";
import { Plus, Settings, MessageSquare, Moon, Sun, Trash2, Scale, Search, X, Calculator, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/api/chat";
import { useTranslation } from "@/i18n";
import type { Lang } from "@/i18n";

interface SidebarProps {
  sessions: SessionSummary[];
  onNewChat: () => void;
  onDeleteChat?: (sessionId: string) => void;
  isCreating: boolean;
  userEmail?: string;
  isAdmin?: boolean;
}

function formatDate(dateStr: string, t: (key: string) => string, lang: Lang) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return t("sidebar.today");
  if (days === 1) return t("sidebar.yesterday");
  if (days < 7) return `${days} ${t("sidebar.daysAgo")}`;
  const locale = lang === "kz" ? "kk-KZ" : lang === "en" ? "en-US" : "ru-RU";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function ThemeToggle() {
  const { t } = useTranslation();
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
      {dark ? t("sidebar.lightTheme") : t("sidebar.darkTheme")}
    </button>
  );
}

export default function Sidebar({ sessions, onNewChat, onDeleteChat, isCreating, userEmail, isAdmin }: SidebarProps) {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [search, setSearch] = useState("");
  const { lang, setLang, t } = useTranslation();

  const filtered = search.trim()
    ? sessions.filter((s) =>
        (s.title || "").toLowerCase().includes(search.trim().toLowerCase()),
      )
    : sessions;

  const grouped: Record<string, SessionSummary[]> = {};
  for (const s of filtered) {
    const label = formatDate(s.created_at, t, lang);
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
          {t("sidebar.newChat")}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("sidebar.search")}
            className="w-full rounded-xl border border-border/50 bg-background/50 pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
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
                      {s.title || t("sidebar.defaultTitle")}
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
          onClick={() => navigate("/calculator/ip")}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          <Calculator size={16} />
          {t("sidebar.calculator")}
        </button>
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            <ShieldCheck size={16} />
            {t("sidebar.admin")}
          </button>
        )}
        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          <Settings size={16} />
          {t("sidebar.settings")}
        </button>
        <ThemeToggle />
        {userEmail && (
          <p className="truncate px-3 pt-1 text-[11px] text-muted-foreground/50">{userEmail}</p>
        )}
      </div>
    </div>
  );
}
