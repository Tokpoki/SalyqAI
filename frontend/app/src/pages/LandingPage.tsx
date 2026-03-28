import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, Search, FileText, ShieldCheck } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { login as loginApi } from "@/api/auth";

const features = [
  {
    icon: Search,
    title: "Поиск по НК РК",
    desc: "Ищем ответы напрямую в Налоговом кодексе Республики Казахстан",
  },
  {
    icon: FileText,
    title: "Обязательства",
    desc: "Определяем ваши налоговые обязательства на основе профиля",
  },
  {
    icon: ShieldCheck,
    title: "Ссылки на закон",
    desc: "Каждый ответ подкреплён конкретными статьями НК РК",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) navigate("/chat", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen">
      {/* Left: hero */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-1 flex-col justify-center px-8 py-12 md:px-16 lg:px-24"
      >
        <div className="flex items-center gap-2 mb-6">
          <Scale size={28} className="text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Salyq AI</h1>
        </div>

        <p className="mb-8 max-w-md text-lg text-muted-foreground leading-relaxed">
          Ваш персональный налоговый консультант на основе искусственного
          интеллекта. Задайте вопрос — получите ответ со ссылками на Налоговый
          кодекс РК.
        </p>

        <div className="space-y-5 max-w-md">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="flex items-start gap-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right: login form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden md:flex flex-1 items-center justify-center border-l bg-secondary/20 px-8"
      >
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Войти</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Введите данные для входа в систему
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Mobile: login link at bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 md:hidden">
        <Link
          to="/login"
          className="block w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
        >
          Войти
        </Link>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-primary">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    try {
      await loginApi(email, password);
      navigate("/chat", { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { status?: number };
      if (apiErr.status === 401) setError("Неверный email или пароль");
      else setError("Ошибка сервера. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Пароль</label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Вход..." : "Войти"}
      </button>
    </form>
  );
}

