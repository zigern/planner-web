import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { AddTransactionForm } from "./components/add-transaction-form";
import { LogoutButton } from "./components/logout-button";
import "./dashboard-theme.css";
import {
  AddAssetForm,
  AddBillForm,
  AddBudgetForm,
  AddDebtForm,
  AddGoalForm,
  AddSubscriptionForm
} from "./components/planner-forms";

type TotalsRow = {
  income: string | null;
  expense: string | null;
};

type RecentRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};

type MonthSummaryRow = {
  month: string;
  income: string;
  expense: string;
};

type ExpenseByCategoryRow = {
  category: string;
  total: string;
};

type BillRow = {
  id: number;
  name: string;
  amount: string;
  due_day: number;
  frequency: "monthly" | "quarterly" | "yearly";
  status: "pending" | "paid";
};

type SubscriptionRow = {
  id: number;
  service: string;
  cost: string;
  billing_cycle: "monthly" | "yearly";
  category: string;
  status: "active" | "paused" | "cancelled";
};

type GoalRow = {
  id: number;
  name: string;
  target_amount: string;
  saved_amount: string;
  deadline: string | Date | null;
  status: "not_started" | "in_progress" | "completed";
};

type DebtRow = {
  id: number;
  name: string;
  total_owed: string;
  amount_paid: string;
  interest_rate: string;
};

type AssetRow = {
  id: number;
  name: string;
  asset_type: string;
  value: string;
};

type BudgetRow = {
  id: number;
  category: string;
  budget_amount: string;
};

function formatDate(value: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function getCurrentMonthIso() {
  return new Date().toISOString().slice(0, 7);
}

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return getCurrentMonthIso();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : getCurrentMonthIso();
}

