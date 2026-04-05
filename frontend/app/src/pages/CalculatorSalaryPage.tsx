import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calculator, CircleHelp, Info, X } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Lang } from "@/i18n";
import MoneyInput from "@/components/MoneyInput";
import {
  calculateSalaryMonthly,
  type SalaryMonthlyResponse,
  type ContributionItem,
} from "@/api/calculator";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

function contribName(item: ContributionItem, lang: Lang): string {
  if (lang === "en") return item.name_en;
  if (lang === "kz") return item.name_kz;
  return item.name_ru;
}

function HelpPopover({ title, lines }: { title: string; lines: string[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <CircleHelp size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 top-10 z-30 w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-border/70 bg-card p-4 shadow-2xl"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              {lines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

function SelectRow({
  label,
  value,
  onChange,
  options,
  helpTitle,
  helpLines,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  helpTitle: string;
  helpLines: string[];
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <HelpPopover title={helpTitle} lines={helpLines} />
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  helpTitle,
  helpLines,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helpTitle: string;
  helpLines: string[];
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-border/70 bg-background text-primary"
      />
      <HelpPopover title={helpTitle} lines={helpLines} />
    </div>
  );
}

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
            <tr key={`${item.code}-${item.rate}`} className="border-b border-border/30">
              <td className="py-2.5 pr-4 font-medium">{contribName(item, lang)}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">{item.rate}</td>
              <td className="py-2.5 pr-4 text-right text-muted-foreground">{fmt(item.base)} KZT</td>
              <td className="py-2.5 text-right font-semibold">{fmt(item.amount)} KZT</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CalculatorSalaryPage() {
  const navigate = useNavigate();
  const { lang, t } = useTranslation();

  const [grossSalary, setGrossSalary] = useState("");
  const [year, setYear] = useState(2026);

  const [ipnRate, setIpnRate] = useState<"10" | "15">("10");
  const [residency, setResidency] = useState<
    "resident" | "non_resident_eaeu" | "non_resident_with_vnz" | "non_resident_without_vnz" | "stateless"
  >("resident");
  const [disability, setDisability] = useState<"none" | "group_1_2" | "group_3">("none");
  const [pensionStatus, setPensionStatus] = useState<
    "not_pensioner" | "age_pensioner" | "service_pensioner"
  >("not_pensioner");
  const [category, setCategory] = useState<
    "other" | "student" | "astana_hub_participant" | "many_children_mother"
  >("other");
  const [familyDeduction, setFamilyDeduction] = useState<
    "none" | "parent_23_5" | "each_parent_11_75"
  >("none");

  const [useStandardDeduction, setUseStandardDeduction] = useState(true);
  const [isIpOwner, setIsIpOwner] = useState(false);
  const [isGphContract, setIsGphContract] = useState(false);

  const [result, setResult] = useState<SalaryMonthlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ipnOptions: SelectOption[] = [
    { value: "10", label: "Ставка ИПН 10%" },
    { value: "15", label: "Ставка ИПН 15%" },
  ];

  const residencyOptions: SelectOption[] = [
    { value: "resident", label: "Резидент" },
    { value: "non_resident_eaeu", label: "Нерезидент из ЕАЭС" },
    { value: "non_resident_with_vnz", label: "Нерезидент с ВНЖ" },
    { value: "non_resident_without_vnz", label: "Нерезидент без ВНЖ" },
    { value: "stateless", label: "Лицо без гражданства" },
  ];

  const disabilityOptions: SelectOption[] = [
    { value: "none", label: "Без инвалидности" },
    { value: "group_1_2", label: "Инвалидность I-II группы" },
    { value: "group_3", label: "Инвалидность III группы" },
  ];

  const pensionOptions: SelectOption[] = [
    { value: "not_pensioner", label: "Не пенсионер" },
    { value: "age_pensioner", label: "Пенсионер по возрасту" },
    { value: "service_pensioner", label: "Пенсионер по выслуге лет" },
  ];

  const categoryOptions: SelectOption[] = [
    { value: "other", label: "Прочие категории" },
    { value: "student", label: "Студент" },
    { value: "astana_hub_participant", label: "Astana Hub участник" },
    { value: "many_children_mother", label: "Многодетная мать" },
  ];

  const familyDeductionOptions: SelectOption[] = [
    { value: "none", label: "Нет вычета для многодетной семьи" },
    { value: "parent_23_5", label: "23,5 МРП (один родитель)" },
    { value: "each_parent_11_75", label: "11,75 МРП (каждый родитель)" },
  ];

  const helpIpn = [
    "Выберите ставку ИПН 10% или 15%, которая будет применяться к доходу.",
    "Если база ИПН по доходам за предыдущие месяцы периода уже превысила 8500 МРП, применяется повышенная ставка 15% к сумме превышения.",
    "Ориентир: разъяснение КГД РК по прогрессивной шкале ИПН (до 8500 МРП — 10%, свыше — 15%).",
  ];

  const helpResidency = [
    "Резидент — гражданин Республики Казахстан.",
    "Нерезидент из ЕАЭС — иностранец из Армении, Беларуси, Кыргызстана или России.",
    "Нерезидент с ВНЖ — иностранец с видом на жительство в РК либо лицо, находящееся в РК 183+ дней.",
    "Нерезидент без ВНЖ — иностранец без вида на жительство.",
    "Лицо без гражданства — лицо, не имеющее гражданства в каком-либо государстве.",
    "Физлицо признается резидентом при нахождении в РК не менее 183 дней за любой последовательный 12-месячный период, либо 90 дней для инвестиционного резидента МФЦА (ст. 222 НК РК).",
  ];

  const helpPension = [
    "Не пенсионер — лицо, не являющееся пенсионером.",
    "Пенсионер по возрасту — лицо, получающее пенсионные выплаты в связи с достижением пенсионного возраста.",
    "Пенсионер по выслуге лет — военнослужащие, сотрудники специальных гос- и правоохранительных органов, госфельдъегерской службы и иные лица, указанные в Социальном кодексе РК.",
  ];

  const helpCategory = [
    "Студент — обучающийся по очной форме в организациях среднего, ТиПО, послесреднего, высшего и послевузовского образования.",
    "Astana Hub участник — юрлицо-участник Astana Hub, имеющее право на предусмотренные законодательством налоговые льготы.",
    "Многодетная мать — лица с наградами «Алтын алқа», «Күміс алқа», «Мать-героиня», орденами «Материнская слава» I/II степени.",
  ];

  const helpFamilyDeduction = [
    "Налоговый вычет для многодетной семьи — не более 282 МРП за календарный год в совокупности на обоих родителей (ст. 347 НК РК).",
    "Вариант 1: 23,5 МРП в месяц для одного из родителей.",
    "Вариант 2: 11,75 МРП в месяц для каждого родителя.",
    "Условие применения: на 1 января года у физлица должно быть 4 и более несовершеннолетних детей (подтверждается свидетельствами о рождении).",
  ];

  const helpDisability = [
    "Выберите статус инвалидности для применения соответствующих социальных вычетов по ИПН.",
    "Для лиц с инвалидностью I-II группы в разъяснениях КГД предусмотрено повышенное значение социального вычета.",
  ];

  async function handleCalculate() {
    const salary = Number(grossSalary);
    if (!salary || salary <= 0) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await calculateSalaryMonthly({
        gross_salary: salary,
        year,
        ipn_rate_percent: ipnRate === "10" ? 10 : 15,
        residency,
        disability,
        pension_status: pensionStatus,
        category,
        family_deduction: familyDeduction,
        use_standard_deduction: useStandardDeduction,
        is_ip_owner: isIpOwner,
        is_gph_contract: isGphContract,
      });
      setResult(res);
    } catch {
      setError(t("salaryCalc.error"));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border/50 bg-background pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30";

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
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
            <h1 className="text-sm font-semibold">{t("salaryCalc.title")}</h1>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-4xl px-4 py-8 space-y-6"
      >
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold">{t("salaryCalc.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("salaryCalc.subtitle")}</p>
          </div>

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
              <label className="mb-1.5 block text-sm font-medium">{t("salaryCalc.grossSalary")}</label>
              <MoneyInput value={grossSalary} onChange={setGrossSalary} className={inputClass} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectRow
              label="Ставка ИПН"
              value={ipnRate}
              onChange={(v) => setIpnRate(v as "10" | "15")}
              options={ipnOptions}
              helpTitle="Ставка ИПН"
              helpLines={helpIpn}
            />
            <SelectRow
              label="Резидент"
              value={residency}
              onChange={(v) =>
                setResidency(
                  v as
                    | "resident"
                    | "non_resident_eaeu"
                    | "non_resident_with_vnz"
                    | "non_resident_without_vnz"
                    | "stateless",
                )
              }
              options={residencyOptions}
              helpTitle="Признак гражданства и резидентство"
              helpLines={helpResidency}
            />
            <SelectRow
              label="Без инвалидности"
              value={disability}
              onChange={(v) => setDisability(v as "none" | "group_1_2" | "group_3")}
              options={disabilityOptions}
              helpTitle="Инвалидность"
              helpLines={helpDisability}
            />
            <SelectRow
              label="Пенсионный статус"
              value={pensionStatus}
              onChange={(v) =>
                setPensionStatus(v as "not_pensioner" | "age_pensioner" | "service_pensioner")
              }
              options={pensionOptions}
              helpTitle="Вид пенсионных выплат"
              helpLines={helpPension}
            />
            <SelectRow
              label="Прочие категории"
              value={category}
              onChange={(v) =>
                setCategory(v as "other" | "student" | "astana_hub_participant" | "many_children_mother")
              }
              options={categoryOptions}
              helpTitle="Прочие категории работников"
              helpLines={helpCategory}
            />
            <SelectRow
              label="Вычет для многодетной семьи"
              value={familyDeduction}
              onChange={(v) =>
                setFamilyDeduction(v as "none" | "parent_23_5" | "each_parent_11_75")
              }
              options={familyDeductionOptions}
              helpTitle="Вычет для многодетной семьи"
              helpLines={helpFamilyDeduction}
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-border/50 bg-background/40 p-4">
            <CheckRow
              label="Вычет 30 (14) МРП"
              checked={useStandardDeduction}
              onChange={setUseStandardDeduction}
              helpTitle="Базовый вычет 30 (14) МРП"
              helpLines={[
                "Вычет 30 МРП применяется для трудового договора.",
                "В режиме ГПХ вместо 30 МРП применяется 14 МРП.",
              ]}
            />
            <CheckRow
              label="Владелец ИП"
              checked={isIpOwner}
              onChange={setIsIpOwner}
              helpTitle="Владелец ИП"
              helpLines={[
                "Используется как переключатель режима расчета, где часть начислений работодателя отключается.",
                "Нужен для сценариев, когда расчет делается не для обычного работника по трудовому договору.",
              ]}
            />
            <CheckRow
              label="По договору ГПХ"
              checked={isGphContract}
              onChange={setIsGphContract}
              helpTitle="Договор ГПХ"
              helpLines={[
                "В режиме ГПХ не применяются стандартные начисления работодателя как при трудовом договоре.",
                "Также меняется базовый вычет по ИПН (14 МРП).",
              ]}
            />
          </div>

          <p className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            {t("salaryCalc.ipnHint")}
          </p>

          <button
            onClick={handleCalculate}
            disabled={loading || !grossSalary}
            className="inline-flex items-center gap-2 rounded-xl gradient-bg px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator size={16} />
            {loading ? t("calc.calculating") : t("salaryCalc.calculate")}
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                  <Info size={12} />
                  {t("calc.mzpNote")}: {fmt(result.mzp)} KZT
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                  <Info size={12} />
                  {t("calc.mrpNote")}: {fmt(result.mrp)} KZT
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                  <Info size={12} />
                  Вычеты ИПН: {fmt(result.ipn_deduction_total)} KZT
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <p className="text-xs text-muted-foreground">{t("salaryCalc.summaryGross")}</p>
                  <p className="mt-1 text-lg font-bold">{fmt(result.gross_salary)} KZT</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground">{t("salaryCalc.summaryNet")}</p>
                  <p className="mt-1 text-lg font-bold text-primary">{fmt(result.net_salary)} KZT</p>
                </div>
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                  <p className="text-xs text-muted-foreground">{t("salaryCalc.summaryDeductions")}</p>
                  <p className="mt-1 text-lg font-bold text-orange-600 dark:text-orange-400">
                    {fmt(result.total_deductions)} KZT
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <p className="text-xs text-muted-foreground">{t("salaryCalc.summaryEmployer")}</p>
                  <p className="mt-1 text-lg font-bold">{fmt(result.total_employer_cost)} KZT</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t("salaryCalc.summaryPayroll")}</p>
                  <p className="mt-1 text-lg font-bold">{fmt(result.payroll_cost)} KZT</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold">{t("salaryCalc.deductionsTitle")}</h3>
                <ContribTable items={result.deductions} lang={lang} t={t} />
              </div>

              <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold">{t("salaryCalc.employerTitle")}</h3>
                <ContribTable items={result.employer_costs} lang={lang} t={t} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
