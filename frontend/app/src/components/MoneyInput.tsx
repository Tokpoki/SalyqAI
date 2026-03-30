import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n";

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const QUICK_BUTTONS = [
  { key: "money.100k", amount: 100_000 },
  { key: "money.500k", amount: 500_000 },
  { key: "money.1m", amount: 1_000_000 },
  { key: "money.5m", amount: 5_000_000 },
];

function formatDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ru-RU");
}

function toRaw(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export default function MoneyInput({ value, onChange, className = "", placeholder = "0" }: MoneyInputProps) {
  const { t } = useTranslation();
  const [display, setDisplay] = useState(() => formatDisplay(value));

  useEffect(() => {
    setDisplay(formatDisplay(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = toRaw(e.target.value);
    setDisplay(formatDisplay(raw));
    onChange(raw);
  }

  function handleQuickAdd(amount: number) {
    const current = Number(toRaw(display)) || 0;
    const next = String(current + amount);
    setDisplay(formatDisplay(next));
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground/50">₸</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={className}
          placeholder={placeholder}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_BUTTONS.map((btn) => (
          <button
            key={btn.amount}
            type="button"
            onClick={() => handleQuickAdd(btn.amount)}
            className="rounded-lg border border-border/50 bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            {t(btn.key)}
          </button>
        ))}
        {display && (
          <button
            type="button"
            onClick={() => { setDisplay(""); onChange(""); }}
            className="rounded-lg border border-border/50 bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            {t("money.reset")}
          </button>
        )}
      </div>
    </div>
  );
}
