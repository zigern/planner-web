"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PwaInstallButton } from "@/components/pwa-install-button";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "register") setMode("register");
  }, []);

  const isValid = useMemo(() => {
    if (email.trim().length <= 5 || password.length < 6) return false;
    if (mode === "register") {
      return displayName.trim().length >= 2 && confirmPassword.length >= 6;
    }
    return true;
  }, [confirmPassword.length, displayName, email, mode, password.length]);

  async function submit() {
    if (!isValid || loading) return;

    setLoading(true);
    setMessage(null);

    if (mode === "register" && password !== confirmPassword) {
      setMessage("As passwords não coincidem.");
      setLoading(false);
      return;
    }

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email: email.trim(), password }
        : { email: email.trim(), password, displayName: displayName.trim() };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#eef4ff] via-white to-[#f3f8ff] px-6 py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[480px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/site-logo.png" alt="Planqly Assets" width={168} height={40} className="h-auto w-[150px]" priority />
          </Link>
          <Link href="/" className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-blue-600">
            ← Voltar
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-[0_35px_70px_-35px_rgba(37,99,235,0.45)] backdrop-blur sm:p-8">
          <div className="mb-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            Secure Login
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
            <button
              onClick={() => setMode("login")}
              className={`rounded-lg px-4 py-2.5 transition ${
                mode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-lg px-4 py-2.5 transition ${
                mode === "register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Criar conta
            </button>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {mode === "login" ? "Acede à tua conta" : "Cria a tua conta"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {mode === "login"
              ? "Entra para continuar no teu dashboard financeiro."
              : "Regista-te para começares a gerir as tuas finanças."}
          </p>

          <form onSubmit={onSubmit} className="mt-6">
            <label className="block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-blue-200 focus:border-blue-400 focus:ring"
              autoComplete="email"
            />

            {mode === "register" ? (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Nome a mostrar</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-blue-200 focus:border-blue-400 focus:ring"
                  autoComplete="name"
                />
              </>
            ) : null}

            <label className="mt-4 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-blue-200 focus:border-blue-400 focus:ring"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
              >
                {showPassword ? "Ocultar password" : "Mostrar password"}
              </button>
            </div>

            {mode === "register" ? (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Confirmar password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-blue-200 focus:border-blue-400 focus:ring"
                  autoComplete="new-password"
                />
              </>
            ) : null}

            <div className="mt-4 flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Lembrar-me
              </label>
              <button type="button" className="font-medium text-blue-600 transition hover:text-blue-700">
                Esqueci a password
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            {message ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>
            ) : null}
          </form>

          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Dados protegidos e sessão segura.
          </div>
          <div className="mt-4">
            <PwaInstallButton />
          </div>

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
