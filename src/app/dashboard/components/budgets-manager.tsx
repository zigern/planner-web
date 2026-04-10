"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BudgetRow = {
  id: number;
  category: string;
  budgetAmount: number;
  spent: number;
};

const expenseCategories = ["Housing", "Personal", "Transportation", "Food", "Bills", "Pets", "Health", "Shopping", "Other"];

type Dict = {
  addTitle: string;
  listTitle: string;
  category: string;
  amount: string;
  save: string;
  saving: string;
  budgeted: string;
  spent: string;
  left: string;
  usage: string;
  status: string;
  action: string;
  remove: string;
  noItems: string;
  ok: string;
  warning: string;
  exceeded: string;
  saved: string;
  saveFail: string;
  removeFail: string;
  confirmRemove: string;
};

const textByLang: Record<string, Dict> = {
  "pt-PT": {
    addTitle: "Definir orçamento",
    listTitle: "Acompanhamento do mês",
    category: "Categoria",
    amount: "Valor orçamento",
    save: "Guardar orçamento",
    saving: "A guardar...",
    budgeted: "Orçado",
    spent: "Gasto",
    left: "Sobra",
    usage: "Uso",
    status: "Estado",
    action: "Ação",
    remove: "Anular",
    noItems: "Sem orçamentos para este mês.",
    ok: "OK",
    warning: "Alerta",
    exceeded: "Excedido",
    saved: "Orçamento guardado.",
    saveFail: "Falha ao guardar orçamento.",
    removeFail: "Falha ao anular orçamento.",
    confirmRemove: "Queres anular este orçamento?"
  },
  "en-US": {
    addTitle: "Set budget",
    listTitle: "Month tracking",
    category: "Category",
    amount: "Budget amount",
    save: "Save budget",
    saving: "Saving...",
    budgeted: "Budgeted",
    spent: "Spent",
    left: "Left",
    usage: "Usage",
    status: "Status",
    action: "Action",
    remove: "Cancel",
    noItems: "No budgets for this month.",
    ok: "OK",
    warning: "Warning",
    exceeded: "Exceeded",
    saved: "Budget saved.",
    saveFail: "Failed to save budget.",
    removeFail: "Failed to remove budget.",
    confirmRemove: "Do you want to remove this budget?"
  }
};

function formatMoney(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function BudgetsManager({
  lang,
  currency,
  month,
  initialRows
}: {
  lang: string;
  currency: string;
  month: string;
  initialRows: BudgetRow[];
}) {
  const router = useRouter();
  const t = textByLang[lang] || textByLang["en-US"];
  const [category, setCategory] = useState(expenseCategories[0]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          category,
          amount: Number(amount)
        })
      });

      if (!response.ok) {
        setMessage(t.saveFail);
        return;
      }

      setAmount("");
      setMessage(t.saved);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    const ok = window.confirm(t.confirmRemove);
    if (!ok) return;

    const response = await fetch(`/api/budgets/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      setMessage(t.removeFail);
      return;
    }

    router.refresh();
  }

  return (
    <div className="budgets-grid">
      <article className="panel">
        <div className="panel-head">
          <h3>{t.addTitle}</h3>
        </div>
        <form className="recurring-form" onSubmit={onSave}>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.category}</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {expenseCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="q-field">
              <span>{t.amount}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="recurring-actions">
            <button type="submit" disabled={loading}>
              {loading ? t.saving : t.save}
            </button>
          </div>
          {message ? <p className="q-msg">{message}</p> : null}
        </form>
      </article>

      <article className="panel budgets-list-panel">
        <div className="panel-head">
          <h3>{t.listTitle}</h3>
        </div>
        {initialRows.length ? (
          <div className="activity-table-wrap">
            <table className="activity-table budgets-table">
              <thead>
                <tr>
                  <th>{t.category}</th>
                  <th>{t.budgeted}</th>
                  <th>{t.spent}</th>
                  <th>{t.left}</th>
                  <th>{t.usage}</th>
                  <th>{t.status}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {initialRows.map((row) => {
                  const usage = row.budgetAmount > 0 ? (row.spent / row.budgetAmount) * 100 : 0;
                  const left = row.budgetAmount - row.spent;
                  const statusClass = usage >= 100 ? "out" : usage >= 80 ? "warn" : "in";
                  const statusText = usage >= 100 ? t.exceeded : usage >= 80 ? t.warning : t.ok;

                  return (
                    <tr key={row.id}>
                      <td>{row.category}</td>
                      <td>{formatMoney(row.budgetAmount, lang, currency)}</td>
                      <td className="money-out">{formatMoney(row.spent, lang, currency)}</td>
                      <td className={left >= 0 ? "money-in" : "money-out"}>
                        {formatMoney(Math.abs(left), lang, currency)}
                      </td>
                      <td>
                        <div className="budget-usage-cell">
                          <div className="budget-mini-track">
                            <div
                              className={statusClass}
                              style={{
                                width: `${Math.min(100, Math.max(0, usage))}%`
                              }}
                            />
                          </div>
                          <small>{Math.round(usage)}%</small>
                        </div>
                      </td>
                      <td>
                        <span className={`activity-kind ${statusClass}`}>{statusText}</span>
                      </td>
                      <td>
                        <button type="button" className="activity-delete-btn" onClick={() => onDelete(row.id)}>
                          {t.remove}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="activity-empty">{t.noItems}</p>
        )}
      </article>
    </div>
  );
}
