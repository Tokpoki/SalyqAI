import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, Loader2, Scale, Building2, Briefcase, Save, CheckCircle2, ShieldCheck, ShieldAlert, Globe, Users, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n";
import MoneyInput from "@/components/MoneyInput";
import { getProfile as _getProfile, updateProfile as _updateProfile, type Profile } from "@/api/profile";
import { clearTokens } from "@/lib/auth";
import { DEV_BYPASS, mockApi } from "@/lib/dev";

const getProfile = DEV_BYPASS ? mockApi.getProfile : _getProfile;
const updateProfile = DEV_BYPASS ? (mockApi.updateProfile as typeof _updateProfile) : _updateProfile;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [taxpayerType, setTaxpayerType] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [activityType, setActivityType] = useState("");
  const [salaryGroups, setSalaryGroups] = useState<{ salary: string; count: string }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const p = await getProfile();
        setProfile(p);
        setTaxpayerType(p.taxpayer_type || "");
        setTaxRegime(p.tax_regime || "");
        setAnnualIncome(p.annual_income_kzt?.toString() || "");
        setActivityType(p.activity_type || "");
        if (p.employee_salary_groups?.length) {
          setSalaryGroups(p.employee_salary_groups.map((g) => ({
            salary: g.salary.toString(),
            count: g.count.toString(),
          })));
        }
        if (p.language) localStorage.setItem("salyq_language", p.language);
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
      const groups = salaryGroups
        .filter((g) => g.salary && g.count && Number(g.salary) > 0 && Number(g.count) > 0)
        .map((g) => ({ salary: Number(g.salary), count: Number(g.count) }));

      const updated = await updateProfile({
        taxpayer_type: taxpayerType || null,
        tax_regime: taxRegime || null,
        annual_income_kzt: annualIncome ? Number(annualIncome) : null,
        activity_type: activityType || null,
        language: localStorage.getItem("salyq_language") || "ru",
        employee_salary_groups: groups.length > 0 ? groups : null,
      } as any);
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
          <h1 className="text-sm font-semibold">{t("settings.title")}</h1>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-2xl px-4 py-8"
      >
        {/* Profile card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-6">{t("settings.profileTitle")}</h2>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("settings.language")}</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as "ru" | "kz" | "en")}
                  className={inputClass}
                >
                  <option value="ru">Русский</option>
                  <option value="kz">Қазақша</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("settings.taxpayerType")}</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <select
                  value={taxpayerType}
                  onChange={(e) => setTaxpayerType(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("settings.notSpecified")}</option>
                  <option value="individual">{t("settings.individual")}</option>
                  <option value="sole_proprietor">{t("settings.soleProprietor")}</option>
                  <option value="legal_entity">{t("settings.legalEntity")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("settings.taxRegime")}</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <select
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("settings.notSpecified")}</option>
                  <option value="general">{t("settings.general")}</option>
                  <option value="simplified">{t("settings.simplified")}</option>
                  <option value="self_employed">{t("settings.selfEmployed")}</option>
                  <option value="farm">{t("settings.farm")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("settings.annualIncome")}</label>
              <MoneyInput
                value={annualIncome}
                onChange={setAnnualIncome}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("settings.activityType")}</label>
              <input
                type="text"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className={inputClassNoIcon}
                placeholder={t("settings.activityPlaceholder")}
              />
              {profile?.oked_code && (
                <div className={`mt-2 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                  profile.oked_banned
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {profile.oked_banned ? <ShieldAlert size={16} className="mt-0.5 shrink-0" /> : <ShieldCheck size={16} className="mt-0.5 shrink-0" />}
                  <div>
                    <span className="font-semibold">ОКЭД {profile.oked_code}</span>
                    {profile.oked_name && <span> — {profile.oked_name}</span>}
                    <p className="mt-0.5 text-xs opacity-75">
                      {profile.oked_banned
                        ? t("settings.okedBanned")
                        : t("settings.okedAllowed")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Employee salary groups */}
            {taxRegime !== "self_employed" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users size={16} className="text-muted-foreground" />
                    {t("settings.employees")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSalaryGroups([...salaryGroups, { salary: "", count: "1" }])}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <Plus size={14} />
                    {t("settings.addEmployees")}
                  </button>
                </div>
                {salaryGroups.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_100px_36px] gap-2 text-xs text-muted-foreground px-1">
                      <span>{t("settings.employeeSalary")}</span>
                      <span>{t("settings.employeeCount")}</span>
                      <span></span>
                    </div>
                    {salaryGroups.map((g, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_36px] gap-2">
                        <MoneyInput
                          value={g.salary}
                          onChange={(v) => {
                            const next = [...salaryGroups];
                            next[i] = { ...next[i], salary: v };
                            setSalaryGroups(next);
                          }}
                          className={inputClassNoIcon}
                        />
                        <input
                          type="number"
                          min="1"
                          value={g.count}
                          onChange={(e) => {
                            const next = [...salaryGroups];
                            next[i] = { ...next[i], count: e.target.value };
                            setSalaryGroups(next);
                          }}
                          className={inputClassNoIcon + " text-center"}
                        />
                        <button
                          type="button"
                          onClick={() => setSalaryGroups(salaryGroups.filter((_, j) => j !== i))}
                          className="rounded-xl p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl gradient-bg px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? t("settings.saving") : t("settings.save")}
              </button>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-medium"
                >
                  <CheckCircle2 size={16} />
                  {t("settings.saved")}
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
            {t("settings.logout")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
