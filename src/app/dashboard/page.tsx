import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "./components/logout-button";
import { QuickAddForm } from "./components/quick-add-form";
import "./dashboard-theme.css";

type TotalsRow = { income: string | null; expense: string | null };
type MonthSummaryRow = { month: string; income: string; expense: string };
type CategoryRow = { category: string; total: string };
type RecentRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};
type BillRow = { id: number; name: string; amount: string; due_day: number; status: "pending" | "paid" };
type AssetRow = { value: string };
type DebtRow = { total_owed: string; amount_paid: string };

function monthIsoList(count: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function parsePeriodParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "7d" || raw === "30d" || raw === "90d" || raw === "1a" ? raw : "30d";
}

function monthShort(monthIso: string) {
  const [year, month] = monthIso.split("-");
  return `${month}/${year.slice(2)}`;
}

function monthNamePt(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("pt-PT", { month: "short" });
}

function toFixed2(v: number) {
  return v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDayMonth(v: string | Date) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function pctChange(current: number, previous: number) {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
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
  searchParams?: Promise<{ month?: string | string[]; period?: string | string[] }>;
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
  const selectedPeriod = parsePeriodParam(params?.period);
  const monthOptions = monthIsoList(12);

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
     LIMIT 6`,
    [user.userId]
  );

  const categoryRows = await safeQueryRows<CategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 5`,
    [user.userId, selectedMonth]
  );

  const recentRows = await safeQueryRows<RecentRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 8`,
    [user.userId, selectedMonth]
  );

  const billRows = await safeQueryRows<BillRow>(
    db,
    `SELECT id, name, amount, due_day, status
     FROM bills
     WHERE user_id = ?
     ORDER BY due_day ASC
     LIMIT 6`,
    [user.userId]
  );

  const assetRows = await safeQueryRows<AssetRow>(
    db,
    `SELECT value FROM assets WHERE user_id = ?`,
    [user.userId]
  );

  const debtRows = await safeQueryRows<DebtRow>(
    db,
    `SELECT total_owed, amount_paid FROM debts WHERE user_id = ?`,
    [user.userId]
  );

  const totals = totalsRows[0] ?? { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expenses = Number(totals.expense || 0);
  const savings = income - expenses;
  const availableBalance = savings;

  const summary = [...summaryRows].reverse();
  const prev = summaryRows[1];
  const incomeChange = pctChange(income, prev ? Number(prev.income || 0) : 0);
  const expenseChange = pctChange(expenses, prev ? Number(prev.expense || 0) : 0);

  const assetsTotal = assetRows.reduce((acc, row) => acc + Number(row.value || 0), 0);
  const debtOpen = debtRows.reduce(
    (acc, row) => acc + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)),
    0
  );
  const netWorth = assetsTotal - debtOpen + savings;

  const maxBar = Math.max(
    1,
    ...summary.flatMap((r) => [Number(r.income || 0), Number(r.expense || 0)])
  );

  const pieTotal = categoryRows.reduce((acc, row) => acc + Number(row.total || 0), 0);
  const pieColors = ["#7c3aed", "#ef4444", "#06b6d4", "#f97316", "#22c55e"];
  const pieSegments = categoryRows.map((row, i) => ({
    label: row.category,
    value: Number(row.total || 0),
    pct: pieTotal > 0 ? Math.round((Number(row.total || 0) / pieTotal) * 100) : 0,
    color: pieColors[i % pieColors.length]
  }));
  let cursor = 0;
  const pieGradient = pieSegments.length
    ? `conic-gradient(${pieSegments
        .map((s) => {
          const start = cursor;
          cursor += s.pct;
          return `${s.color} ${start}% ${cursor}%`;
        })
        .join(", ")})`
    : "conic-gradient(#27335f 0% 100%)";

  const today = new Date();
  const pendingBills = billRows.filter((b) => b.status === "pending");
  const overdueCount = pendingBills.filter((b) => b.due_day < today.getDate()).length;

  const incomeGoal = Math.max(1, income + expenses);
  const incomeGoalPct = Math.min(100, (income / incomeGoal) * 100);

  const initials = user.email.slice(0, 2).toUpperCase();
  const name = user.email.split("@")[0];

  return (
    <div className="pf-wrap">
      <div className="pf-shell">
        <aside className="pf-sidebar">
          <div className="pf-brand">
            <div className="pf-mark" />
            <div>
              <p className="pf-brand-title">Planner</p>
              <p className="pf-brand-sub">Finance</p>
            </div>
          </div>

          <div className="pf-months">
            {monthOptions.map((m) => (
              <Link
                key={m}
                href={`?month=${m}&period=${selectedPeriod}`}
                className={`pf-month ${m === selectedMonth ? "active" : ""}`}
              >
                {monthNamePt(m)}
              </Link>
            ))}
          </div>

          <div className="pf-user">
            <div className="pf-avatar">{initials}</div>
            <div>
              <p className="pf-user-name">{name}</p>
              <p className="pf-user-role">Owner</p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <main className="pf-main">
          <header className="pf-top">
            <div>
              <p className="pf-kicker">Personal Finance Tracker</p>
              <h1 className="pf-balance-title">Available Balance</h1>
              <p className="pf-balance-value">€ {toFixed2(availableBalance)}</p>
            </div>

            <div className="pf-tabs">
              {(["7d", "30d", "90d", "1a"] as const).map((p) => (
                <Link
                  key={p}
                  href={`?month=${selectedMonth}&period=${p}`}
                  className={`pf-tab ${selectedPeriod === p ? "active" : ""}`}
                >
                  {p}
                </Link>
              ))}
            </div>

            <div className="pf-date-card">
              {new Date().toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </div>
          </header>

          <section className="pf-grid">
            <article className="pf-card pf-gradient">
              <p className="pf-card-title">Total Net Worth</p>
              <p className="pf-card-big">€ {toFixed2(netWorth)}</p>
            </article>

            <article className="pf-card">
              <p className="pf-card-title">Spendings</p>
              <p className="pf-card-number">€ {toFixed2(expenses)}</p>
              <p className={`pf-badge ${expenseChange <= 0 ? "ok" : "bad"}`}>
                {expenseChange >= 0 ? "+" : ""}
                {expenseChange.toFixed(1)}%
              </p>
            </article>

            <article className="pf-card">
              <p className="pf-card-title">Top categorias</p>
              <ul className="pf-list">
                {pieSegments.slice(0, 3).map((item) => (
                  <li key={item.label}>
                    <span className="dot" style={{ background: item.color }} />
                    {item.label}
                    <b>€ {toFixed2(item.value)}</b>
                  </li>
                ))}
              </ul>
            </article>

            <article className="pf-card">
              <p className="pf-card-title">{Math.round(incomeGoalPct)}% Income Goal</p>
              <p className="pf-sub">Progress mensal</p>
              <div className="pf-progress">
                <div style={{ width: `${incomeGoalPct}%` }} />
              </div>
              <p className="pf-sub right">
                €{toFixed2(income)} / {toFixed2(incomeGoal)}
              </p>
            </article>

            <article className="pf-card pf-bar-card">
              <div className="pf-head-row">
                <p className="pf-card-title">Income & Expenses</p>
                <Link className="pf-link" href={`/api/transactions/export?month=${selectedMonth}`}>
                  Export CSV
                </Link>
              </div>
              <div className="pf-bars">
                {summary.map((row) => {
                  const i = Number(row.income || 0);
                  const e = Number(row.expense || 0);
                  const ih = Math.max(4, (i / maxBar) * 100);
                  const eh = Math.max(4, (e / maxBar) * 100);
                  return (
                    <div className="pf-bar-col" key={row.month}>
                      <div className="pf-bar-stack">
                        <span className="inc" style={{ height: `${ih}%` }} />
                        <span className="exp" style={{ height: `${eh}%` }} />
                      </div>
                      <small>{monthShort(row.month)}</small>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="pf-card">
              <p className="pf-card-title">Assets by Category</p>
              <div className="pf-donut">
                <div
                  className="pf-donut-ring"
                  style={{
                    background: pieGradient
                  }}
                />
                <div className="pf-donut-hole">€ {toFixed2(assetsTotal)}</div>
              </div>
            </article>

            <article className="pf-card">
              <p className="pf-card-title">Notification</p>
              <div className="pf-alert">
                {overdueCount > 0
                  ? `${overdueCount} contas vencidas. Paga assim que possível.`
                  : "Sem contas vencidas hoje."}
              </div>
              <p className="pf-sub mt">Quick add</p>
              <QuickAddForm />
            </article>

            <article className="pf-card pf-table-card">
              <p className="pf-card-title">Transações recentes</p>
              <div className="pf-table">
                {recentRows.map((tx) => (
                  <div className="pf-row" key={tx.id}>
                    <span>{tx.description || tx.category}</span>
                    <span>{toDayMonth(tx.transaction_date)}</span>
                    <span className={tx.type === "income" ? "pos" : "neg"}>
                      {tx.type === "income" ? "+" : "-"}€{toFixed2(Math.abs(Number(tx.amount || 0)))}
                    </span>
                  </div>
                ))}
                {recentRows.length === 0 ? <p className="pf-sub">Sem transações no mês.</p> : null}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
