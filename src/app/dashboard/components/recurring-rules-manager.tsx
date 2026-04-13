"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { translateExpenseCategory } from "../utils/category-translation";

type RecurringRule = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  dayOfMonth: number;
  lastAppliedMonth: string | null;
};

type Dict = {
  modeTitle: string;
  createTitle: string;
  applyTitle: string;
  templateTitle: string;
  templateHint: string;
  type: string;
  income: string;
  expense: string;
  amount: string;
  category: string;
  item: string;
  day: string;
  add: string;
  applying: string;
  applyBtn: string;
  noRules: string;
  activeRules: string;
  applied: string;
  never: string;
  remove: string;
  createOk: string;
  createFail: string;
  applyOk: string;
  applyNone: string;
  applyFail: string;
  removeFail: string;
  confirmRemove: string;
};

const textByLang: Record<string, Dict> = {
  "pt-PT": {
    modeTitle: "Recorrentes",
    createTitle: "Nova regra mensal",
    applyTitle: "Aplicar regras ao mês",
    templateTitle: "Templates rápidos",
    templateHint: "Seleciona um template para pré-preencher os campos.",
    type: "Tipo",
    income: "Receita",
    expense: "Despesa",
    amount: "Valor",
    category: "Categoria",
    item: "Descrição (opcional)",
    day: "Dia do mês",
    add: "Guardar regra",
    applying: "A aplicar...",
    applyBtn: "Aplicar recorrentes",
    noRules: "Sem regras recorrentes ativas.",
    activeRules: "Regras ativas",
    applied: "Último mês aplicado",
    never: "Nunca",
    remove: "Anular",
    createOk: "Regra recorrente criada.",
    createFail: "Não foi possível criar a regra.",
    applyOk: "Regras aplicadas ao mês com sucesso.",
    applyNone: "Não há regras novas para aplicar neste mês.",
    applyFail: "Falha ao aplicar recorrentes.",
    removeFail: "Não foi possível anular a regra.",
    confirmRemove: "Queres anular esta regra recorrente?"
  },
  "en-US": {
    modeTitle: "Recurring",
    createTitle: "New monthly rule",
    applyTitle: "Apply rules to month",
    templateTitle: "Quick templates",
    templateHint: "Pick a template to prefill the rule.",
    type: "Type",
    income: "Income",
    expense: "Expense",
    amount: "Amount",
    category: "Category",
    item: "Description (optional)",
    day: "Day of month",
    add: "Save rule",
    applying: "Applying...",
    applyBtn: "Apply recurring",
    noRules: "No active recurring rules.",
    activeRules: "Active rules",
    applied: "Last applied month",
    never: "Never",
    remove: "Cancel",
    createOk: "Recurring rule created.",
    createFail: "Could not create recurring rule.",
    applyOk: "Rules applied to selected month.",
    applyNone: "No new rules to apply for this month.",
    applyFail: "Failed to apply recurring rules.",
    removeFail: "Could not cancel this rule.",
    confirmRemove: "Do you want to cancel this recurring rule?"
  }
};

const expenseCategories = ["Housing", "Personal", "Transportation", "Food", "Bills", "Pets", "Health", "Shopping", "Other"];
const incomeCategories = ["Salary", "Freelance", "Business", "Investments", "Bonus", "Other"];

type RecurringTemplate = {
  id: string;
  label: string;
  type: "income" | "expense";
  category: string;
  description: string;
  dayOfMonth: number;
  amount: number;
};

const recurringTemplates: RecurringTemplate[] = [
  {
    id: "salary",
    label: "Salário",
    type: "income",
    category: "Salary",
    description: "Salário mensal",
    dayOfMonth: 1,
    amount: 1300
  },
  {
    id: "rent",
    label: "Renda",
    type: "expense",
    category: "Housing",
    description: "Renda",
    dayOfMonth: 1,
    amount: 650
  },
  {
    id: "electricity",
    label: "Luz",
    type: "expense",
    category: "Bills",
    description: "Eletricidade",
    dayOfMonth: 5,
    amount: 55
  },
  {
    id: "water",
    label: "Água",
    type: "expense",
    category: "Bills",
    description: "Água",
    dayOfMonth: 6,
    amount: 25
  },
  {
    id: "internet",
    label: "Internet",
    type: "expense",
    category: "Bills",
    description: "Internet",
    dayOfMonth: 7,
    amount: 35
  },
  {
    id: "netflix",
    label: "Netflix",
    type: "expense",
    category: "Bills",
    description: "Netflix",
    dayOfMonth: 8,
    amount: 12.99
  },
  {
    id: "gym",
    label: "Ginásio",
    type: "expense",
    category: "Health",
    description: "Ginásio",
    dayOfMonth: 10,
    amount: 35
  }
];

