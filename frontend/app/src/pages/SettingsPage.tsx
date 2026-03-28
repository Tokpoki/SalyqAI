import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, Loader2 } from "lucide-react";
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

  // Form fields
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 hover:bg-accent"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold">Настройки</h1>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl px-4 py-8"
      >
        <h2 className="text-lg font-semibold mb-6">Профиль налогоплательщика</h2>

        <div className="space-y-5">
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

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            {saved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-600"
              >
                Сохранено
              </motion.span>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-12 border-t pt-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            <LogOut size={16} />
            Выйти из аккаунта
          </button>
        </div>
      </motion.div>
    </div>
  );
}
