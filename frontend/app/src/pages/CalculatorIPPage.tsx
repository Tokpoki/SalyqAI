import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calculator,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Lang } from "@/i18n";
import MoneyInput from "@/components/MoneyInput";
import {
  calculateIPMonthly,
  type IPMonthlyResponse,
  type ContributionItem,
  type EmployeeResult,
} from "@/api/calculator";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

function contribName(item: ContributionItem, lang: Lang): string {
  if (lang === "en") return item.name_en;
  if (lang === "kz") return item.name_kz;
  return item.name_ru;
}

// ─── Contribution table ─────────────────────────────────────────────────

function ContribTable({
  items,
  lang,
  t,
}: {
  items: ContributionItem[];
  lang: Lang;
  t: (k: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">{t("calc.contribution")}</th>
            <th className="pb-2 pr-4 font-medium">{t("calc.rate")}</th>
            <th className="pb-2 pr-4 font-medium text-right">{t("calc.base")}</th>
            <th className="pb-2 font-medium text-right">{t("calc.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.code} className="border-b border-border/30">
              <td className="py-2.5 pr-4 font-medium">{contribName(item, lang)}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">{item.rate}</td>
              <td className="py-2.5 pr-4 text-right text-muted-foreground">
                {fmt(item.base)} ₸
              </td>
              <td className="py-2.5 text-right font-semibold">{fmt(item.amount)} ₸</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Employee card ──────────────────────────────────────────────────────

function EmployeeCard({
  emp,
  index,
  lang,
  t,
}: {
  emp: EmployeeResult;
  index: number;
  lang: Lang;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(true);
  const label = emp.name || `${t("calc.empTitle")} #${index + 1}`;

  return (
    <div className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/30 transition-colors"
      >
        <span>{label} — {fmt(emp.salary)} ₸</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              {/* Deductions */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t("calc.deductions")}
                </p>
                <ContribTable items={emp.deductions} lang={lang} t={t} />
              </div>

              {/* Employer costs */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t("calc.employerCosts")}
                </p>
                <ContribTable items={emp.employer_costs} lang={lang} t={t} />
              </div>

              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{t("calc.netSalary")}:</span>{" "}
                  <span className="font-bold text-primary">{fmt(emp.net_salary)} ₸</span>
                </div>
                <div className="rounded-lg bg-orange-500/10 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{t("calc.employerCosts")}:</span>{" "}
                  <span className="font-bold text-orange-600 dark:text-orange-400">
                    {fmt(emp.total_employer_cost)} ₸
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────

export default function CalculatorIPPage() {
  const navigate = useNavigate();
  const { lang, t } = useTranslation();

  // Form state
  const [declaredIncome, setDeclaredIncome] = useState("");
  const [taxRegime, setTaxRegime] = useState<"simplified" | "general">("simplified");
  const [semiannualIncome, setSemiannualIncome] = useState("");
  const [employees, setEmployees] = useState<{ name: string; salary: string }[]>([]);
  const [year, setYear] = useState(2026);

  // Result state
  const [result, setResult] = useState<IPMonthlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addEmployee() {
    setEmployees([...employees, { name: "", salary: "" }]);
  }

  function removeEmployee(index: number) {
    setEmployees(employees.filter((_, i) => i !== index));
  }

  function updateEmployee(index: number, field: "name" | "salary", value: string) {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
  }

  async function handleCalculate() {
    const income = Number(declaredIncome);
    if (!income || income <= 0) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await calculateIPMonthly({
        declared_income: income,
        tax_regime: taxRegime,
        semiannual_income:
          taxRegime === "simplified" && semiannualIncome
            ? Number(semiannualIncome)
            : undefined,
        employees: employees
          .filter((e) => Number(e.salary) > 0)
          .map((e) => ({
            name: e.name || undefined,
            salary: Number(e.salary),
          })),
        year,
      });
      setResult(res);
    } catch {
      setError(t("calc.error"));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border/50 bg-background pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30";

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-teal-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-bg">
              <Calculator size={14} className="text-white" />
            </div>
            <h1 className="text-sm font-semibold">{t("calc.title")}</h1>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-3xl px-4 py-8 space-y-6"
      >
        {/* ═══ Form card ═══ */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold">{t("calc.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("calc.subtitle")}</p>
          </div>

          {/* Year + Regime row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("calc.year")}</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("calc.taxRegime")}</label>
              <select
                value={taxRegime}
                onChange={(e) => setTaxRegime(e.target.value as "simplified" | "general")}
                className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="simplified">{t("calc.simplified")}</option>
                <option value="general">{t("calc.general")}</option>
              </select>
            </div>
          </div>

          {/* Declared income */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("calc.declaredIncome")}
            </label>
            <MoneyInput
              value={declaredIncome}
              onChange={setDeclaredIncome}
              className={inputClass}
            />
          </div>

          {/* Semi-annual income (simplified only) */}
          {taxRegime === "simplified" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="mb-1.5 block text-sm font-medium">
                {t("calc.semiannualIncome")}
              </label>
              <MoneyInput
                value={semiannualIncome}
                onChange={setSemiannualIncome}
                className={inputClass}
              />
            </motion.div>
          )}

          {/* Employees */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("calc.employees")}</label>
              <button
                type="button"
                onClick={addEmployee}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10"
              >
                <UserPlus size={14} />
                {t("calc.addEmployee")}
              </button>
            </div>

            <AnimatePresence>
              {employees.map((emp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={emp.name}
                      onChange={(e) => updateEmployee(i, "name", e.target.value)}
                      placeholder={t("calc.employeeName")}
                      className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <MoneyInput
                      value={emp.salary}
                      onChange={(v) => updateEmployee(i, "salary", v)}
                      className="w-full rounded-lg border border-border/50 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder={t("calc.employeeSalary")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEmployee(i)}
                    className="mt-1 rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={loading || !declaredIncome}
            className="inline-flex items-center gap-2 rounded-xl gradient-bg px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator size={16} />
            {loading ? t("calc.calculating") : t("calc.calculate")}
          </button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* ═══ Results ═══ */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              {/* Constants info */}
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                  <Info size={12} />
                  {t("calc.mzpNote")}: {fmt(result.mzp)} ₸
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                  <Info size={12} />
                  {t("calc.mrpNote")}: {fmt(result.mrp)} ₸
                </div>
              </div>

              {/* Self contributions */}
              <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold">{t("calc.selfTitle")}</h3>
                <ContribTable items={result.self_contributions} lang={lang} t={t} />
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                  <span className="text-sm font-semibold">{t("calc.total")}</span>
                  <span className="text-lg font-bold text-primary">{fmt(result.self_total)} ₸</span>
                </div>
              </div>

              {/* Semi-annual tax */}
              {result.semiannual_tax && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
                  <h3 className="mb-4 text-base font-bold">{t("calc.semiTitle")}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-border/30">
                          <td className="py-2.5 pr-4 font-medium">{t("calc.ipn")}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {result.semiannual_tax.ipn_rate}
                          </td>
                          <td className="py-2.5 text-right font-semibold">
                            {fmt(result.semiannual_tax.ipn)} ₸
                          </td>
                        </tr>
                        <tr className="border-b border-border/30">
                          <td className="py-2.5 pr-4 font-medium">{t("calc.socialTax")}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {result.semiannual_tax.social_tax_rate}
                          </td>
                          <td className="py-2.5 text-right font-semibold">
                            {fmt(result.semiannual_tax.social_tax)} ₸
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                    <span className="text-sm font-semibold">{t("calc.total")}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {t("calc.semiMonthly")} ~{fmt(result.semiannual_tax.monthly_equivalent)} ₸
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {fmt(result.semiannual_tax.total)} ₸
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Employees */}
              {result.employees.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-3">
                  <h3 className="text-base font-bold">{t("calc.employees")}</h3>
                  {result.employees.map((emp, i) => (
                    <EmployeeCard key={i} emp={emp} index={i} lang={lang} t={t} />
                  ))}
                </div>
              )}

              {/* Grand total */}
              <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-sky-500/5 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">{t("calc.grandTotal")}</span>
                  <span className="text-2xl font-extrabold gradient-text">
                    {fmt(result.grand_total_monthly)} ₸
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
