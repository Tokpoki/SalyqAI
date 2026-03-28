import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "max-w-[75%] space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-secondary/70 text-foreground rounded-tl-sm",
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>

        {actionPlan && actionPlan.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
            <p className="text-xs font-medium opacity-70">План действий:</p>
            <ol className="list-decimal pl-4 text-xs space-y-0.5">
              {actionPlan.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {clarifyingQuestions && clarifyingQuestions.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
            <p className="text-xs font-medium opacity-70">Уточняющие вопросы:</p>
            <ul className="list-disc pl-4 text-xs space-y-0.5">
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
          <p className="mt-1 text-xs opacity-50">
            Уверенность: {Math.round(confidence * 100)}%
          </p>
        )}

        {disclaimer && (
          <p className="mt-1 text-xs italic opacity-50">{disclaimer}</p>
        )}
      </div>
    </motion.div>
  );
}
