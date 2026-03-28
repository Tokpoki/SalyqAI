import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/api/chat";

interface Props {
  citations: Citation[];
}

export default function CitationsInline({ citations }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 border-t border-border/30 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
      >
        <BookOpen size={14} />
        {citations.length} стат{citations.length === 1 ? "ья" : citations.length < 5 ? "ьи" : "ей"} НК РК
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
              className="rounded-lg bg-amber-50 border border-amber-200/50 p-2.5 text-xs space-y-0.5"
            >
              <p className="font-medium">
                ст. {c.article_number} — {c.article_title}
              </p>
              {c.snippet && (
                <p className="text-muted-foreground italic">«{c.snippet}»</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
