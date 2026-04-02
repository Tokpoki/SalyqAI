import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "sidebar" | "icon";
}

export default function ThemeToggle({ variant = "sidebar" }: Props) {
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

  if (variant === "icon") {
    return (
      <button
        onClick={() => setDark((d) => !d)}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title={dark ? t("sidebar.lightTheme") : t("sidebar.darkTheme")}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

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
