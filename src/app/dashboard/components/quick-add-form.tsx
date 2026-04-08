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

const expenseItems = [
  "Rent",
  "Utilities",
  "Internet",
  "Netflix",
  "Gym",
  "Fuel",
  "Groceries",
  "Transport Pass",
  "Pet Food",
  "Vet",
  "Other"
];

const incomeItems = ["Salary", "Freelance", "Bonus", "Business", "Other"];

export function QuickAddForm() {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Housing");
  const [item, setItem] = useState("Rent");
  const [monthlyFixed, setMonthlyFixed] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categories = type === "income" ? incomeCategories : expenseCategories;
  const items = type === "income" ? incomeItems : expenseItems;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const parsedAmount = Number(amount);
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          category: category.trim() || categories[0],
          description: item,
          transactionDate: date
        })
      });
      if (response.ok) {
        if (monthlyFixed) {
          await fetch("/api/recurring-rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              amount: parsedAmount,
              category: category.trim() || categories[0],
              description: item,
              dayOfMonth: Math.min(28, Math.max(1, Number(date.slice(8, 10))))
            })
          });
        }
        setAmount("");
        setCategory(categories[0]);
        setItem(items[0]);
        setMonthlyFixed(false);
        setMessage(monthlyFixed ? "Transação + regra mensal guardadas." : "Transação guardada.");
        router.refresh();
      } else {
        setMessage("Falha ao guardar.");
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
            setItem(nextType === "income" ? incomeItems[0] : expenseItems[0]);
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
      <div className="q-row">
        <select value={item} onChange={(e) => setItem(e.target.value)}>
          {items.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <label className="q-check">
          <input type="checkbox" checked={monthlyFixed} onChange={(e) => setMonthlyFixed(e.target.checked)} />
          {type === "income" ? "Salário/entrada fixa mensal" : "Despesa fixa mensal"}
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "A guardar..." : "Adicionar"}
      </button>
      {message ? <p className="q-msg">{message}</p> : null}
    </form>
  );
}
