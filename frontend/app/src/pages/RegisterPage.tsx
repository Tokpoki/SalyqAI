import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, ArrowLeft, ArrowRight, User, Mail, Lock, Building2, Briefcase } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";
import { register } from "@/api/auth";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Step 2
  const [taxpayerType, setTaxpayerType] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [activityType, setActivityType] = useState("");
  const [hasRental, setHasRental] = useState(false);
  const [hasForeign, setHasForeign] = useState(false);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  async function submit(withProfile: boolean) {
    setError("");
    setLoading(true);
    try {
      const payload: Parameters<typeof register>[0] = { email, password, name };
      if (withProfile) {
        payload.profile = {
          ...(taxpayerType && { taxpayer_type: taxpayerType }),
          ...(taxRegime && { tax_regime: taxRegime }),
          ...(annualIncome && { annual_income_kzt: Number(annualIncome) }),
          ...(activityType && { activity_type: activityType }),
          has_rental_income: hasRental,
          has_foreign_income: hasForeign,
        };
      }
      await register(payload);
      navigate("/chat", { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { status?: number };
      if (apiErr.status === 409) setError("Этот email уже зарегистрирован");
      else setError("Ошибка регистрации. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-border/50 bg-background pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30";
  const inputClassNoIcon = "w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-teal-500/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-border/50 bg-card p-8 shadow-xl shadow-black/5">
          {/* Header */}
          <div className="mb-6 text-center">
            <Link to="/" className="mb-4 inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-lg shadow-emerald-500/20">
                <Scale size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Salyq AI</span>
            </Link>
            <h1 className="mt-3 text-2xl font-bold">Регистрация</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {step === 1 ? "Шаг 1 — Данные аккаунта" : "Шаг 2 — Налоговый профиль (необязательно)"}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-6 flex gap-2">
            <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 1 ? "gradient-bg" : "bg-border")} />
            <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 2 ? "gradient-bg" : "bg-border")} />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleStep1}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium">ФИО</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Пароль</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl gradient-bg px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Далее
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Тип налогоплательщика</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <select
                      value={taxpayerType}
                      onChange={(e) => setTaxpayerType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Не указано</option>
                      <option value="individual">Физическое лицо</option>
                      <option value="sole_proprietor">ИП</option>
                      <option value="legal_entity">ТОО</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Налоговый режим</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={taxRegime}
                      onChange={(e) => setTaxRegime(e.target.value)}
                      className={inputClass}
                      placeholder="Например: упрощённая декларация"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Годовой доход (тенге)</label>
                  <MoneyInput
                    value={annualIncome}
                    onChange={setAnnualIncome}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Вид деятельности</label>
                  <input
                    type="text"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className={inputClassNoIcon}
                    placeholder="Например: разработка ПО"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2.5 rounded-xl border border-border/50 px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-accent/50">
                    <input
                      type="checkbox"
                      checked={hasRental}
                      onChange={(e) => setHasRental(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    Аренда
                  </label>
                  <label className="flex items-center gap-2.5 rounded-xl border border-border/50 px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-accent/50">
                    <input
                      type="checkbox"
                      checked={hasForeign}
                      onChange={(e) => setHasForeign(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    Зарубежный доход
                  </label>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 rounded-xl border border-border/50 px-4 py-3 text-sm font-medium transition-all hover:bg-accent"
                  >
                    <ArrowLeft size={16} /> Назад
                  </button>
                  <button
                    onClick={() => submit(false)}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-border/50 px-4 py-3 text-sm font-medium transition-all hover:bg-accent disabled:opacity-50"
                  >
                    Пропустить
                  </button>
                  <button
                    onClick={() => submit(true)}
                    disabled={loading}
                    className="flex-1 rounded-xl gradient-bg px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? "..." : "Готово"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
