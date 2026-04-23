"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "register") setMode("register");
  }, []);

  const isValid = useMemo(() => email.trim().length > 5 && password.length >= 6, [email, password]);

  async function submit() {
    if (!isValid || loading) return;

    setLoading(true);
    setMessage(null);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        setMessage(json.error || "Falha ao autenticar.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("Não foi possível ligar ao servidor. Tenta novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f4f7ff] via-white to-[#f8fbff] px-6 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/images/site-logo.png" alt="Planqly Assets" width={170} height={42} className="h-auto w-[150px]" priority />
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 transition hover:text-blue-600">
            ← Voltar ao site
          </Link>
        </div>

        <section className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_70px_-35px_rgba(37,99,235,0.45)] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative border-b border-slate-100 bg-slate-950 p-8 text-white sm:p-10 lg:border-b-0 lg:border-r lg:border-slate-800">
            <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

            <div className="relative">
              <span className="inline-flex rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
                Financial Dashboard Access
              </span>

              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                {mode === "login" ? "Bem-vindo de volta" : "Cria a tua conta"}
              </h1>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                {mode === "login"
                  ? "Entra para continuar a gerir finanças, acompanhar objetivos e exportar relatórios premium."
                  : "Começa em segundos e desbloqueia uma experiência completa para planeamento financeiro inteligente."}
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                {[
                  "Dashboard completo com indicadores em tempo real",
                  "Controlo de orçamento por categorias e metas",
                  "Exportação profissional para Excel e análises"
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-300">
                      ✓
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
                <Image
                  src="/images/landing/real/dashboard-preview.png"
                  alt="Preview do dashboard Planqly"
                  width={900}
                  height={560}
                  className="h-auto w-full rounded-xl border border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
              <button
                onClick={() => setMode("login")}
                className={`rounded-lg px-4 py-2 transition ${
                  mode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode("register")}
                className={`rounded-lg px-4 py-2 transition ${
                  mode === "register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Criar conta
              </button>
            </div>

            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
              {mode === "login" ? "Acede à tua conta" : "Regista-te gratuitamente"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {mode === "login"
                ? "Introduz os teus dados para continuar no dashboard."
                : "Cria o teu acesso para começar a planear melhor o teu dinheiro."}
            </p>

            <label className="mt-7 block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none ring-blue-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring"
              placeholder="teu@email.com"
              autoComplete="email"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none ring-blue-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring"
              placeholder="mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            <div className="mt-4 flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Lembrar-me
              </label>
              <button type="button" className="font-medium text-blue-600 hover:text-blue-700">
                Esqueci a password
              </button>
            </div>

            <button
              onClick={submit}
              disabled={loading || !isValid}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "A processar..." : mode === "login" ? "Entrar agora" : "Criar conta"}
            </button>

            {message ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>
            ) : null}

            <p className="mt-6 text-center text-sm text-slate-600">
              {mode === "login" ? "Ainda não tens conta? " : "Já tens conta? "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                {mode === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
