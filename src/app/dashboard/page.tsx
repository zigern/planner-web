import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "./components/logout-button";
import "./dashboard-theme.css";

type TotalsRow = { income: string | null; expense: string | null };
type MonthSummaryRow = { month: string; income: string; expense: string };
type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};
type AssetRow = { asset_type: string; value: string };
type DebtRow = { total_owed: string; amount_paid: string };

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

function formatMoney(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function smoothLinePath(data: number[], w: number, h: number) {
  if (data.length === 0) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? w / 2 : index * step;
    const y = h - ((value - min) / range) * (h - 16) - 8;
    return { x, y };
  });

  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function buildMonthlySeries(rows: MonthSummaryRow[], selectedMonth: string, length: number, key: "income" | "expense") {
  const [year, month] = selectedMonth.split("-").map(Number);
  const map = new Map(rows.map((r) => [r.month, Number(r[key] || 0)]));
  const out: number[] = [];
  for (let i = length - 1; i >= 0; i -= 1) {
    const d = new Date(year, month - 1 - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push(map.get(m) ?? 0);
  }
  return out;
}

function buildMonthLabels(selectedMonth: string, length: number, lang: string) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = length - 1; i >= 0; i -= 1) {
    const d = new Date(year, month - 1 - i, 1);
    out.push(d.toLocaleDateString(lang, { month: "short" }));
  }
  return out;
}

function percent(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatDate(v: string | Date, lang: string) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang, { day: "2-digit", month: "short" });
}

