import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { AddTransactionForm } from "./components/add-transaction-form";
import { LogoutButton } from "./components/logout-button";
import {
  AddAssetForm,
  AddBillForm,
  AddBudgetForm,
  AddDebtForm,
  AddGoalForm,
  AddSubscriptionForm
} from "./components/planner-forms";
import "./dashboard-theme.css";

type TotalsRow = { income: string | null; expense: string | null };
type RecentRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};
type MonthSummaryRow = { month: string; income: string; expense: string };
type ExpenseByCategoryRow = { category: string; total: string };
type BillRow = { id: number; name: string; amount: string; due_day: number; frequency: "monthly" | "quarterly" | "yearly"; status: "pending" | "paid" };
type SubscriptionRow = { id: number; service: string; cost: string; billing_cycle: "monthly" | "yearly"; category: string; status: "active" | "paused" | "cancelled" };
type GoalRow = { id: number; name: string; target_amount: string; saved_amount: string; deadline: string | Date | null; status: "not_started" | "in_progress" | "completed" };
type DebtRow = { id: number; name: string; total_owed: string; amount_paid: string; interest_rate: string };
type AssetRow = { id: number; name: string; asset_type: string; value: string };
type BudgetRow = { id: number; category: string; budget_amount: string };

function formatDate(value: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(monthIso: string) {
  const [year, month] = monthIso.split("-");
  return `${month}/${year}`;
}

function getCurrentMonthIso() {
  return new Date().toISOString().slice(0, 7);
}

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return getCurrentMonthIso();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : getCurrentMonthIso();
}

function parsePeriodParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "1a") return raw;
  return "30d";
}

function lastMonths(count: number) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
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
      ((error as { code?: string }).code === "ER_NO_SUCH_TABLE" || (error as { code?: string }).code === "ER_BAD_FIELD_ERROR")
    ) {
      return [];
    }
    throw error;
  }
}