function monthLabel(monthIso: string) {
  const [year, month] = monthIso.split("-");
  return `${month}/${year}`;
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

async function safeQueryRows<T>(
  db: ReturnType<typeof getDb>,
  sql: string,
  params: unknown[]
): Promise<T[]> {
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
          <p className="mt-3 text-amber-800">Cria o ficheiro <code>.env.local</code> com:</p>
          <pre className="mt-4 overflow-auto rounded-lg bg-white p-4 text-sm">
{`MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_DATABASE=...
MYSQL_USER=...
MYSQL_PASSWORD=...
AUTH_SECRET=...`}
          </pre>
          <p className="mt-3 text-sm text-amber-800">Depois faz refresh.</p>
        </section>
      </main>
    );
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedMonth = parseMonthParam(params?.month);
  const selectedMonthLabel = monthLabel(selectedMonth);

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
     LIMIT 10`,
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
     LIMIT 8`,
    [user.userId, selectedMonth]
  );

  const bills = await safeQueryRows<BillRow>(
    db,
    `SELECT id, name, amount, due_day, frequency, status
     FROM bills
     WHERE user_id = ?
     ORDER BY due_day ASC, id DESC
     LIMIT 8`,
    [user.userId]
  );

  const subscriptions = await safeQueryRows<SubscriptionRow>(
    db,
    `SELECT id, service, cost, billing_cycle, category, status
     FROM subscriptions
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 8`,
    [user.userId]
  );

  const goals = await safeQueryRows<GoalRow>(
    db,
    `SELECT id, name, target_amount, saved_amount, deadline, status
     FROM goals
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 8`,
    [user.userId]
  );

  const debts = await safeQueryRows<DebtRow>(
    db,
    `SELECT id, name, total_owed, amount_paid, interest_rate
     FROM debts
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 8`,
    [user.userId]
  );

  const assets = await safeQueryRows<AssetRow>(
    db,
    `SELECT id, name, asset_type, value
     FROM assets
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 8`,
    [user.userId]
  );

  const budgets = await safeQueryRows<BudgetRow>(
    db,
    `SELECT id, category, budget_amount
     FROM monthly_budgets
     WHERE user_id = ?
       AND budget_month = ?
     ORDER BY category ASC`,
    [user.userId, selectedMonth]
  );

  const totals = totalsRows[0] || { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const savings = income - expense;

  const assetsTotal = assets.reduce((acc, row) => acc + Number(row.value || 0), 0);
  const debtOpenTotal = debts.reduce(
    (acc, row) => acc + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)),
    0
  );
  const netWorth = assetsTotal - debtOpenTotal + savings;

  const subscriptionsMonthly = subscriptions.reduce((acc, row) => {
    const value = Number(row.cost || 0);
    return acc + (row.billing_cycle === "yearly" ? value / 12 : value);
  }, 0);

  const billsPending = bills
    .filter((row) => row.status === "pending")
    .reduce((acc, row) => acc + Number(row.amount || 0), 0);

  const goalsProgress = goals.map((goal) => {
    const target = Number(goal.target_amount || 0);
    const saved = Number(goal.saved_amount || 0);
    const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    return {
      ...goal,
      target,
      saved,
      progress
    };
  });

  const budgetMap = new Map(budgets.map((row) => [row.category, Number(row.budget_amount || 0)]));
  const actualMap = new Map(expenseByCategory.map((row) => [row.category, Number(row.total || 0)]));
  const budgetCategories = Array.from(new Set([...budgetMap.keys(), ...actualMap.keys()]));

  const monthOptions = lastMonths(12);
  const chartRows = [...summary].reverse();
  const chartMax = Math.max(
    1,
    ...chartRows.flatMap((row) => [Number(row.income || 0), Number(row.expense || 0)])
  );
  const categoryMax = Math.max(1, ...expenseByCategory.map((row) => Number(row.total || 0)));

  return (
    <div className="bf-shell">
      <aside className="bf-sidebar">
        <div className="bf-logo">
          <div className="bf-logo-mark" />
          <div>
            <div className="bf-logo-name">BudgetFlow</div>
            <div className="bf-logo-year">2026</div>
          </div>
        </div>

        <div className="bf-nav-group">
          <div className="bf-nav-title">Overview</div>
          <Link className="bf-nav-link active" href="/dashboard">
            Dashboard
          </Link>
        </div>
        <div className="bf-nav-group">
          <div className="bf-nav-title">Tracking</div>
          <a className="bf-nav-link" href="#transactions">
            Income & Expenses
          </a>
          <a className="bf-nav-link" href="#bills">
            Bills
          </a>
          <a className="bf-nav-link" href="#subscriptions">
            Subscriptions
          </a>
        </div>
        <div className="bf-nav-group">
          <div className="bf-nav-title">Planning</div>
          <a className="bf-nav-link" href="#goals">
            Goals
          </a>
          <a className="bf-nav-link" href="#debt">
            Debt tracker
          </a>
          <a className="bf-nav-link" href="#networth">
            Net worth
          </a>
          <a className="bf-nav-link" href="#budget">
            Monthly budget
          </a>
        </div>
      </aside>

      <main className="bf-main">
        <header className="bf-topbar">
          <div className="bf-page-title">Olá, {user.email}</div>
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="month" className="text-sm text-slate-600">
              Mês
            </label>
            <select
              id="month"
              name="month"
              defaultValue={selectedMonth}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
              Filtrar
            </button>
          </form>
          <Link
            href={`/api/transactions/export?month=${selectedMonth}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            Export CSV
          </Link>
          <LogoutButton />
        </header>
        <div className="bf-content">

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ["Income", income],
          ["Expenses", expense],
          ["Savings", savings],
          ["Assets", assetsTotal],
          ["Open Debt", debtOpenTotal],
          ["Net Worth", netWorth]
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">€{Number(value).toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">{selectedMonthLabel}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div id="subscriptions" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Tendência mensal (Income vs Expenses)</h2>
          <div className="mt-4 space-y-2">
            {chartRows.length === 0 ? (
              <p className="text-sm text-slate-500">Sem dados para o gráfico.</p>
            ) : (
              chartRows.map((row) => {
                const rowIncome = Number(row.income || 0);
                const rowExpense = Number(row.expense || 0);
                return (
                  <div key={row.month} className="grid grid-cols-[70px_1fr] items-center gap-3">
                    <p className="text-xs font-medium text-slate-600">{monthLabel(row.month)}</p>
                    <div className="space-y-1">
                      <div className="h-2 rounded bg-slate-100">
                        <div
                          className="h-2 rounded bg-emerald-500"
                          style={{ width: `${Math.max(2, (rowIncome / chartMax) * 100)}%` }}
                        />
                      </div>
                      <div className="h-2 rounded bg-slate-100">
                        <div
                          className="h-2 rounded bg-rose-500"
                          style={{ width: `${Math.max(2, (rowExpense / chartMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Despesas por categoria ({selectedMonthLabel})</h2>
          <div className="mt-4 space-y-2">
            {expenseByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">Sem despesas no mês selecionado.</p>
            ) : (
              expenseByCategory.map((row) => {
                const value = Number(row.total || 0);
                return (
                  <div key={row.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <p className="font-medium text-slate-700">{row.category}</p>
                      <p className="text-slate-600">€{value.toFixed(2)}</p>
                    </div>
                    <div className="h-2 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-brand-500"
                        style={{ width: `${Math.max(2, (value / categoryMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section id="transactions" className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <AddTransactionForm />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Últimas transações</h2>
          <div className="mt-4 space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">Ainda sem transações.</p>
            ) : (
              recent.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.category}</p>
                    <p className={`text-sm font-semibold ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {item.type === "income" ? "+" : "-"}€{Number(item.amount).toFixed(2)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(item.transaction_date)} · {item.description || "Sem descrição"}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="bills" className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Bills tracker</h2>
          <p className="mt-1 text-sm text-slate-500">Pendente este mês: €{billsPending.toFixed(2)}</p>
          <div className="mt-3">
            <AddBillForm />
          </div>
          <div className="mt-3 space-y-2">
            {bills.length === 0 ? (
              <p className="text-sm text-slate-500">Sem contas fixas.</p>
            ) : (
              bills.map((bill) => (
                <article key={bill.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{bill.name}</p>
                    <p>€{Number(bill.amount).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Dia {bill.due_day} · {bill.frequency} · {bill.status}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          <p className="mt-1 text-sm text-slate-500">Custo mensal estimado: €{subscriptionsMonthly.toFixed(2)}</p>
          <div className="mt-3">
            <AddSubscriptionForm />
          </div>
          <div className="mt-3 space-y-2">
            {subscriptions.length === 0 ? (
              <p className="text-sm text-slate-500">Sem subscrições.</p>
            ) : (
              subscriptions.map((sub) => (
                <article key={sub.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{sub.service}</p>
                    <p>€{Number(sub.cost).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {sub.billing_cycle} · {sub.category} · {sub.status}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Monthly budget by category</h2>
          <div className="mt-3">
            <AddBudgetForm month={selectedMonth} />
          </div>
          <div className="mt-3 space-y-2">
            {budgetCategories.length === 0 ? (
              <p className="text-sm text-slate-500">Sem orçamento para {selectedMonthLabel}.</p>
            ) : (
              budgetCategories.map((category) => {
                const budget = budgetMap.get(category) ?? 0;
                const actual = actualMap.get(category) ?? 0;
                const remaining = budget - actual;
                return (
                  <article key={category} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{category}</p>
                      <p className={remaining >= 0 ? "text-emerald-700" : "text-rose-700"}>
                        {remaining >= 0 ? "Sobra" : "Excesso"} €{Math.abs(remaining).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Budget €{budget.toFixed(2)} · Gasto €{actual.toFixed(2)}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section id="goals" className="mt-8 grid gap-6 lg:grid-cols-3">
        <div id="debt" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Financial goals</h2>
          <div className="mt-3">
            <AddGoalForm />
          </div>
          <div className="mt-3 space-y-2">
            {goalsProgress.length === 0 ? (
              <p className="text-sm text-slate-500">Sem objetivos.</p>
            ) : (
              goalsProgress.map((goal) => (
                <article key={goal.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{goal.name}</p>
                    <p>{goal.progress.toFixed(0)}%</p>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.max(2, goal.progress)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    €{goal.saved.toFixed(2)} / €{goal.target.toFixed(2)} · deadline {formatDate(goal.deadline)}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>

        <div id="networth" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Debt tracker</h2>
          <div className="mt-3">
            <AddDebtForm />
          </div>
          <div className="mt-3 space-y-2">
            {debts.length === 0 ? (
              <p className="text-sm text-slate-500">Sem dívidas.</p>
            ) : (
              debts.map((debt) => {
                const total = Number(debt.total_owed || 0);
                const paid = Number(debt.amount_paid || 0);
                const remaining = Math.max(0, total - paid);
                const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                return (
                  <article key={debt.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{debt.name}</p>
                      <p className="text-rose-700">€{remaining.toFixed(2)}</p>
                    </div>
                    <div className="mt-1 h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-brand-500" style={{ width: `${Math.max(2, progress)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Pago €{paid.toFixed(2)} / €{total.toFixed(2)} · juros {Number(debt.interest_rate || 0).toFixed(2)}%
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Net worth assets</h2>
          <div className="mt-3">
            <AddAssetForm />
          </div>
          <div className="mt-3 space-y-2">
            {assets.length === 0 ? (
              <p className="text-sm text-slate-500">Sem ativos.</p>
            ) : (
              assets.map((asset) => (
                <article key={asset.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-emerald-700">€{Number(asset.value).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-slate-500">{asset.asset_type}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="budget" className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Resumo dos últimos meses</h2>
        <div className="mt-4 space-y-2">
          {summary.length === 0 ? (
            <p className="text-sm text-slate-500">Sem dados suficientes para mostrar resumo.</p>
          ) : (
            summary.map((row) => {
              const rowIncome = Number(row.income || 0);
              const rowExpense = Number(row.expense || 0);
              const rowBalance = rowIncome - rowExpense;
              return (
                <div
                  key={row.month}
                  className="grid grid-cols-[90px_1fr] items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <p className="text-sm font-medium">{monthLabel(row.month)}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <p className="text-emerald-600">Income €{rowIncome.toFixed(2)}</p>
                    <p className="text-rose-600">Expense €{rowExpense.toFixed(2)}</p>
                    <p className={rowBalance >= 0 ? "text-brand-700" : "text-rose-700"}>
                      Balance €{rowBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
        </div>
      </main>
    </div>
  );
}
