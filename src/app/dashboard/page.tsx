import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { AddTransactionForm } from "./components/add-transaction-form";
import { LogoutButton } from "./components/logout-button";
import Link from "next/link";

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

function formatTransactionDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
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

  const db = getDb();
  const [totalsRows] = await db.query(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
    [user.userId, selectedMonth]
  );

  const totals = (totalsRows as TotalsRow[])[0] || { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const savings = income - expense;

  const [recentRows] = await db.query(
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 10`,
    [user.userId, selectedMonth]
  );

  const recent = recentRows as RecentRow[];
  const [summaryRows] = await db.query(
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
  const summary = summaryRows as MonthSummaryRow[];
  const monthOptions = lastMonths(12);
  const selectedMonthLabel = monthLabel(selectedMonth);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-brand-700">Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {user.email}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Income", income],
          ["Expenses", expense],
          ["Savings", savings],
          ["Net Worth", savings]
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">€{Number(value).toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">{selectedMonthLabel}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
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
                    {formatTransactionDate(item.transaction_date)} · {item.description || "Sem descrição"}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
    </main>
  );
}
