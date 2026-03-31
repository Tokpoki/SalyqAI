import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  BarChart3,
  Activity,
  Loader2,
  ChevronRight,
  UserPlus,
  ShieldAlert,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import {
  getAdminStats,
  getAdminUsers,
  getAdminConversations,
  getAdminConversation,
  getAdminActivity,
  type AdminStats,
  type AdminUser,
  type AdminConversation,
  type AdminConversationDetail,
  type ActivityEvent,
} from "@/api/admin";

type Tab = "users" | "conversations" | "activity";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function truncate(s: string | null, len: number): string {
  if (!s) return "—";
  return s.length > len ? s.slice(0, len) + "…" : s;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<Tab>("users");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [openConvo, setOpenConvo] = useState<AdminConversationDetail | null>(null);
  const [convoLoading, setConvoLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, u, c, a] = await Promise.all([
          getAdminStats(),
          getAdminUsers(),
          getAdminConversations(),
          getAdminActivity(),
        ]);
        setStats(s);
        setUsers(u.users);
        setConversations(c.conversations);
        setActivity(a.events);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 403) {
          setDenied(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function openConversation(sessionId: string) {
    setConvoLoading(true);
    try {
      const detail = await getAdminConversation(sessionId);
      setOpenConvo(detail);
    } catch {
      // silent
    } finally {
      setConvoLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <ShieldAlert size={48} className="text-destructive" />
        <p className="text-lg font-semibold">{t("admin.accessDenied")}</p>
        <button onClick={() => navigate("/chat")} className="text-sm text-primary hover:underline">
          {t("admin.backToChat")}
        </button>
      </div>
    );
  }

  const statCards = [
    { label: t("admin.stats.users"), value: stats?.total_users ?? 0, icon: Users, color: "text-emerald-500" },
    { label: t("admin.stats.messages"), value: stats?.total_user_messages ?? 0, icon: MessageSquare, color: "text-sky-500" },
    { label: t("admin.stats.sessions"), value: stats?.total_sessions ?? 0, icon: BarChart3, color: "text-violet-500" },
    { label: t("admin.stats.activeToday"), value: stats?.active_today_users ?? 0, icon: Activity, color: "text-amber-500" },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: t("admin.tab.users") },
    { key: "conversations", label: t("admin.tab.conversations") },
    { key: "activity", label: t("admin.tab.activity") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/chat")}
            className="rounded-xl p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold">{t("admin.title")}</h1>
          {stats && (
            <span className="ml-auto text-xs text-muted-foreground">
              {t("admin.stats.registeredToday")}: {stats.registered_today}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <card.icon size={20} className={card.color} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t("admin.table.name")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.table.email")}</th>
                      <th className="px-4 py-3 font-medium text-center">{t("admin.table.sessions")}</th>
                      <th className="px-4 py-3 font-medium text-center">{t("admin.table.messages")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.table.registered")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.table.lastActive")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-500">
                            {u.session_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                            {u.user_message_count ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {u.created_at ? timeAgo(u.created_at) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {u.last_active ? timeAgo(u.last_active) : "—"}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          {t("admin.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tab === "conversations" && !openConvo && (
            <motion.div
              key="conversations"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm text-left hover:bg-muted/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{c.user_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{c.user_email}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{timeAgo(c.updated_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground/80 truncate">
                      {c.title || truncate(c.first_question, 80)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {truncate(c.first_answer, 120)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-500">
                      {c.message_count}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-8 text-center text-muted-foreground">
                  {t("admin.noData")}
                </div>
              )}
            </motion.div>
          )}

          {tab === "conversations" && openConvo && (
            <motion.div
              key="convo-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border/50 bg-card shadow-sm"
            >
              {/* Conversation detail header */}
              <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
                <button
                  onClick={() => setOpenConvo(null)}
                  className="rounded-lg p-1.5 hover:bg-accent transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {openConvo.title || "Chat"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {openConvo.user_name} · {openConvo.user_email}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {openConvo.messages.length} msgs
                </span>
              </div>

              {/* Messages */}
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                {convoLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  openConvo.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl p-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary/10 ml-8"
                          : "bg-muted/50 mr-8"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          msg.role === "user" ? "text-primary" : "text-emerald-500"
                        }`}>
                          {msg.role === "user" ? "User" : "AI"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(msg.created_at)}
                        </span>
                        {msg.confidence != null && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            conf: {(msg.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border/50 bg-card shadow-sm p-4"
            >
              <div className="space-y-3">
                {activity.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      event.event_type === "registration" ? "bg-emerald-500" : "bg-sky-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{event.name || event.email}</span>
                        {event.event_type === "registration" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                            <UserPlus size={12} /> {t("admin.event.registered")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("admin.event.asked")}</span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          {timeAgo(event.created_at)}
                        </span>
                      </div>
                      {event.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {truncate(event.content, 150)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("admin.noData")}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
