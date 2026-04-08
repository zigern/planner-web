"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCategoriesForType } from "@/lib/finance/categories";

export function AddTransactionForm() {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salário");
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
      setMessage(json.error || "Falha ao criar transação.");
      setLoading(false);
      return;
    }

    setAmount("");
    setCategory(categories[0]);
    setCustomCategory("");
    setDescription("");
    setMessage("Transação adicionada.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Nova transação</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as "income" | "expense")}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value="__custom__">Outro (escrever)</option>
        </select>
        <input
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>
      {category === "__custom__" ? (
        <input
          placeholder="Escreve a categoria"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      ) : null}
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
        rows={2}
      />
      <button
        type="submit"
        disabled={loading || !selectedCategory}
        className="mt-3 rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A guardar..." : "Adicionar"}
      </button>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
