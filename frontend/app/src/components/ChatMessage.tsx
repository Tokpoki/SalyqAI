import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { User, Sparkles, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { Obligation, Citation } from "@/api/chat";
import { sendFeedback } from "@/api/feedback";
import ObligationsInline from "./ObligationsInline";
import CitationsInline from "./CitationsInline";

const DEBT_KEYWORDS = ["задолженност", "долг", "недоимк", "пен", "неуплат", "просрочк", "переплат"];
const KGD_DEBT_URL = "https://portal.kgd.gov.kz/ru/pages/info-services/info-absence-tax-debt";

const URL_SPLIT = /(https?:\/\/[^\s,)]+)/;

function Linkify({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_SPLIT);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.match(/^https?:\/\//) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={className || "underline text-primary hover:text-primary/80 break-all"}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function shouldShowDebtButton(content: string, role: string): boolean {
  if (role !== "assistant") return false;
  const lower = content.toLowerCase();
  return DEBT_KEYWORDS.some((kw) => lower.includes(kw));
}

interface ChatMessageProps {
  id?: string;
  sessionId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  obligations?: Obligation[];
  citations?: Citation[];
  actionPlan?: string[];
  clarifyingQuestions?: string[];
  confidence?: number;
  disclaimer?: string;
  onSendQuestion?: (question: string) => void;
}

export default function ChatMessage({
  id,
  sessionId,
  role,
  content,
  obligations,
  citations,
  actionPlan,
  clarifyingQuestions,
  confidence,
  disclaimer,
  onSendQuestion,
}: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = role === "user";
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);

  function handleFeedback(rating: "up" | "down") {
    if (feedbackGiven || !id || !sessionId) return;
    setFeedbackGiven(rating);
    sendFeedback(sessionId, id, rating).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex gap-3 px-4 py-4", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
          isUser
            ? "gradient-bg text-white"
            : "bg-secondary border border-border/50 text-foreground",
        )}
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} className="text-primary" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "max-w-[75%] space-y-3 rounded-2xl px-5 py-3.5 text-sm leading-relaxed",
          isUser
            ? "gradient-bg text-white rounded-tr-md shadow-lg shadow-emerald-500/10"
            : "bg-card border border-border/50 text-foreground rounded-tl-md shadow-sm",
        )}
      >
        <p className="whitespace-pre-wrap">
          <Linkify text={content} className={isUser ? "underline text-white/90 hover:text-white break-all" : undefined} />
        </p>

        {actionPlan && actionPlan.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border/20 pt-3">
            <p className="text-xs font-semibold opacity-70">{t("msg.actionPlan")}</p>
            <ol className="list-decimal pl-4 text-xs space-y-1">
              {actionPlan.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {clarifyingQuestions && clarifyingQuestions.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border/20 pt-3">
            <p className="text-xs font-semibold opacity-70">{t("msg.questions")}</p>
            <ul className="list-disc pl-4 text-xs space-y-1">
              {clarifyingQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {obligations && obligations.length > 0 && (
          <ObligationsInline obligations={obligations} />
        )}

        {citations && citations.length > 0 && (
          <CitationsInline citations={citations} />
        )}

        {confidence != null && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/70">{t("msg.confidence")}</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
              <div
                className="h-full rounded-full gradient-bg transition-all"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
          </div>
        )}

        {disclaimer && (
          <p className="mt-2 text-[11px] italic text-muted-foreground/60">{disclaimer}</p>
        )}

        {shouldShowDebtButton(content, role) && (
          <a
            href={KGD_DEBT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 hover:border-primary/50"
          >
            <ExternalLink size={14} />
            {t("msg.checkDebt")}
          </a>
        )}

        {/* Feedback buttons */}
        {!isUser && id && sessionId && !id.startsWith("stream-") && (
          <div className="mt-2 flex items-center gap-2 border-t border-border/20 pt-2">
            <button
              onClick={() => handleFeedback("up")}
              disabled={feedbackGiven !== null}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-all",
                feedbackGiven === "up"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : feedbackGiven
                    ? "opacity-30 cursor-default text-muted-foreground"
                    : "text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-500/10",
              )}
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={() => handleFeedback("down")}
              disabled={feedbackGiven !== null}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-all",
                feedbackGiven === "down"
                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                  : feedbackGiven
                    ? "opacity-30 cursor-default text-muted-foreground"
                    : "text-muted-foreground/60 hover:text-red-600 hover:bg-red-500/10",
              )}
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
