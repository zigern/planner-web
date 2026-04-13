"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedDemoButton({
  lang,
  selectedMonth
}: {
  lang: string;
  selectedMonth: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const isPt = lang === "pt-PT";
  const label = loading
    ? isPt
      ? "A gerar..."
      : "Generating..."
    : isPt
      ? "Gerar dados demo (12 meses)"
      : "Generate demo data (12 months)";

  async function onGenerate() {
    if (loading) return;
    const ok = window.confirm(
      isPt
        ? "Isto vai substituir os teus dados atuais por dados fictícios. Continuar?"
        : "This will replace your current data with demo data. Continue?"
    );
    if (!ok) return;

    setLoading(true);
    setMessage("");
    try {
      const year = Number(selectedMonth.split("-")[0]) || new Date().getFullYear();
      const response = await fetch("/api/demo/seed-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, replace: true })
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(isPt ? "Falha ao gerar dados demo." : "Failed to generate demo data.");
        return;
      }
      setMessage(isPt ? "Dados demo gerados com sucesso." : "Demo data generated successfully.");
      router.refresh();
    } catch {
      setMessage(isPt ? "Falha ao gerar dados demo." : "Failed to generate demo data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="demo-seed-wrap">
      <button type="button" className="btn" onClick={onGenerate} disabled={loading}>
        {label}
      </button>
      {message ? <small className="q-msg">{message}</small> : null}
    </div>
  );
}
