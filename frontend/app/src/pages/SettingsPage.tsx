import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, Loader2, Scale, Building2, Briefcase, Save, CheckCircle2 } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";
import { getProfile as _getProfile, updateProfile as _updateProfile, type Profile } from "@/api/profile";
import { clearTokens } from "@/lib/auth";
import { DEV_BYPASS, mockApi } from "@/lib/dev";

const getProfile = DEV_BYPASS ? mockApi.getProfile : _getProfile;
const updateProfile = DEV_BYPASS ? (mockApi.updateProfile as typeof _updateProfile) : _updateProfile;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [taxpayerType, setTaxpayerType] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [activityType, setActivityType] = useState("");
  const [hasRental, setHasRental] = useState(false);
  const [hasForeign, setHasForeign] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const p = await getProfile();
        setProfile(p);
        setTaxpayerType(p.taxpayer_type || "");
        setTaxRegime(p.tax_regime || "");
        setAnnualIncome(p.annual_income_kzt?.toString() || "");
        setActivityType(p.activity_type || "");
        setHasRental(p.has_rental_income || false);
        setHasForeign(p.has_foreign_income || false);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProfile({
        taxpayer_type: taxpayerType || null,
        tax_regime: taxRegime || null,
        annual_income_kzt: annualIncome ? Number(annualIncome) : null,
        activity_type: activityType || null,
        has_rental_income: hasRental,
        has_foreign_income: hasForeign,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/", { replace: true });
  }

  const inputClass = "w-full rounded-xl border border-border/50 bg-background pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30";
  const inputClassNoIcon = "w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-emerald-500/20">
            <Scale size={20} className="text-white animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold">Настройки</h1>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-2xl px-4 py-8"
      >
        {/* Profile card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Профиль налогоплательщика</h2>

          <div className="space-y-5">
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
                Арендный доход
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-border/50 px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-accent/50">
                <input
                  type="checkbox"
                  checked={hasForeign}
                  onChange={(e) => setHasForeign(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                Доход из-за рубежа
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl gradient-bg px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-medium"
                >
                  <CheckCircle2 size={16} />
                  Сохранено
                </motion.span>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-6 rounded-2xl border border-destructive/20 bg-card p-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-destructive/30 px-5 py-3 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 hover:scale-[1.01] active:scale-[0.99]"
          >
            <LogOut size={16} />
            Выйти из аккаунта
          </button>
        </div>
      </motion.div>
    </div>
  );
}