function donutPath(cx: number, cy: number, r: number, ir: number, start: number, end: number) {
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const xi1 = cx + ir * Math.cos(start);
  const yi1 = cy + ir * Math.sin(start);
  const xi2 = cx + ir * Math.cos(end);
  const yi2 = cy + ir * Math.sin(end);
  const lg = end - start > Math.PI ? 1 : 0;
  return `M${xi1.toFixed(1)},${yi1.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi2.toFixed(1)},${yi2.toFixed(1)} A${ir},${ir} 0 ${lg},0 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z`;
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
          <p className="mt-3 text-amber-800">Cria o ficheiro <code>.env.local</code> com as variáveis MySQL e AUTH_SECRET.</p>
        </section>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const selectedMonth = parseMonthParam(params?.month);
  const selectedPeriod = parsePeriodParam(params?.period);

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

  const recent = await safeQueryRows<RecentRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 8`,
    [user.userId, selectedMonth]
  );

  const summary = await safeQueryRows<MonthSummaryRow>(
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

  const expenseByCategory = await safeQueryRows<ExpenseByCategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 7`,
    [user.userId, selectedMonth]
  );

  const bills = await safeQueryRows<BillRow>(db, `SELECT id, name, amount, due_day, frequency, status FROM bills WHERE user_id = ? ORDER BY due_day ASC, id DESC LIMIT 8`, [user.userId]);
  const subscriptions = await safeQueryRows<SubscriptionRow>(db, `SELECT id, service, cost, billing_cycle, category, status FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 8`, [user.userId]);
  const goals = await safeQueryRows<GoalRow>(db, `SELECT id, name, target_amount, saved_amount, deadline, status FROM goals WHERE user_id = ? ORDER BY id DESC LIMIT 8`, [user.userId]);
  const debts = await safeQueryRows<DebtRow>(db, `SELECT id, name, total_owed, amount_paid, interest_rate FROM debts WHERE user_id = ? ORDER BY id DESC LIMIT 8`, [user.userId]);
  const assets = await safeQueryRows<AssetRow>(db, `SELECT id, name, asset_type, value FROM assets WHERE user_id = ? ORDER BY id DESC LIMIT 8`, [user.userId]);
  const budgets = await safeQueryRows<BudgetRow>(db, `SELECT id, category, budget_amount FROM monthly_budgets WHERE user_id = ? AND budget_month = ? ORDER BY category ASC`, [user.userId, selectedMonth]);

  const totals = totalsRows[0] || { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expenses = Number(totals.expense || 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const orderedMonths = [...summary].reverse();
  const prev = summary[1];
  const prevIncome = prev ? Number(prev.income || 0) : 0;
  const prevExpenses = prev ? Number(prev.expense || 0) : 0;
  const incomeChange = pctChange(income, prevIncome);
  const expenseChange = pctChange(expenses, prevExpenses);

  const assetsTotal = assets.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const debtOpenTotal = debts.reduce((sum, row) => sum + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)), 0);
  const netWorth = assetsTotal - debtOpenTotal + savings;

  const sparkIncome = orderedMonths.map((m) => Number(m.income || 0));
  const sparkExpense = orderedMonths.map((m) => Number(m.expense || 0));
  const sparkSavings = orderedMonths.map((m) => Math.max(0, Number(m.income || 0) - Number(m.expense || 0)));
  const sparkNetWorth = orderedMonths.map((_, i) => Math.max(0, netWorth * ((i + 1) / Math.max(1, orderedMonths.length))));

  const pieTotal = expenseByCategory.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const pieColors = ["#60a5fa", "#4ade80", "#fbbf24", "#a78bfa", "#f87171", "#34d399", "#fb923c"];
  const pieData = expenseByCategory.map((row, i) => ({
    name: row.category,
    pct: pieTotal > 0 ? Math.round((Number(row.total || 0) / pieTotal) * 100) : 0,
    color: pieColors[i % pieColors.length]
  }));

  const barMax = Math.max(1, ...orderedMonths.flatMap((m) => [Number(m.income || 0), Number(m.expense || 0)]));

  const budgetMap = new Map(budgets.map((row) => [row.category, Number(row.budget_amount || 0)]));
  const actualMap = new Map(expenseByCategory.map((row) => [row.category, Number(row.total || 0)]));
  const budgetCategories = Array.from(new Set([...budgetMap.keys(), ...actualMap.keys()]));

  const userInitials = user.email.slice(0, 2).toUpperCase();
  const userName = user.email.split("@")[0];

  return (
    <div className="shell-page">
      <div className="shell">
        <aside className="sb">
          <div className="sb-logo">
            <div className="sb-logo-sq" />
            <div>
              <div className="sb-logo-txt">BudgetFlow</div>
              <div className="sb-logo-sub">2026</div>
            </div>
          </div>

          <nav className="sb-nav">
            <div className="sb-section">Overview</div>
            <button className="nav-item active" type="button"><span className="nav-label">Dashboard</span></button>

            <div className="sb-section">Tracking</div>
            <a className="nav-item" href="#tx"><span className="nav-label">Income & Expenses</span></a>
            <a className="nav-item" href="#bills"><span className="nav-label">Bills</span></a>
            <a className="nav-item" href="#subs"><span className="nav-label">Subscriptions</span></a>

            <div className="sb-section">Planning</div>
            <a className="nav-item" href="#goals"><span className="nav-label">Goals</span></a>
            <a className="nav-item" href="#debt"><span className="nav-label">Debt tracker</span></a>
            <a className="nav-item" href="#networth"><span className="nav-label">Net worth</span></a>
            <a className="nav-item" href="#budget"><span className="nav-label">Monthly budget</span></a>
          </nav>

          <div className="sb-footer">
            <div className="user-row">
              <div className="user-av">{userInitials}</div>
              <div>
                <div className="user-name">{userName}</div>
                <div className="user-plan">Pro</div>
              </div>
              <div className="logout-wrap"><LogoutButton /></div>
            </div>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div className="page-title">Dashboard</div>

            <div className="filter-pill">
              {(["7d", "30d", "90d", "1a"] as const).map((p) => (
                <Link
                  key={p}
                  href={`?month=${selectedMonth}&period=${p}`}
                  className={`fp-btn ${selectedPeriod === p ? "active" : ""}`}
                >
                  {p}
                </Link>
              ))}
            </div>

            <div className="top-sep" />

            <form className="month-sel" method="get">
              <select name="month" defaultValue={selectedMonth}>
                {lastMonths(12).map((m) => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
              <input type="hidden" name="period" value={selectedPeriod} />
              <button className="export-btn" type="submit">Aplicar</button>
            </form>

            <Link href={`/api/transactions/export?month=${selectedMonth}`} className="export-btn">Exportar CSV</Link>
          </div>

          <div className="content">
            <div className="bento">
              <div className="cell c-k1">
                <div className="kpi-lbl">Receita mensal</div>
                <div className="kpi-val">€{income.toFixed(2)}</div>
                <div className="kpi-foot"><span className={`kpi-bdg ${incomeChange >= 0 ? "up" : "dn"}`}>{incomeChange >= 0 ? "+" : ""}{incomeChange.toFixed(1)}%</span><span className="kpi-since">vs mês ant.</span></div>
                <div className="spark">{sparkIncome.map((v, i) => <div key={i} className="sp-b" style={{ height: `${Math.max(8, (v / Math.max(1, ...sparkIncome)) * 100)}%`, background: "var(--green)", opacity: i === sparkIncome.length - 1 ? 1 : 0.3 }} />)}</div>
              </div>
              <div className="cell c-k2">
                <div className="kpi-lbl">Despesas totais</div>
                <div className="kpi-val">€{expenses.toFixed(2)}</div>
                <div className="kpi-foot"><span className={`kpi-bdg ${expenseChange <= 0 ? "up" : "dn"}`}>{expenseChange >= 0 ? "+" : ""}{expenseChange.toFixed(1)}%</span><span className="kpi-since">vs mês ant.</span></div>
                <div className="spark">{sparkExpense.map((v, i) => <div key={i} className="sp-b" style={{ height: `${Math.max(8, (v / Math.max(1, ...sparkExpense)) * 100)}%`, background: "var(--red)", opacity: i === sparkExpense.length - 1 ? 1 : 0.3 }} />)}</div>
              </div>
              <div className="cell c-k3">
                <div className="kpi-lbl">Poupança</div>
                <div className="kpi-val">€{savings.toFixed(2)}</div>
                <div className="kpi-foot"><span className="kpi-bdg up">{savingsRate.toFixed(1)}%</span><span className="kpi-since">taxa</span></div>
                <div className="spark">{sparkSavings.map((v, i) => <div key={i} className="sp-b" style={{ height: `${Math.max(8, (v / Math.max(1, ...sparkSavings)) * 100)}%`, background: "var(--blue)", opacity: i === sparkSavings.length - 1 ? 1 : 0.3 }} />)}</div>
              </div>
              <div className="cell c-k4">
                <div className="kpi-lbl">Net worth</div>
                <div className="kpi-val">€{netWorth.toFixed(2)}</div>
                <div className="kpi-foot"><span className="kpi-bdg nu">acumulado</span><span className="kpi-since">2026</span></div>
                <div className="spark">{sparkNetWorth.map((v, i) => <div key={i} className="sp-b" style={{ height: `${Math.max(8, (v / Math.max(1, ...sparkNetWorth)) * 100)}%`, background: "var(--purple)", opacity: i === sparkNetWorth.length - 1 ? 1 : 0.3 }} />)}</div>
              </div>

              <div className="cell c-bar">
                <div className="ph"><div><div className="pt">Tendência mensal</div><div className="ps">Income vs Expenses — últimos 6 meses</div></div></div>
                <div className="bc-area">
                  {orderedMonths.map((row) => {
                    const iH = Math.round((Number(row.income || 0) / barMax) * 82);
                    const eH = Math.round((Number(row.expense || 0) / barMax) * 82);
                    return (
                      <div key={row.month} className="bc-col">
                        <div className="bc-pair">
                          <div className="bc-seg" style={{ height: `${iH}px`, background: "var(--green)" }} />
                          <div className="bc-seg" style={{ height: `${eH}px`, background: "var(--red)", opacity: 0.7 }} />
                        </div>
                        <div className="bc-tick">{formatMonthLabel(row.month).split("/")[0]}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="bc-leg"><div className="lgi"><div className="lgd" style={{ background: "var(--green)" }} />Income</div><div className="lgi"><div className="lgd" style={{ background: "var(--red)" }} />Expenses</div></div>
              </div>

              <div className="cell c-pie">
                <div className="ph"><div><div className="pt">Por categoria</div><div className="ps">{formatMonthLabel(selectedMonth)}</div></div></div>
                <div className="pie-body">
                  <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
                    {(() => {
                      let angle = -Math.PI / 2;
                      return pieData.map((s, idx) => {
                        const slice = (s.pct / 100) * 2 * Math.PI;
                        const d = donutPath(44, 44, 36, 22, angle, angle + slice);
                        angle += slice;
                        return <path key={`${s.name}-${idx}`} d={d} fill={s.color} opacity={0.85} />;
                      });
                    })()}
                  </svg>
                  <div className="pie-leg">
                    {pieData.map((s) => (
                      <div key={s.name} className="pie-row"><div className="pie-sw" style={{ background: s.color }} /><div className="pie-nm">{s.name}</div><div className="pie-pc">{s.pct}%</div></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cell c-table" id="tx">
                <div className="ph"><div><div className="pt">Transações recentes</div><div className="ps">últimas 8 entradas</div></div></div>
                <div className="tw">
                  <table>
                    <thead>
                      <tr><th style={{ width: "32%" }}>Descrição</th><th style={{ width: "18%" }}>Categoria</th><th style={{ width: "14%" }}>Tipo</th><th style={{ width: "14%" }}>Data</th><th style={{ width: "22%", textAlign: "right" }}>Valor</th></tr>
                    </thead>
                    <tbody>
                      {recent.map((tx) => {
                        const amount = Number(tx.amount || 0);
                        const typeLabel = tx.type === "income" ? "receita" : "despesa";
                        return (
                          <tr key={tx.id}>
                            <td className="tdn">{tx.description || tx.category}</td>
                            <td>{tx.category}</td>
                            <td><span className={`bdg ${tx.type}`}>{typeLabel}</span></td>
                            <td>{formatDate(tx.transaction_date)}</td>
                            <td className={`tda ${tx.type === "income" ? "pos" : "neg"}`}>{tx.type === "income" ? "+" : "-"}€{Math.abs(amount).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cell c-mini">
                <div className="ph"><div className="pt">Distribuição</div></div>
                <div className="ml">
                  {pieData.map((d) => (
                    <div key={d.name} className="mi"><div className="mi-l"><div className="mi-lbl">{d.name}</div><div className="mi-trk"><div className="mi-fill" style={{ width: `${d.pct}%`, background: d.color }} /></div></div><div className="mi-val">{d.pct}%</div></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modules-grid">
              <div className="cell" id="bills"><div className="pt mb-3">Bills tracker</div><AddBillForm /></div>
              <div className="cell" id="subs"><div className="pt mb-3">Subscriptions</div><AddSubscriptionForm /></div>
              <div className="cell" id="goals"><div className="pt mb-3">Goals</div><AddGoalForm /></div>
              <div className="cell" id="debt"><div className="pt mb-3">Debt tracker</div><AddDebtForm /></div>
              <div className="cell" id="networth"><div className="pt mb-3">Net worth assets</div><AddAssetForm /></div>
              <div className="cell" id="budget"><div className="pt mb-3">Monthly budget</div><AddBudgetForm month={selectedMonth} />
                <div className="mini-budget mt-3">
                  {budgetCategories.slice(0, 6).map((category) => {
                    const budget = budgetMap.get(category) ?? 0;
                    const actual = actualMap.get(category) ?? 0;
                    const remaining = budget - actual;
                    return <div key={category} className="mi"><div className="mi-l"><div className="mi-lbl">{category}</div><div className="mi-trk"><div className="mi-fill" style={{ width: `${Math.min(100, budget > 0 ? (actual / budget) * 100 : 0)}%`, background: remaining >= 0 ? "var(--green)" : "var(--red)" }} /></div></div><div className="mi-val">{remaining >= 0 ? "Sobra" : "Excesso"}</div></div>;
                  })}
                </div>
              </div>
            </div>

            <div className="cell mt-2">
              <div className="pt mb-3">Adicionar transação</div>
              <AddTransactionForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
