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
  templateTitle: string;
  templateHint: string;
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
  insightsTitle: string;
  monthOverview: string;
  riskItems: string;
  healthyItems: string;
  totalBudgeted: string;
  totalSpent: string;
  totalLeft: string;
  projectedOverrun: string;
  topRisk: string;
  noRisk: string;
  recommendation: string;
  recommendTighten: string;
  recommendRebalance: string;
  recommendHealthy: string;
};

const textByLang: Record<string, Dict> = {
  "pt-PT": {
    addTitle: "Definir orçamento",
    listTitle: "Acompanhamento do mês",
    templateTitle: "Templates rápidos",
    templateHint: "Escolhe um valor base para começar mais rápido.",
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
    confirmRemove: "Queres anular este orçamento?",
    insightsTitle: "Insights automáticos",
    monthOverview: "Resumo do mês",
    riskItems: "Categorias em risco",
    healthyItems: "Categorias saudáveis",
    totalBudgeted: "Total orçado",
    totalSpent: "Total gasto",
    totalLeft: "Total disponível",
    projectedOverrun: "Risco de derrapagem",
    topRisk: "Maior risco",
    noRisk: "Sem risco crítico",
    recommendation: "Recomendação",
    recommendTighten: "Ajusta os limites das categorias acima de 90% para evitar ultrapassar o orçamento.",
    recommendRebalance: "Considera transferir parte do orçamento das categorias com baixa utilização para as categorias em risco.",
    recommendHealthy: "O mês está equilibrado. Mantém o ritmo e revê apenas categorias com baixa execução."
  },
  "en-US": {
    addTitle: "Set budget",
    listTitle: "Month tracking",
    templateTitle: "Quick templates",
    templateHint: "Choose a starter amount for faster setup.",
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
    confirmRemove: "Do you want to remove this budget?",
    insightsTitle: "Automatic insights",
    monthOverview: "Month overview",
    riskItems: "Risk categories",
    healthyItems: "Healthy categories",
    totalBudgeted: "Total budgeted",
    totalSpent: "Total spent",
    totalLeft: "Total left",
    projectedOverrun: "Overrun risk",
    topRisk: "Top risk",
    noRisk: "No critical risk",
    recommendation: "Recommendation",
    recommendTighten: "Adjust categories above 90% usage to avoid going over budget.",
    recommendRebalance: "Consider moving part of the budget from low-usage categories to risk categories.",
    recommendHealthy: "Month is balanced. Keep current pace and review only low-execution categories."
  }
};

type BudgetTemplate = {
  id: string;
  category: string;
  amount: number;
  labelPt: string;
  labelEn: string;
};

const budgetTemplates: BudgetTemplate[] = [
  { id: "housing", category: "Housing", amount: 650, labelPt: "Habitação", labelEn: "Housing" },
  { id: "food", category: "Food", amount: 350, labelPt: "Comida", labelEn: "Food" },
  { id: "transport", category: "Transportation", amount: 180, labelPt: "Transporte", labelEn: "Transport" },
  { id: "bills", category: "Bills", amount: 220, labelPt: "Contas", labelEn: "Bills" },
  { id: "health", category: "Health", amount: 120, labelPt: "Saúde", labelEn: "Health" },
  { id: "shopping", category: "Shopping", amount: 150, labelPt: "Compras", labelEn: "Shopping" }
];

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
  initialRows,
  prefillCategory = "",
  periodLabel = ""
}: {
  lang: string;
  currency: string;
  month: string;
  initialRows: BudgetRow[];
  prefillCategory?: string;
  periodLabel?: string;
}) {
  const router = useRouter();
  const t = textByLang[lang] || textByLang["en-US"];
  const categories = expenseCategories.includes(prefillCategory)
    ? expenseCategories
    : prefillCategory
      ? [prefillCategory, ...expenseCategories]
      : expenseCategories;
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const budgetMetrics = initialRows.reduce(
    (acc, row) => {
      const budgetAmount = Math.max(0, row.budgetAmount);
      const spentAmount = Math.max(0, row.spent);
      const usage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      acc.totalBudgeted += budgetAmount;
      acc.totalSpent += spentAmount;
      if (usage >= 90) {
        acc.riskRows.push({ ...row, usage });
      } else {
        acc.healthyCount += 1;
      }
      return acc;
    },
    {
      totalBudgeted: 0,
      totalSpent: 0,
      healthyCount: 0,
      riskRows: [] as Array<BudgetRow & { usage: number }>
    }
  );
  budgetMetrics.riskRows.sort((a, b) => b.usage - a.usage);
  const projectedOverrun =
    budgetMetrics.totalBudgeted > 0 ? (budgetMetrics.totalSpent / budgetMetrics.totalBudgeted) * 100 : 0;
  const topRisk = budgetMetrics.riskRows[0];
  const totalLeft = Math.max(0, budgetMetrics.totalBudgeted - budgetMetrics.totalSpent);

  function applyTemplate(template: BudgetTemplate) {
    setCategory(template.category);
    setAmount(template.amount.toFixed(2));
    setMessage(null);
  }

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
        <div className="budget-templates">
          <p className="budget-templates-title">{t.templateTitle}</p>
          <p className="budget-templates-hint">{t.templateHint}</p>
          <div className="budget-template-list">
            {budgetTemplates.map((template) => (
              <button key={template.id} type="button" className="budget-template-btn" onClick={() => applyTemplate(template)}>
                {lang === "pt-PT" ? template.labelPt : template.labelEn}
              </button>
            ))}
          </div>
        </div>
        <form className="recurring-form" onSubmit={onSave}>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.category}</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((item) => (
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
        {periodLabel ? <p className="budgets-period-label">{periodLabel}</p> : null}
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

      <article className="panel budgets-insights-panel">
        <div className="panel-head">
          <h3>{t.insightsTitle}</h3>
        </div>
        <div className="budget-insight-grid">
          <div className="budget-insight-card">
            <p>{t.monthOverview}</p>
            <dl>
              <div>
                <dt>{t.totalBudgeted}</dt>
                <dd>{formatMoney(budgetMetrics.totalBudgeted, lang, currency)}</dd>
              </div>
              <div>
                <dt>{t.totalSpent}</dt>
                <dd className="money-out">{formatMoney(budgetMetrics.totalSpent, lang, currency)}</dd>
              </div>
              <div>
                <dt>{t.totalLeft}</dt>
                <dd className={totalLeft > 0 ? "money-in" : "money-out"}>{formatMoney(totalLeft, lang, currency)}</dd>
              </div>
            </dl>
          </div>

          <div className="budget-insight-card">
            <p>{t.projectedOverrun}</p>
            <div className="budget-insight-track">
              <div style={{ width: `${Math.min(100, Math.max(0, projectedOverrun))}%` }} />
            </div>
            <strong>{Math.round(projectedOverrun)}%</strong>
            <small>
              {budgetMetrics.riskRows.length > 0
                ? `${t.riskItems}: ${budgetMetrics.riskRows.length}`
                : `${t.healthyItems}: ${budgetMetrics.healthyCount}`}
            </small>
          </div>

          <div className="budget-insight-card">
            <p>{t.topRisk}</p>
            <strong>{topRisk ? topRisk.category : t.noRisk}</strong>
            <small>{topRisk ? `${Math.round(topRisk.usage)}%` : "0%"}</small>
            <p className="budget-reco">
              {budgetMetrics.riskRows.length >= 3
                ? t.recommendTighten
                : budgetMetrics.riskRows.length > 0
                  ? t.recommendRebalance
                  : t.recommendHealthy}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
