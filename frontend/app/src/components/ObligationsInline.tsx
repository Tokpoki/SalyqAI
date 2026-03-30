import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { Obligation } from "@/api/chat";

interface Props {
  obligations: Obligation[];
}

export default function ObligationsInline({ obligations }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 border-t border-border/30 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
      >
        <ClipboardList size={14} />
        {obligations.length} {obligations.length === 1 ? t("msg.obligation") : obligations.length < 5 ? t("msg.obligations2") : t("msg.obligations5")}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[500px] mt-2" : "max-h-0",
        )}
      >
        <div className="space-y-2">
          {obligations.map((o, i) => (
            <div
              key={i}
              className="rounded-lg bg-background/50 p-2.5 text-xs space-y-0.5"
            >
              <p className="font-medium">{o.title}</p>
              {o.code && <p className="text-muted-foreground">Код: {o.code}</p>}
              {o.kbk && <p className="text-muted-foreground font-mono">КБК: {o.kbk}</p>}
              {o.knp && <p className="text-muted-foreground font-mono">КНП: {o.knp}</p>}
              {o.due_date_rule && <p className="text-muted-foreground">Срок: {o.due_date_rule}</p>}
              {o.amount_kzt != null && (
                <p className="text-muted-foreground">
                  Сумма: {new Intl.NumberFormat("ru-KZ").format(o.amount_kzt)} ₸
                </p>
              )}
              {o.basis && <p className="text-muted-foreground">Основание: {o.basis}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
