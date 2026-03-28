import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Obligation, Citation } from "@/api/chat";
import ObligationsInline from "./ObligationsInline";
import CitationsInline from "./CitationsInline";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  obligations?: Obligation[];
  citations?: Citation[];
  actionPlan?: string[];
  clarifyingQuestions?: string[];
  confidence?: number;
  disclaimer?: string;
}

export default function ChatMessage({
  role,
  content,
  obligations,
  citations,
  actionPlan,
  clarifyingQuestions,
  confidence,
  disclaimer,
}: ChatMessageProps) {
  const isUser = role === "user";

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
        <p className="whitespace-pre-wrap">{content}</p>

        {actionPlan && actionPlan.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border/20 pt-3">
            <p className="text-xs font-semibold opacity-70">План действий:</p>
            <ol className="list-decimal pl-4 text-xs space-y-1">
              {actionPlan.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {clarifyingQuestions && clarifyingQuestions.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border/20 pt-3">
            <p className="text-xs font-semibold opacity-70">Уточняющие вопросы:</p>
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

        {confidence != null && confidence > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-border/50 overflow-hidden">
              <div
                className="h-full rounded-full gradient-bg transition-all"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        )}

        {disclaimer && (
          <p className="mt-2 text-[11px] italic text-muted-foreground/60">{disclaimer}</p>
        )}
      </div>
    </motion.div>
  );
}
