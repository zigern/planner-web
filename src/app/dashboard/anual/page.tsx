import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { DashboardSidebar } from "../components/sidebar-nav";
import "../dashboard-theme.css";

type YearSummaryRow = { month: string; income: string; expense: string };
type CategoryRow = { category: string; total: string };

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function parseLangParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "en-US";
  const allowed = new Set(["pt-PT", "en-US", "es-ES", "fr-FR"]);
  return allowed.has(raw) ? raw : "en-US";
}

function parseCurrencyParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "USD";
  const allowed = new Set(["EUR", "USD", "GBP", "BRL"]);
  return allowed.has(raw) ? raw : "USD";
}

function fmt(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function monthName(isoMonth: string, lang: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(lang, { month: "short" });
}

async function safeQueryRows<T>(db: ReturnType<typeof getDb>, sql: string, params: unknown[]): Promise<T[]> {
  try {
    const [rows] = await db.query(sql, params);
    return rows as T[];
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      ((error as { code?: string }).code === "ER_NO_SUCH_TABLE" ||
        (error as { code?: string }).code === "ER_BAD_FIELD_ERROR")
    ) {
      return [];
    }
    throw error;
  }
}

function getText(lang: string) {
  if (lang === "pt-PT") {
    return {
      title: "Resumo anual",
      subtitle: "Visão consolidada por mês para decisões rápidas",
      kpiIncome: "Receita anual",
      kpiExpense: "Despesa anual",
      kpiSavings: "Poupança anual",
      kpiBurn: "Taxa média de despesas",
      month: "Mês",
      income: "Receita",
      expense: "Despesa",
      savings: "Poupança",
      chart: "Receita vs Despesa (ano)",
      breakdown: "Categorias com mais despesa",
      none: "Sem dados para este ano",
      export: "Ir para Spreadsheet",
      period: "Período"
    };
  }

  return {
    title: "Annual overview",
    subtitle: "Consolidated monthly view for faster decisions",
    kpiIncome: "Yearly income",
    kpiExpense: "Yearly expenses",
    kpiSavings: "Yearly savings",
    kpiBurn: "Avg expense ratio",
    month: "Month",
    income: "Income",
    expense: "Expense",
    savings: "Savings",
    chart: "Income vs Expense (year)",
    breakdown: "Top spending categories",
    none: "No data for this year",
    export: "Open Spreadsheet",
    period: "Period"
  };
}

