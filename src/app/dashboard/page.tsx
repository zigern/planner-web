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
type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};
type BillRow = { id: number; name: string; amount: string; due_day: number; status: "pending" | "paid" };
type AssetRow = { asset_type: string; value: string };
type DebtRow = { total_owed: string; amount_paid: string };
type IncomeCategoryRow = { category: string; total: string };
type SpendingBucket = {
  key: "housing" | "personal" | "transportation";
  label: string;
  icon: string;
  matcher: RegExp;
};

function monthIsoListForYear(year: number) {
  return Array.from({ length: 12 }).map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function toFixed2(v: number) {
  return v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthName(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-PT", { month: "short" });
}

function dayMonth(v: string | Date) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

const spendingBuckets: SpendingBucket[] = [
  {
    key: "housing",
    label: "Housing",
    icon: "🏠",
    matcher: /(housing|renda|rent|mortgage|casa|home|eletric|electric|agua|water|internet|insurance|luz)/i
  },
  {
    key: "personal",
    label: "Personal",
    icon: "👥",
    matcher: /(personal|shopping|compras|lazer|saude|saúde|health|beauty|hobby|food|comida)/i
  },
  {
    key: "transportation",
    label: "Transportation",
    icon: "🚗",
    matcher: /(transport|transporte|car|carro|fuel|gas|uber|bolt|parking|viagem|trip)/i
  }
];

function smoothLinePath(data: number[], w: number, h: number) {
  if (data.length === 0) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? w / 2 : index * step;
    const y = h - ((value - min) / range) * (h - 8) - 4;
    return { x, y };
  });

  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

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

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(
      2
    )} ${p2.y.toFixed(2)}`;
  }

  return d;
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
  searchParams?: Promise<{ month?: string | string[] }>;
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
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const monthOptions = monthIsoListForYear(selectedYear);
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

  const expenseCategories = await safeQueryRows<CategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 8`,
    [user.userId, selectedMonth]
  );

  const incomeCategories = await safeQueryRows<IncomeCategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'income'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 4`,
    [user.userId, selectedMonth]
  );

  const txRows = await safeQueryRows<TxRow>(
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
    `SELECT asset_type, value FROM assets WHERE user_id = ? ORDER BY value DESC LIMIT 6`,
    [user.userId]
  );

  const debtRows = await safeQueryRows<DebtRow>(db, `SELECT total_owed, amount_paid FROM debts WHERE user_id = ?`, [
    user.userId
  ]);

  const totals = totalsRows[0] ?? { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const availableBalance = income - expense;

  const assetsTotal = assetRows.reduce((a, r) => a + Number(r.value || 0), 0);
  const liabilities = debtRows.reduce(
    (a, r) => a + Math.max(0, Number(r.total_owed || 0) - Number(r.amount_paid || 0)),
    0
  );
  const netWorth = assetsTotal - liabilities + availableBalance;

  const summary = [...summaryRows].reverse();
  const incomeSeries = summary.map((s) => Number(s.income || 0));
  const expenseSeries = summary.map((s) => Number(s.expense || 0));

  const incomeGoalTarget = Math.max(1, income + expense);
  const incomeGoalPct = Math.min(100, (income / incomeGoalTarget) * 100);

  const pieTotal = expenseCategories.reduce((a, r) => a + Number(r.total || 0), 0);
  const pieColors = ["#ef476f", "#6d4dff", "#1fd2ca", "#7ed957", "#f59e0b", "#60a5fa"];
  let cursor = 0;
  const pieGradient = expenseCategories.length
    ? `conic-gradient(${expenseCategories
        .map((r, i) => {
          const pctVal = pieTotal > 0 ? (Number(r.total || 0) / pieTotal) * 100 : 0;
          const start = cursor;
          cursor += pctVal;
          return `${pieColors[i % pieColors.length]} ${start}% ${cursor}%`;
        })
        .join(", ")})`
    : "conic-gradient(#293467 0% 100%)";

  const spendingByBucket = spendingBuckets.map((bucket) => {
    const total = expenseCategories.reduce((acc, row) => {
      return bucket.matcher.test(row.category) ? acc + Number(row.total || 0) : acc;
    }, 0);
    return { ...bucket, total };
  });

  const petKeywords = /(pet|animal|dog|cat|vet|veterin|food treat|kennel|racao|ração|groom|banho)/i;
  const petList = expenseCategories.filter((c) => petKeywords.test(c.category)).map((r) => ({
    label: r.category,
    value: Number(r.total || 0)
  }));

  const overdueBills = billRows.filter((b) => b.status === "pending" && b.due_day < new Date().getDate()).length;
  const initials = user.email.slice(0, 2).toUpperCase();

  const sparkSpend = smoothLinePath(expenseSeries.slice(-8), 180, 40);
  const sparkIncome = smoothLinePath(incomeSeries.slice(-8), 180, 40);
  const bigIncome = smoothLinePath(incomeSeries.slice(-12), 620, 220);
  const bigExpense = smoothLinePath(expenseSeries.slice(-12), 620, 220);

  return (
    <div className="dash-wrap">
      <div className="dash-shell">
        <aside className="left-nav">
          <div className="brand-icon">{initials}</div>
          <div className="brand-name">Other Level&apos;s</div>
          <nav className="month-nav">
            {monthOptions.map((m) => (
              <Link key={m} href={`?month=${m}`} className={`month-link ${m === selectedMonth ? "active" : ""}`}>
                {monthName(m)}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="main-area">
          <header className="top-row">
            <div className="title-block">
              <p className="kicker">Personal Finance Tracker</p>
              <h1>Available Balance</h1>
              <p className="balance">€{toFixed2(availableBalance)}</p>
            </div>

            <div className="center-tabs">
              <Link className="tab active" href={`/dashboard?month=${selectedMonth}`}>
                Dashboard
              </Link>
              <Link className="tab" href={`/dashboard/spreadsheet?month=${selectedMonth}`}>
                Spreadsheet
              </Link>
            </div>

            <div className="date-card">
              {new Date().toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </div>

            <div className="profile">
              <div>
                <p className="name">{user.email.split("@")[0]}</p>
                <p className="role">Mortgage consultant</p>
              </div>
              <div className="avatar">{initials}</div>
              <LogoutButton className="logout-mini" label="Sair" />
            </div>
          </header>

          <section className="grid-board">
            <article className="card grad card-networth">
              <p className="card-label">Total Net Worth</p>
              <p className="card-big">€{toFixed2(netWorth)}</p>
            </article>

            <article className="card card-spending-spark">
              <p className="card-label">Spendings</p>
              <p className="card-num">€{toFixed2(expense)}</p>
              <svg className="spark" viewBox="0 0 180 40" preserveAspectRatio="none">
                <path d={sparkSpend} />
              </svg>
            </article>

            <article className="card card-spending-list">
              <p className="card-label">Spendings</p>
              <ul className="spend-list">
                {spendingByBucket.map((row, i) => (
                  <li key={row.key}>
                    <span className={`ico i${(i % 3) + 1}`}>{row.icon}</span>
                    <span>{row.label}</span>
                    <b>€{toFixed2(row.total)}</b>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card goal card-goal">
              <p className="goal-top">{Math.round(incomeGoalPct)}%</p>
              <p className="card-label">Income Goal</p>
              <p className="muted">Progress to month</p>
              <p className="goal-value">
                €{toFixed2(income)} / {toFixed2(incomeGoalTarget)}
              </p>
              <div className="goal-bar">
                <div style={{ width: `${incomeGoalPct}%` }} />
              </div>
            </article>

            <article className="card card-income-source">
              <p className="card-label">Income Source</p>
              <div className="income-bars">
                {incomeCategories.map((c, i) => {
                  const max = Math.max(1, ...incomeCategories.map((x) => Number(x.total || 0)));
                  const h = (Number(c.total || 0) / max) * 80;
                  return (
                    <div key={c.category} className="ib-col">
                      <small>€{toFixed2(Number(c.total || 0))}</small>
                      <div
                        className={`ib-bar c${(i % 4) + 1}`}
                        style={{ height: `${Math.max(6, h)}px` }}
                      />
                      <span>{c.category}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="card card-income-spark">
              <p className="card-label">Income</p>
              <p className="card-num">€{toFixed2(income)}</p>
              <svg className="spark orange" viewBox="0 0 180 40" preserveAspectRatio="none">
                <path d={sparkIncome} />
              </svg>
            </article>

            <article className="card notification card-notice">
              <p className="card-label">Notification</p>
              <div className="notice">
                {overdueBills > 0
                  ? `${overdueBills} bills are past due. Pay soon to avoid late fees.`
                  : "No overdue bills right now."}
              </div>
              <p className="card-label mt16">Quick add transaction</p>
              <QuickAddForm />
            </article>

            <article className="card line-chart card-trend">
              <div className="line-head">
                <p className="card-label">Income & Expenses</p>
                <Link href={`/api/transactions/export?month=${selectedMonth}`} className="export">
                  Export CSV
                </Link>
              </div>
              <svg viewBox="0 0 620 220" preserveAspectRatio="none" className="big-chart">
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" x2="620" y1={i * 44} y2={i * 44} className="grid" />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <line key={`v-${i}`} y1="0" y2="220" x1={i * (620 / 11)} x2={i * (620 / 11)} className="grid" />
                ))}
                <path d={bigIncome} className="line income" />
                <path d={bigExpense} className="line expense" />
              </svg>
              <div className="chart-months">
                {summary.slice(-12).map((m) => (
                  <span key={m.month}>{monthName(m.month)}</span>
                ))}
              </div>
            </article>

            <article className="card asset card-assets">
              <p className="card-label">Assets</p>
              <div className="asset-wrap">
                <div className="donut" style={{ background: pieGradient }}>
                  <div className="donut-hole" />
                </div>
                <div className="asset-list">
                  {assetRows.slice(0, 4).map((a) => (
                    <div key={`${a.asset_type}-${a.value}`}>
                      <span>{a.asset_type}</span>
                      <b>€{toFixed2(Number(a.value || 0))}</b>
                    </div>
                  ))}
                  {assetRows.length === 0 ? (
                    <div>
                      <span>Sem assets</span>
                      <b>€0.00</b>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>

            <article className="card pets card-pets">
              <p className="card-label">Expenses for My Dogs and Cats</p>
              <div className="pet-box">
                <div className="pet-lines">
                  {petList.length ? (
                    petList.map((p) => (
                      <div key={p.label}>
                        <span>{p.label}</span>
                        <b>{toFixed2(p.value)}</b>
                      </div>
                    ))
                  ) : (
                    <div>
                      <span>No pet expenses in this month</span>
                      <b>0.00</b>
                    </div>
                  )}
                </div>
                <div className="pet-emoji">🐶</div>
              </div>
            </article>

            <article className="card table card-recent">
              <p className="card-label">Recent Transactions</p>
              <div className="rows">
                {txRows.map((tx) => (
                  <div key={tx.id} className="row">
                    <span>{tx.description || tx.category}</span>
                    <span>{dayMonth(tx.transaction_date)}</span>
                    <span className={tx.type === "income" ? "pos" : "neg"}>
                      {tx.type === "income" ? "+" : "-"}€{toFixed2(Math.abs(Number(tx.amount || 0)))}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
