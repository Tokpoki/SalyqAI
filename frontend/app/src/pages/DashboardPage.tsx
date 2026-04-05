import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  UserCog,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Lang } from "@/i18n";
import { getOptimization, type OptimizationResult, type RegimeBreakdown } from "@/api/optimizer";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

function localized(obj: Record<string, string> | undefined, lang: Lang, field: string): string {
  if (!obj) return "";
  return obj[`${field}_${lang}`] || obj[`${field}_ru`] || "";
}

function regimeName(r: RegimeBreakdown, lang: Lang): string {
  if (lang === "en") return r.regime_name_en;
  if (lang === "kz") return r.regime_name_kz;
  return r.regime_name_ru;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function urgencyColor(days: number): string {
  if (days <= 7) return "text-red-500 bg-red-500/10 border-red-500/30";
  if (days <= 30) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
  return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
}

// ─── Savings Hero Card ──────────────────────────────────────────────────

function SavingsHero({ data, lang, t }: { data: OptimizationResult; lang: Lang; t: (k: string) => string }) {
  const hasSavings = data.potential_annual_savings > 0;
  const bestRegime = data.regimes.find((r) => r.regime === data.best_regime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl p-6 md:p-8 ${
        hasSavings
          ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-sky-500/20 border border-emerald-500/30"
          : "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-sky-500/10 border border-emerald-500/20"
      }`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-400/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10">
        {hasSavings ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("dash.savingsFound")}
              </span>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {fmt(data.potential_annual_savings)} ₸<span className="text-lg font-normal text-muted-foreground">/{t("dash.year")}</span>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              {t("dash.switchTo")}{" "}
              <span className="font-semibold text-foreground">
                {bestRegime ? regimeName(bestRegime, lang) : ""}
              </span>{" "}
              — {t("dash.savingsMonthly")} {fmt(Math.round(data.potential_annual_savings / 12))} ₸/{t("dash.month")}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("dash.optimal")}
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-foreground">
              {t("dash.optimalDesc")}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Regime Comparison Cards ────────────────────────────────────────────

function RegimeCard({
  regime,
  isCurrent,
  isBest,
  lang,
  t,
  delay,
}: {
  regime: RegimeBreakdown;
  isCurrent: boolean;
  isBest: boolean;
  lang: Lang;
  t: (k: string) => string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-2xl border p-5 transition-all ${
        isBest
          ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
          : "border-border/50 bg-card/50"
      } ${!regime.eligible ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{regimeName(regime, lang)}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{regime.article}</p>
        </div>
        <div className="flex gap-1.5">
          {isCurrent && (
            <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              {t("dash.current")}
            </span>
          )}
          {isBest && regime.eligible && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {t("dash.recommended")}
            </span>
          )}
          {!regime.eligible && (
            <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
              {t("dash.unavailable")}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("dash.taxRate")}</span>
          <span className="font-medium">{regime.tax_rate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("dash.annualTax")}</span>
          <span className="font-medium">{fmt(regime.annual_tax)} ₸</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("dash.annualContributions")}</span>
          <span className="font-medium">{fmt(regime.annual_contributions)} ₸</span>
        </div>
        <div className="border-t border-border/50 pt-2 flex justify-between text-sm">
          <span className="font-semibold">{t("dash.totalYear")}</span>
          <span className="font-bold text-lg">{fmt(regime.annual_total)} ₸</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("dash.perMonth")}</span>
          <span>{fmt(regime.monthly_total)} ₸/{t("dash.month")}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Deadlines Timeline ─────────────────────────────────────────────────

function DeadlinesSection({ data, lang, t }: { data: OptimizationResult; lang: Lang; t: (k: string) => string }) {
  if (!data.deadlines.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl border border-border/50 bg-card/50 p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-primary" />
        <h2 className="font-semibold text-foreground">{t("dash.deadlines")}</h2>
      </div>
      <div className="space-y-3">
        {data.deadlines.map((dl, i) => {
          const days = daysUntil(dl.date);
          const title = lang === "en" ? dl.title_en : lang === "kz" ? dl.title_kz : dl.title_ru;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${urgencyColor(days)}`}>
                {new Date(dl.date).toLocaleDateString(lang === "kz" ? "kk-KZ" : lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "short" })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{title}</p>
                <p className="text-xs text-muted-foreground">
                  {days <= 0 ? t("dash.overdue") : `${days} ${t("dash.daysLeft")}`}
                  {dl.form && ` · ${dl.form}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Risk Alerts ────────────────────────────────────────────────────────

function RisksSection({ data, lang, t }: { data: OptimizationResult; lang: Lang; t: (k: string) => string }) {
  if (!data.risks.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="rounded-2xl border border-border/50 bg-card/50 p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-amber-500" />
        <h2 className="font-semibold text-foreground">{t("dash.risks")}</h2>
      </div>
      <div className="space-y-3">
        {data.risks.map((risk, i) => {
          const msg = lang === "en" ? risk.message_en : lang === "kz" ? risk.message_kz : risk.message_ru;
          return (
            <div
              key={i}
              className={`rounded-xl border p-3 text-sm ${
                risk.severity === "high"
                  ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
              }`}
            >
              {msg}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Incomplete Profile Guard ───────────────────────────────────────────

function IncompleteProfile({ t, navigate }: { t: (k: string) => string; navigate: (path: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
        <UserCog size={36} className="text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">{t("dash.profileRequired")}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{t("dash.profileRequiredDesc")}</p>
      <button
        onClick={() => navigate("/settings")}
        className="flex items-center gap-2 rounded-xl gradient-bg px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <UserCog size={16} />
        {t("dash.goToSettings")}
        <ChevronRight size={16} />
      </button>
    </motion.div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [data, setData] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getOptimization()
      .then(setData)
      .catch(() => setError(t("dash.error")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/chat")}
            className="rounded-xl p-2 transition-colors hover:bg-accent"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">{t("dash.title")}</h1>
              <p className="text-[11px] text-muted-foreground">{t("dash.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {data && !data.profile_complete && <IncompleteProfile t={t} navigate={navigate} />}

        {data && data.profile_complete && (
          <>
            {/* Savings Hero */}
            <SavingsHero data={data} lang={lang} t={t} />

            {/* Regime Comparison */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingDown size={18} className="text-primary" />
                {t("dash.regimeComparison")}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {data.regimes.map((r, i) => (
                  <RegimeCard
                    key={r.regime}
                    regime={r}
                    isCurrent={r.regime === data.current_regime}
                    isBest={r.regime === data.best_regime}
                    lang={lang}
                    t={t}
                    delay={0.1 + i * 0.1}
                  />
                ))}
              </div>
            </div>

            {/* Deadlines + Risks side by side on desktop */}
            <div className="grid gap-6 md:grid-cols-2">
              <DeadlinesSection data={data} lang={lang} t={t} />
              <RisksSection data={data} lang={lang} t={t} />
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                {data.recommendations.map((rec, i) => {
                  const title = lang === "en" ? rec.title_en : lang === "kz" ? rec.title_kz : rec.title_ru;
                  const desc = lang === "en" ? rec.description_en : lang === "kz" ? rec.description_kz : rec.description_ru;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                          <Sparkles size={18} className="text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Constants note */}
            {data.constants && (
              <p className="text-xs text-muted-foreground text-center">
                {t("dash.constantsNote")} МРП = {fmt(data.constants.mrp)} ₸, МЗП = {fmt(data.constants.mzp)} ₸ ({data.constants.year})
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
