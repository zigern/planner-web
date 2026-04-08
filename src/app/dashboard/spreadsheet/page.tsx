import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import "../dashboard-theme.css";

type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};
type AssetRow = { asset_type: string; value: string };
type MonthSummaryRow = { month: string; income: string; expense: string };
type BillRow = { name: string; due_day: number; status: "pending" | "paid" };

function monthIsoListForYear(year: number) {
  return Array.from({ length: 12 }).map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function parseLangParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "pt-PT";
  const allowed = new Set(["pt-PT", "en-US", "es-ES", "fr-FR"]);
  return allowed.has(raw) ? raw : "pt-PT";
}

function parseCurrencyParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "EUR";
  const allowed = new Set(["EUR", "USD", "GBP", "BRL"]);
  return allowed.has(raw) ? raw : "EUR";
}

function monthName(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-PT", { month: "short" });
}

function monthLabel(monthIso: string) {
  const [year, month] = monthIso.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmt(v: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v);
}

function dayMonthYear(v: string | Date) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export default async function SpreadsheetPage({
  searchParams
}: {
  searchParams?: Promise<{
    month?: string | string[];
    lang?: string | string[];
    currency?: string | string[];
  }>;
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
  const lang = parseLangParam(params?.lang);
  const currency = parseCurrencyParam(params?.currency);
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const monthOptions = monthIsoListForYear(selectedYear);

  const db = getDb();
  const txRows = await safeQueryRows<TxRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date ASC, id ASC
     LIMIT 80`,
    [user.userId, selectedMonth]
  );
  const assets = await safeQueryRows<AssetRow>(
    db,
    `SELECT asset_type, value
     FROM assets
     WHERE user_id = ?
     ORDER BY value DESC
     LIMIT 8`,
    [user.userId]
  );
  const summary = await safeQueryRows<MonthSummaryRow>(
    db,
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY month ASC
     LIMIT 12`,
    [user.userId]
  );
  const bills = await safeQueryRows<BillRow>(
    db,
    `SELECT name, due_day, status
     FROM bills
     WHERE user_id = ?`,
    [user.userId]
  );

  const initials = user.email.slice(0, 2).toUpperCase();
  const monthShort = monthName(selectedMonth);
  const lateBillSet = new Set(
    bills
      .filter((b) => b.status === "pending" && b.due_day < new Date().getDate())
      .map((b) => b.name.toLowerCase())
  );

  return (
    <div className="dash-wrap">
      <div className="dash-shell">
        <aside className="left-nav">
          <div className="brand-icon">{initials}</div>
          <div className="brand-name">Other Level&apos;s</div>
          <nav className="month-nav">
            {monthOptions.map((m) => (
              <Link
                key={m}
                href={`?month=${m}&lang=${lang}&currency=${currency}`}
                className={`month-link ${m === selectedMonth ? "active" : ""}`}
              >
                {monthName(m)}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="main-area spreadsheet-mode">
          <header className="top-row">
            <div className="title-block">
              <p className="kicker">Personal Finance Tracker</p>
              <h1>Available Balance</h1>
              <p className="balance income-number">
                {fmt(
                  summary.reduce((acc, s) => acc + Number(s.income || 0) - Number(s.expense || 0), 0),
                  lang,
                  currency
                )}
              </p>
            </div>

            <div className="center-tabs">
              <Link className="tab" href={`/dashboard?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="2" y="2" width="7" height="7" rx="1.2" fill="currentColor" />
                  <rect x="11" y="2" width="7" height="4" rx="1.2" fill="currentColor" />
                  <rect x="11" y="8" width="7" height="10" rx="1.2" fill="currentColor" />
                  <rect x="2" y="11" width="7" height="7" rx="1.2" fill="currentColor" />
                </svg>
                Dashboard
              </Link>
              <Link
                className="tab active"
                href={`/dashboard/spreadsheet?month=${selectedMonth}&lang=${lang}&currency=${currency}`}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="2" y="3" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="7" y1="8" x2="7" y2="17" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="12" y1="8" x2="12" y2="17" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Spreadsheet
              </Link>
            </div>

            <div className="date-card date-small">
              {new Date().toLocaleDateString(lang, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </div>

            <ViewControls lang={lang} currency={currency} />

            <div className="profile">
              <div className="avatar">{initials}</div>
              <LogoutButton className="logout-mini" label="Sair" />
            </div>
          </header>

          <section className="sheet-grid">
            <article className="sheet-main">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Main Type</th>
                    <th>Category</th>
                    <th>Sub-category</th>
                    <th>Amount</th>
                    <th>Bill Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txRows.map((tx) => {
                    const lower = `${tx.category} ${tx.description || ""}`.toLowerCase();
                    const isLate = Array.from(lateBillSet).some((b) => lower.includes(b));
                    return (
                      <tr key={tx.id}>
                        <td>{monthShort}</td>
                        <td>{tx.type === "income" ? "Income" : "Expenses"}</td>
                        <td>{tx.category}</td>
                        <td>{tx.description || "-"}</td>
                        <td>{fmt(Math.abs(Number(tx.amount || 0)), lang, currency)}</td>
                        <td>{dayMonthYear(tx.transaction_date)}</td>
                        <td className={isLate ? "late" : "paid"}>{isLate ? "Late" : "Paid"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>

            <aside className="sheet-side">
              <div className="sheet-box">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Assets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={`${a.asset_type}-${i}`}>
                        <td>{fmt(Number(a.value || 0), lang, currency)}</td>
                        <td>{a.asset_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sheet-box update">
                <p className="u-title">Last update</p>
                <p className="u-date">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>

              <div className="sheet-box">
                <table className="mini-table goal">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Income Goal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s) => (
                      <tr key={s.month}>
                        <td>{monthLabel(s.month)}</td>
                        <td>{fmt(Math.round(Number(s.income || 0) * 1.2), lang, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