function formatMoney(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function RecurringRulesManager({
  lang,
  currency,
  selectedMonth,
  initialRules
}: {
  lang: string;
  currency: string;
  selectedMonth: string;
  initialRules: RecurringRule[];
}) {
  const router = useRouter();
  const t = textByLang[lang] || textByLang["en-US"];

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Housing");
  const [description, setDescription] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categories = useMemo(() => (type === "expense" ? expenseCategories : incomeCategories), [type]);
  const templates = useMemo(
    () =>
      recurringTemplates.map((template) => ({
        ...template,
        label: lang === "pt-PT" ? template.label : template.id === "salary" ? "Salary" : template.label
      })),
    [lang]
  );

  function applyTemplate(template: RecurringTemplate) {
    setType(template.type);
    setCategory(template.category);
    setDescription(template.description);
    setDayOfMonth(String(template.dayOfMonth));
    setAmount(template.amount.toFixed(2));
    setMessage(null);
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/recurring-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          category,
          description: description.trim() || null,
          dayOfMonth: Number(dayOfMonth)
        })
      });

      if (!response.ok) {
        setMessage(t.createFail);
        return;
      }

      setAmount("");
      setDescription("");
      setDayOfMonth("1");
      setMessage(t.createOk);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function applyRules() {
    if (applying) return;
    setApplying(true);
    setMessage(null);
    try {
      const response = await fetch("/api/recurring-rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth })
      });

      if (!response.ok) {
        setMessage(t.applyFail);
        return;
      }

      const json = (await response.json()) as { inserted?: number };
      if ((json.inserted || 0) > 0) {
        setMessage(t.applyOk);
      } else {
        setMessage(t.applyNone);
      }
      router.refresh();
    } finally {
      setApplying(false);
    }
  }

  async function removeRule(id: number) {
    const ok = window.confirm(t.confirmRemove);
    if (!ok) return;

    const response = await fetch(`/api/recurring-rules/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage(t.removeFail);
      return;
    }

    router.refresh();
  }

  return (
    <div className="recurring-grid">
      <article className="panel">
        <div className="panel-head">
          <h3>{t.createTitle}</h3>
        </div>
        <div className="recurring-templates">
          <p className="recurring-templates-title">{t.templateTitle}</p>
          <p className="recurring-templates-hint">{t.templateHint}</p>
          <div className="recurring-template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="recurring-template-btn"
                onClick={() => applyTemplate(template)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
        <form className="recurring-form" onSubmit={createRule}>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.type}</span>
              <select
                value={type}
                onChange={(e) => {
                  const nextType = e.target.value as "income" | "expense";
                  setType(nextType);
                  setCategory(nextType === "expense" ? "Housing" : "Salary");
                }}
              >
                <option value="expense">{t.expense}</option>
                <option value="income">{t.income}</option>
              </select>
            </label>
            <label className="q-field">
              <span>{t.amount}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="q-grid">
            <label className="q-field">
              <span>{t.category}</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {type === "expense" ? translateExpenseCategory(item, lang) : item}
                  </option>
                ))}
              </select>
            </label>
            <label className="q-field">
              <span>{t.day}</span>
              <input
                type="number"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="q-field">
            <span>{t.item}</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="recurring-actions">
            <button type="submit" disabled={loading}>
              {loading ? t.applying : t.add}
            </button>
            <button type="button" className="btn-recurring-apply" onClick={applyRules} disabled={applying}>
              {applying ? t.applying : `${t.applyBtn} (${selectedMonth})`}
            </button>
          </div>

          {message ? <p className="q-msg">{message}</p> : null}
        </form>
      </article>

      <article className="panel recurring-list-panel">
        <div className="panel-head">
          <h3>{t.activeRules}</h3>
        </div>
        <ul className="recurring-list">
          {initialRules.length ? (
            initialRules.map((rule) => (
              <li key={rule.id}>
                <div>
                  <b>
                    {rule.type === "income" ? t.income : t.expense} ·{" "}
                    {rule.type === "expense" ? translateExpenseCategory(rule.category, lang) : rule.category}
                  </b>
                  <p>
                    {rule.description || "—"} · {t.day.toLowerCase()} {rule.dayOfMonth} · {t.applied}:{" "}
                    {rule.lastAppliedMonth || t.never}
                  </p>
                </div>
                <strong className={rule.type === "income" ? "money-in" : "money-out"}>
                  {rule.type === "income" ? "+" : "-"}
                  {formatMoney(Math.abs(rule.amount), lang, currency)}
                </strong>
                <button type="button" className="activity-delete-btn" onClick={() => removeRule(rule.id)}>
                  {t.remove}
                </button>
              </li>
            ))
          ) : (
            <li className="recurring-empty">{t.noRules}</li>
          )}
        </ul>
      </article>
    </div>
  );
}
