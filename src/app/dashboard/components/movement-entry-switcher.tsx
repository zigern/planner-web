"use client";

import { useState } from "react";
import { QuickAddForm } from "./quick-add-form";
import { AddTransactionForm } from "./add-transaction-form";

const textByLang = {
  "pt-PT": {
    title: "Entrada de dados",
    quick: "Rápido",
    advanced: "Avançado",
    quickHint: "Inserção rápida para o dia a dia.",
    advancedHint: "Inserção completa com descrição e categoria livre."
  },
  "en-US": {
    title: "Data entry",
    quick: "Quick",
    advanced: "Advanced",
    quickHint: "Fast entry for day-to-day records.",
    advancedHint: "Full entry with description and custom category."
  }
} as const;

export function MovementEntrySwitcher({ lang = "pt-PT" }: { lang?: string }) {
  const text = textByLang[lang as keyof typeof textByLang] || textByLang["pt-PT"];
  const [mode, setMode] = useState<"quick" | "advanced">("quick");

  return (
    <section className="entry-switch">
      <div className="entry-tabbar" role="tablist" aria-label={text.title}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "quick"}
          className={`entry-tab ${mode === "quick" ? "active" : ""}`}
          onClick={() => setMode("quick")}
        >
          {text.quick}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "advanced"}
          className={`entry-tab ${mode === "advanced" ? "active" : ""}`}
          onClick={() => setMode("advanced")}
        >
          {text.advanced}
        </button>
      </div>

      <p className="entry-hint">{mode === "quick" ? text.quickHint : text.advancedHint}</p>

      {mode === "quick" ? <QuickAddForm lang={lang} /> : <AddTransactionForm lang={lang} />}
    </section>
  );
}

