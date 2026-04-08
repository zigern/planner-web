import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { AddTransactionForm } from "./components/add-transaction-form";
import { LogoutButton } from "./components/logout-button";

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

function formatTransactionDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
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

  const db = getDb();
  const [totalsRows] = await db.query(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?`,
    [user.userId]
  );

  const totals = (totalsRows as TotalsRow[])[0] || { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const savings = income - expense;

  const [recentRows] = await db.query(
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 10`,
    [user.userId]
  );

  const recent = recentRows as RecentRow[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-brand-700">Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {user.email}</h1>
        </div>
        <LogoutButton />
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
    </main>
  );
}
