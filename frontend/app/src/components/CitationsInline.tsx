import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { Citation } from "@/api/chat";

interface Props {
  citations: Citation[];
}

export default function CitationsInline({ citations }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 border-t border-border/30 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
      >
        <BookOpen size={14} />
        {citations.length} {citations.length === 1 ? t("msg.article") : citations.length < 5 ? t("msg.articles2") : t("msg.articles5")}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[500px] mt-2" : "max-h-0",
        )}
      >
        <div className="space-y-2">
          {citations.map((c, i) => (
            <div
              key={i}
              className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-700/30 p-2.5 text-xs space-y-0.5"
            >
              <p className="font-medium text-amber-900 dark:text-amber-100">
                ст. {c.article_number} — {c.article_title}
              </p>
              {c.snippet && (
                <p className="text-amber-700 dark:text-amber-300/80 italic">«{c.snippet}»</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
