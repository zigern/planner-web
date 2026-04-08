"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const expenseCategories = [
  "Housing",
  "Personal",
  "Transportation",
  "Food",
  "Bills",
  "Pets",
  "Health",
  "Shopping",
  "Other"
];

const incomeCategories = ["Salary", "Freelance", "Business", "Investments", "Bonus", "Other"];

export function QuickAddForm() {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Housing");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const categories = type === "income" ? incomeCategories : expenseCategories;

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
          category: category.trim() || categories[0],
          description: "",
          transactionDate: date
        })
      });
      if (response.ok) {
        setAmount("");
        setCategory(categories[0]);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="quick-form" onSubmit={onSubmit}>
      <div className="q-row">
        <select
          value={type}
          onChange={(e) => {
            const nextType = e.target.value as "income" | "expense";
            setType(nextType);
            setCategory(nextType === "income" ? incomeCategories[0] : expenseCategories[0]);
          }}
        >
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
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "A guardar..." : "Adicionar"}
      </button>
    </form>
  );
}
