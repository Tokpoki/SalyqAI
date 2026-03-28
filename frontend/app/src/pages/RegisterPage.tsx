import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, ArrowLeft, ArrowRight } from "lucide-react";
import { register } from "@/api/auth";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Step 2 fields (all optional)
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Scale size={24} className="text-primary" />
            <span className="text-xl font-bold">Salyq AI</span>
          </div>
          <h1 className="text-xl font-semibold">Регистрация</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1 ? "Шаг 1 из 2 — Данные аккаунта" : "Шаг 2 из 2 — Профиль (необязательно)"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          <div className={cn("h-1 flex-1 rounded-full", step >= 1 ? "bg-primary" : "bg-border")} />
          <div className={cn("h-1 flex-1 rounded-full", step >= 2 ? "bg-primary" : "bg-border")} />
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
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Пароль</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Далее <ArrowRight size={16} />
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
                <select
                  value={taxpayerType}
                  onChange={(e) => setTaxpayerType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Не указано</option>
                  <option value="individual">Физическое лицо</option>
                  <option value="sole_proprietor">ИП</option>
                  <option value="legal_entity">ТОО</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Налоговый режим</label>
                <input
                  type="text"
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Например: упрощённая декларация"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Годовой доход (тенге)</label>
                <input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Вид деятельности</label>
                <input
                  type="text"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Например: разработка ПО"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasRental}
                    onChange={(e) => setHasRental(e.target.checked)}
                    className="rounded border-input"
                  />
                  Арендный доход
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasForeign}
                    onChange={(e) => setHasForeign(e.target.checked)}
                    className="rounded border-input"
                  />
                  Доход из-за рубежа
                </label>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  <ArrowLeft size={16} /> Назад
                </button>
                <button
                  onClick={() => submit(false)}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
                >
                  Пропустить
                </button>
                <button
                  onClick={() => submit(true)}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "..." : "Готово"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
