"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuickAddForm() {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          category: category.trim() || (type === "income" ? "Income" : "Expense"),
          description: "",
          transactionDate: date
        })
      });
      if (response.ok) {
        setAmount("");
        setCategory("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="quick-form" onSubmit={onSubmit}>
      <div className="q-row">
        <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="q-row">
        <input
          placeholder="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "A guardar..." : "Adicionar"}
      </button>
    </form>
  );
}

