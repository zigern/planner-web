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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-gradient-to-b from-[#f4f7ff] via-white to-[#f8fbff] px-6 py-10">
      <div className="mx-auto w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/site-logo.png" alt="Planqly Assets" width={160} height={40} className="h-auto w-[145px]" priority />
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-blue-600">
            Voltar
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_30px_60px_-35px_rgba(37,99,235,0.5)] sm:p-8">
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

          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            {mode === "login" ? "Acede à tua conta" : "Cria a tua conta"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "login"
              ? "Entra para continuar no teu dashboard financeiro."
              : "Regista-te para começares a gerir as tuas finanças."}
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
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none ring-blue-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring"
              placeholder="mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-blue-600"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button
            onClick={submit}
            disabled={loading || !isValid}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}
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
        </section>
      </div>
    </main>
  );
}
