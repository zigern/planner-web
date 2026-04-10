"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCategoriesForType } from "@/lib/finance/categories";

const textByLang = {
  "pt-PT": {
    type: "Tipo",
    income: "Receita",
    expense: "Despesa",
    amount: "Valor",
    category: "Categoria",
    categoryCustom: "Outra (escrever)",
    categoryCustomPlaceholder: "Escreve a categoria",
    date: "Data",
    description: "Descrição (opcional)",
    submit: "Guardar movimento",
    loading: "A guardar...",
    ok: "Movimento guardado.",
    fail: "Falha ao criar movimento."
  },
  "en-US": {
    type: "Type",
    income: "Income",
    expense: "Expense",
    amount: "Amount",
    category: "Category",
    categoryCustom: "Other (type)",
    categoryCustomPlaceholder: "Type category",
    date: "Date",
    description: "Description (optional)",
    submit: "Save movement",
    loading: "Saving...",
    ok: "Movement saved.",
    fail: "Failed to create movement."
  }
} as const;

export function AddTransactionForm({ lang = "pt-PT" }: { lang?: string }) {
  const router = useRouter();
  const text = textByLang[lang as keyof typeof textByLang] || textByLang["pt-PT"];
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(getCategoriesForType("expense")[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categories = useMemo(() => getCategoriesForType(type), [type]);
  const selectedCategory = category === "__custom__" ? customCategory.trim() : category;

  function onTypeChange(nextType: "income" | "expense") {
    setType(nextType);
    const nextCategories = getCategoriesForType(nextType);
    setCategory(nextCategories[0]);
    setCustomCategory("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        amount: Number(amount),
        category: selectedCategory,
        description,
        transactionDate
      })
    });

    const json = await res.json();

    if (!res.ok) {
      setMessage(json.error || text.fail);
      setLoading(false);
      return;
    }

    setAmount("");
    setCategory(categories[0]);
    setCustomCategory("");
    setDescription("");
    setMessage(text.ok);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="quick-form">
      <div className="q-grid">
        <label className="q-field">
          <span>{text.type}</span>
          <select value={type} onChange={(e) => onTypeChange(e.target.value as "income" | "expense")}>
            <option value="expense">{text.expense}</option>
            <option value="income">{text.income}</option>
          </select>
        </label>
        <label className="q-field">
          <span>{text.amount}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={text.amount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="q-field">
          <span>{text.category}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="__custom__">{text.categoryCustom}</option>
          </select>
        </label>
        <label className="q-field">
          <span>{text.date}</span>
          <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
        </label>
      </div>
      {category === "__custom__" ? (
        <label className="q-field">
          <span>{text.category}</span>
          <input
            placeholder={text.categoryCustomPlaceholder}
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            required
          />
        </label>
      ) : null}
      <label className="q-field">
        <span>{text.description}</span>
        <textarea
          placeholder={text.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </label>
      <div className="q-inline">
        <div className="q-check q-check-inline">{type === "income" ? text.income : text.expense}</div>
        <button type="submit" disabled={loading || !selectedCategory}>
          {loading ? text.loading : text.submit}
        </button>
      </div>
      {message ? <p className="q-msg">{message}</p> : null}
    </form>
  );
}
