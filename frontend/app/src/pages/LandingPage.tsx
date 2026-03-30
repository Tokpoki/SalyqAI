import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Scale,
  Search,
  FileText,
  ShieldCheck,
  Zap,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { useTranslation } from "@/i18n";

/* ────────── Helpers ────────── */

function FadeInWhenVisible({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ────────── Component ────────── */

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    if (isAuthenticated()) navigate("/chat", { replace: true });
  }, [navigate]);

  /* ────────── Data ────────── */

  const features = [
    { icon: Search, gradient: "from-emerald-500 to-teal-500", title: t("landing.feat1title"), desc: t("landing.feat1desc") },
    { icon: FileText, gradient: "from-teal-500 to-cyan-500", title: t("landing.feat2title"), desc: t("landing.feat2desc") },
    { icon: ShieldCheck, gradient: "from-cyan-500 to-sky-500", title: t("landing.feat3title"), desc: t("landing.feat3desc") },
    { icon: Zap, gradient: "from-sky-500 to-blue-500", title: t("landing.feat4title"), desc: t("landing.feat4desc") },
  ];

  const steps = [
    { num: "01", title: t("landing.step1title"), desc: t("landing.step1desc") },
    { num: "02", title: t("landing.step2title"), desc: t("landing.step2desc") },
    { num: "03", title: t("landing.step3title"), desc: t("landing.step3desc") },
  ];

  const stats = [
    { value: t("landing.stat1value"), label: t("landing.stat1label") },
    { value: t("landing.stat2value"), label: t("landing.stat2label") },
    { value: "24/7", label: t("landing.stat3label") },
    { value: "100%", label: t("landing.stat4label") },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ═══════════ Navbar ═══════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-light dark:glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg">
              <Scale size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Salyq AI</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("landing.login")}
            </Link>
            <Link
              to="/register"
              className="rounded-xl gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("landing.startFree")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ Hero ═══════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-[10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/5" />
          <div className="absolute -bottom-20 left-[10%] h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-500/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-teal-500/8 blur-[100px] dark:bg-teal-500/3" />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto max-w-5xl px-6 text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            <Sparkles size={14} />
            <span>{t("landing.badge")}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
          >
            {t("landing.title1")}
            <br />
            <span className="gradient-text">{t("landing.title2")}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            {t("landing.subtitle")}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              to="/register"
              className="group flex items-center gap-2 rounded-2xl gradient-bg px-8 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("landing.cta")}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-2xl border border-border bg-background/50 px-8 py-4 text-base font-semibold transition-all hover:bg-secondary hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageSquare size={18} />
              {t("landing.hasAccount")}
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8"
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold gradient-text sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={24} className="text-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ Features ═══════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <FadeInWhenVisible className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.featuresTitle")}{" "}
              <span className="gradient-text">{t("landing.featuresHighlight")}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              {t("landing.featuresSubtitle")}
            </p>
          </FadeInWhenVisible>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <FadeInWhenVisible key={i} delay={i * 0.1}>
                <div className="group relative h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg`}>
                    <f.icon size={22} className="text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ How it works ═══════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/3 h-[400px] w-[400px] rounded-full bg-teal-500/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6">
          <FadeInWhenVisible className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.howTitle")}{" "}
              <span className="gradient-text">{t("landing.howHighlight")}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {t("landing.howSubtitle")}
            </p>
          </FadeInWhenVisible>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <FadeInWhenVisible key={i} delay={i * 0.15}>
                <div className="relative text-center md:text-left">
                  <span className="text-6xl font-black gradient-text opacity-30">
                    {s.num}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Chat Preview ═══════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6">
          <FadeInWhenVisible>
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              {/* Window bar */}
              <div className="flex items-center gap-2 border-b border-border px-6 py-4">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-3 text-sm text-muted-foreground">{t("landing.chatTitle")}</span>
              </div>

              {/* Chat messages */}
              <div className="space-y-4 p-6">
                {/* User */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md gradient-bg px-5 py-3 text-sm text-white">
                    {t("landing.chatExample")}
                  </div>
                </div>

                {/* Assistant */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] space-y-3 rounded-2xl rounded-tl-md border border-border bg-secondary/50 px-5 py-4">
                    <p className="text-sm leading-relaxed">
                      {t("landing.chatAnswer")}
                    </p>
                    <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {t("landing.chatSource")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-border px-6 py-4">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <span className="flex-1 text-sm text-muted-foreground">
                    {t("chat.inputPlaceholder")}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <FadeInWhenVisible>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.ctaTitle")}{" "}
              <span className="gradient-text">{t("landing.ctaHighlight")}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {t("landing.ctaSubtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="group flex items-center gap-2 rounded-2xl gradient-bg px-8 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t("landing.ctaButton")}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-bg">
              <Scale size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold">Salyq AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Salyq AI. {t("landing.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