function formatTime(v: string | Date, lang: string) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
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

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string | string[]; lang?: string | string[]; currency?: string | string[] }>;
}) {
  if (!hasDatabaseConfig() || !process.env.AUTH_SECRET) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-bold text-amber-900">Missing MySQL/Auth setup</h1>
          <p className="mt-3 text-amber-800">Configure environment variables and refresh.</p>
        </section>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const selectedMonth = parseMonthParam(params?.month);
  const lang = parseLangParam(params?.lang);
  const currency = parseCurrencyParam(params?.currency);

  const db = getDb();

  const totalsRows = await safeQueryRows<TotalsRow>(
    db,
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
    [user.userId, selectedMonth]
  );

  const summaryRows = await safeQueryRows<MonthSummaryRow>(
    db,
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY month DESC
     LIMIT 12`,
    [user.userId]
  );

  const txRows = await safeQueryRows<TxRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 5`,
    [user.userId]
  );

  const expenseCategories = await safeQueryRows<{ category: string; total: string }>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 5`,
    [user.userId, selectedMonth]
  );

  const assetRows = await safeQueryRows<AssetRow>(
    db,
    `SELECT asset_type, value FROM assets WHERE user_id = ? ORDER BY value DESC LIMIT 6`,
    [user.userId]
  );

  const debtRows = await safeQueryRows<DebtRow>(db, `SELECT total_owed, amount_paid FROM debts WHERE user_id = ?`, [
    user.userId
  ]);

  const totals = totalsRows[0] ?? { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const netBalance = income - expense;

  const [year, month] = selectedMonth.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevIso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const summaryMap = new Map(summaryRows.map((r) => [r.month, r]));
  const prev = summaryMap.get(prevIso);
  const prevIncome = Number(prev?.income || 0);
  const prevExpense = Number(prev?.expense || 0);

  const incomePct = percent(income, prevIncome);
  const expensePct = percent(expense, prevExpense);

  const assetsTotal = assetRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const liabilitiesTotal = debtRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)),
    0
  );
  const savings = Math.max(0, netBalance);
  const investments = Math.max(0, assetsTotal);
  const totalBalance = netBalance + assetsTotal - liabilitiesTotal;

  const lineIncome = buildMonthlySeries(summaryRows, selectedMonth, 12, "income");
  const lineExpense = buildMonthlySeries(summaryRows, selectedMonth, 12, "expense");
  const accountBalanceSeries = lineIncome.map((v, i) => v - lineExpense[i]);
  const maxGraph = Math.max(1, ...accountBalanceSeries, ...lineIncome, ...lineExpense);
  const path = smoothLinePath(accountBalanceSeries, 760, 220);
  const monthLabels = buildMonthLabels(selectedMonth, 12, lang);
  const centerIndex = Math.floor(accountBalanceSeries.length / 2);
  const centerValue = accountBalanceSeries[centerIndex] ?? 0;

  const spentTotal = Math.max(1, expenseCategories.reduce((sum, row) => sum + Number(row.total || 0), 0));
  const portfolio = assetRows.slice(0, 4);
  const portfolioGain = portfolio.reduce((sum, row) => sum + Number(row.value || 0), 0) * 0.07;

  const name = user.email.split("@")[0];

  return (
    <div className="wwe-wrap">
      <div className="wwe-shell">
        <aside className="wwe-sidebar">
          <div className="wwe-brand">wwealty</div>
          <nav className="wwe-menu">
            <a className="active" href="#">
              Overview
            </a>
            <a href="#">Budgets</a>
            <a href="#">Expenses</a>
            <a href="#">Investments</a>
            <a href="#">Reports</a>
            <a href="#">Settings</a>
          </nav>
          <div className="wwe-help">
            <strong>Have a question?</strong>
            <p>Send us a message and we will get back to you in no time.</p>
            <button type="button">Contact us</button>
          </div>
          <LogoutButton className="wwe-logout" label="Log out" />
        </aside>

        <main className="wwe-main">
          <header className="wwe-top">
            <div>
              <h1>Welcome back, {name}</h1>
              <p>Here’s an overview of all of your balances.</p>
            </div>
            <div className="wwe-top-right">
              <div className="wwe-icon-btn">⌕</div>
              <div className="wwe-icon-btn">◌</div>
              <div className="wwe-avatar">{name.slice(0, 2).toUpperCase()}</div>
            </div>
          </header>

          <section className="wwe-grid-top">
            <article className="wwe-card wwe-card-chart">
              <div className="wwe-card-head">
                <h3>Account Balance</h3>
                <div className="wwe-tabs">
                  <span>Day</span>
                  <span>Week</span>
                  <span>Month</span>
                  <span className="active">Year</span>
                </div>
              </div>

              <svg viewBox="0 0 760 220" className="wwe-line-chart" preserveAspectRatio="none">
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" x2="760" y1={i * 44} y2={i * 44} className="wwe-grid-line" />
                ))}
                <path d={path} className="wwe-line" />
              </svg>

              <div className="wwe-tooltip">
                <small>{monthLabels[centerIndex]}</small>
                <strong>{formatMoney(centerValue, lang, currency)}</strong>
              </div>

              <div className="wwe-months">
                {monthLabels.map((m, i) => (
                  <span key={`${m}-${i}`}>{m}</span>
                ))}
              </div>
            </article>

            <div className="wwe-kpi-col">
              <article className="wwe-card wwe-kpi">
                <h4>Total Balance</h4>
                <p>{formatMoney(totalBalance, lang, currency)}</p>
                <small className="up">+{Math.max(0, incomePct).toFixed(1)}%</small>
              </article>
              <article className="wwe-card wwe-kpi">
                <h4>Main Account</h4>
                <p>{formatMoney(netBalance, lang, currency)}</p>
              </article>
              <article className="wwe-card wwe-kpi">
                <h4>Savings</h4>
                <p>{formatMoney(savings, lang, currency)}</p>
                <small className="up">+{Math.max(0, incomePct - expensePct).toFixed(1)}%</small>
              </article>
              <article className="wwe-card wwe-kpi wwe-invest-card">
                <h4>Investments</h4>
                <p>{formatMoney(investments, lang, currency)}</p>
                <small className="up">+{Math.max(0, (portfolioGain / Math.max(1, investments)) * 100).toFixed(2)}%</small>
                <div className="wwe-gauge" />
                <div className="wwe-return">Return {formatMoney(portfolioGain, lang, currency)}</div>
              </article>
            </div>
          </section>

          <section className="wwe-grid-bottom">
            <article className="wwe-card wwe-table-card">
              <div className="wwe-card-head">
                <h3>Recent Transactions</h3>
                <a href="#">See all</a>
              </div>
              <table className="wwe-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txRows.map((tx) => {
                    const status = tx.type === "expense" && Number(tx.amount || 0) > maxGraph * 0.05 ? "Pending" : "Completed";
                    return (
                      <tr key={tx.id}>
                        <td>{tx.description || tx.category}</td>
                        <td>{formatDate(tx.transaction_date, lang)}</td>
                        <td>{formatTime(tx.transaction_date, lang)}</td>
                        <td>
                          <span className={`wwe-status ${status === "Pending" ? "pending" : "done"}`}>{status}</span>
                        </td>
                        <td className={tx.type === "expense" ? "neg" : "pos"}>
                          {tx.type === "expense" ? "-" : "+"}
                          {formatMoney(Number(tx.amount || 0), lang, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>

            <article className="wwe-card wwe-breakdown-card">
              <h3>Spending Breakdown</h3>
              <ul>
                {expenseCategories.map((row) => {
                  const value = Number(row.total || 0);
                  const pct = Math.round((value / spentTotal) * 100);
                  return (
                    <li key={row.category}>
                      <div className="head">
                        <span>{row.category}</span>
                        <strong>{pct}%</strong>
                      </div>
                      <div className="bar">
                        <div style={{ width: `${pct}%` }} />
                      </div>
                      <small>{formatMoney(value, lang, currency)}</small>
                    </li>
                  );
                })}
              </ul>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