export default async function AnnualOverviewPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string | string[]; lang?: string | string[]; currency?: string | string[] }>;
}) {
  if (!hasDatabaseConfig() || !process.env.AUTH_SECRET) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-bold text-amber-900">Falta configurar MySQL/Auth</h1>
          <p className="mt-3 text-amber-800">Configura as variáveis de ambiente e volta a carregar.</p>
        </section>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const selectedMonth = parseMonthParam(params?.month);
  const [selectedYear] = selectedMonth.split("-");
  const selectedMonthPart = selectedMonth.split("-")[1] || "01";
  const lang = parseLangParam(params?.lang);
  const currency = parseCurrencyParam(params?.currency);
  const text = getText(lang);

  const db = getDb();
  const monthlyRows = await safeQueryRows<YearSummaryRow>(
    db,
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y') = ?
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY month ASC`,
    [user.userId, selectedYear]
  );

  const categoryRows = await safeQueryRows<CategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE_FORMAT(transaction_date, '%Y') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 8`,
    [user.userId, selectedYear]
  );

  const map = new Map(monthlyRows.map((row) => [row.month, row]));
  const months = Array.from({ length: 12 }).map((_, index) => {
    const iso = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
    const row = map.get(iso);
    const income = Number(row?.income || 0);
    const expense = Number(row?.expense || 0);
    return {
      iso,
      label: monthName(iso, lang),
      income,
      expense,
      savings: income - expense
    };
  });

  const annualIncome = months.reduce((sum, m) => sum + m.income, 0);
  const annualExpense = months.reduce((sum, m) => sum + m.expense, 0);
  const annualSavings = annualIncome - annualExpense;
  const burnRatio = annualIncome > 0 ? (annualExpense / annualIncome) * 100 : 0;
  const maxValue = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const initials = user.email.slice(0, 2).toUpperCase();
  const selectedYearNum = Number(selectedYear);
  const yearChoices = Array.from({ length: 4 }).map((_, index) => selectedYearNum - index);
  const periodLabel = `${selectedYear}-01-01 → ${selectedYear}-12-31`;

  return (
    <div className="casha-wrap">
      <div className="casha-shell">
        <div className="app-top">
          <div className="app-brand">
            <div className="logo-box">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 6h14v2H5zm0 5h10v2H5zm0 5h14v2H5z" fill="currentColor" />
              </svg>
            </div>
            <span>Casha</span>
          </div>
          <div className="top-actions">
            <div className="search-box">{selectedYear}</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{initials}</div>
            <LogoutButton className="logout-light" label={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          </div>
        </div>

        <div className="workspace-shell">
          <DashboardSidebar current="annual" selectedMonth={selectedMonth} lang={lang} currency={currency} />

          <main className="dash-main annual-mode">
            <section className="annual-header">
              <div className="annual-header-text">
                <h1 className="annual-title">{text.title}</h1>
                <p className="annual-subtitle">{text.subtitle}</p>
                <p className="budgets-period-label annual-period-label">{text.period}: {periodLabel}</p>
              </div>
              <div className="annual-header-actions">
                <div className="activity-preset-group annual-year-group" aria-label="Year quick selector">
                  {yearChoices.map((year) => {
                    const href = `/dashboard/anual?month=${year}-${selectedMonthPart}&lang=${lang}&currency=${currency}`;
                    const isActive = String(year) === selectedYear;
                    return (
                      <Link key={year} className={`activity-preset ${isActive ? "active" : ""}`} href={href}>
                        {year}
                      </Link>
                    );
                  })}
                </div>
                <Link className="btn annual-export-btn" href={`/dashboard/spreadsheet?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                  {text.export}
                </Link>
              </div>
            </section>

            <section className="annual-kpis">
              <article className="panel annual-kpi-card annual-kpi-income">
                <div className="panel-head"><h3>{text.kpiIncome}</h3></div>
                <p className="annual-kpi-value">{fmt(annualIncome, lang, currency)}</p>
              </article>
              <article className="panel annual-kpi-card annual-kpi-expense">
                <div className="panel-head"><h3>{text.kpiExpense}</h3></div>
                <p className="annual-kpi-value">{fmt(annualExpense, lang, currency)}</p>
              </article>
              <article className="panel annual-kpi-card annual-kpi-savings">
                <div className="panel-head"><h3>{text.kpiSavings}</h3></div>
                <p className="annual-kpi-value">{fmt(annualSavings, lang, currency)}</p>
              </article>
              <article className="panel annual-kpi-card annual-kpi-burn">
                <div className="panel-head"><h3>{text.kpiBurn}</h3></div>
                <p className="annual-kpi-value">{pct(burnRatio)}</p>
              </article>
            </section>

            <section className="annual-grid">
              <article className="panel annual-chart">
                <div className="panel-head"><h3>{text.chart}</h3></div>
                {months.some((m) => m.income > 0 || m.expense > 0) ? (
                  <div className="annual-bars">
                    {months.map((month) => (
                      <div key={month.iso} className="annual-bar-col">
                        <div className="annual-bar-stack">
                          <div className="annual-bar income" style={{ height: `${Math.max((month.income / maxValue) * 150, month.income > 0 ? 6 : 0)}px` }} title={`${text.income}: ${fmt(month.income, lang, currency)}`} />
                          <div className="annual-bar expense" style={{ height: `${Math.max((month.expense / maxValue) * 150, month.expense > 0 ? 6 : 0)}px` }} title={`${text.expense}: ${fmt(month.expense, lang, currency)}`} />
                        </div>
                        <small>{month.label}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="activity-empty">{text.none}</p>
                )}
              </article>

              <article className="panel annual-breakdown">
                <div className="panel-head"><h3>{text.breakdown}</h3></div>
                {categoryRows.length ? (
                  <ul className="breakdown-list">
                    {categoryRows.map((row) => {
                      const total = Number(row.total || 0);
                      const pctValue = annualExpense > 0 ? Math.min((total / annualExpense) * 100, 100) : 0;
                      return (
                        <li key={row.category}>
                          <div className="break-label-row">
                            <b>{row.category}</b>
                            <strong>{fmt(total, lang, currency)}</strong>
                          </div>
                          <div className="break-track"><div style={{ width: `${pctValue}%`, background: "#2f6be8" }} /></div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="activity-empty">{text.none}</p>
                )}
              </article>
            </section>

            <article className="panel activity-panel">
              <div className="panel-head" style={{ padding: "10px 12px" }}>
                <h3>{text.title}</h3>
              </div>
              <div className="activity-table-wrap">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>{text.month}</th>
                      <th>{text.income}</th>
                      <th>{text.expense}</th>
                      <th>{text.savings}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((month) => (
                      <tr key={month.iso}>
                        <td>{month.label}</td>
                        <td className="money-in">{fmt(month.income, lang, currency)}</td>
                        <td className="money-out">{fmt(month.expense, lang, currency)}</td>
                        <td className={month.savings >= 0 ? "money-in" : "money-out"}>{fmt(month.savings, lang, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
