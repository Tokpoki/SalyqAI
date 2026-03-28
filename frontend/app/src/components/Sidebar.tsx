import { useNavigate, useParams } from "react-router-dom";
import { Plus, Settings, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/api/chat";

interface SidebarProps {
  sessions: SessionSummary[];
  onNewChat: () => void;
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

export default function Sidebar({ sessions, onNewChat, isCreating, userEmail }: SidebarProps) {
  const navigate = useNavigate();
  const { chatId } = useParams();

  const grouped: Record<string, SessionSummary[]> = {};
  for (const s of sessions) {
    const label = formatDate(s.created_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(s);
  }

  return (
    <div className="flex h-full w-[280px] flex-col border-r bg-secondary/30">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          disabled={isCreating}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
            isCreating && "opacity-50 cursor-not-allowed",
          )}
        >
          <Plus size={16} />
          Новый чат
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2">
        <AnimatePresence>
          {Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {label}
              </p>
              {items.map((s) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate(`/chat/${s.id}`)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                    chatId === s.id && "bg-accent font-medium",
                  )}
                >
                  <MessageSquare size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {s.title || "Новый чат"}
                  </span>
                </motion.button>
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom: settings + user */}
      <div className="border-t p-3 space-y-2">
        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings size={16} />
          Настройки
        </button>
        {userEmail && (
          <p className="truncate px-2 text-xs text-muted-foreground">{userEmail}</p>
        )}
      </div>
    </div>
  );
}
