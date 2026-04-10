import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { DashboardSidebar } from "../components/sidebar-nav";
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
type CategoryRow = { category: string };

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

function parseTypeParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "all";
  return raw === "income" || raw === "expense" ? raw : "all";
}

function parseStatusParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "all";
  return raw === "late" || raw === "paid" ? raw : "all";
}

function parseDateParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function parseTextParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  return raw.trim().slice(0, 80);
}

function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
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
    type?: string | string[];
    category?: string | string[];
    status?: string | string[];
    from?: string | string[];
    to?: string | string[];
    q?: string | string[];
    page?: string | string[];
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
  const typeFilter = parseTypeParam(params?.type);
  const categoryFilter = parseTextParam(params?.category) || "all";
  const statusFilter = parseStatusParam(params?.status);
  const fromFilter = parseDateParam(params?.from);
  const toFilter = parseDateParam(params?.to);
  const queryFilter = parseTextParam(params?.q);
  const currentPage = parsePageParam(params?.page);
  const pageSize = 25;

  const db = getDb();
  const where: string[] = ["user_id = ?", "DATE_FORMAT(transaction_date, '%Y-%m') = ?"];
  const values: unknown[] = [user.userId, selectedMonth];
  if (typeFilter !== "all") {
    where.push("type = ?");
    values.push(typeFilter);
  }
  if (categoryFilter !== "all") {
    where.push("category = ?");
    values.push(categoryFilter);
  }
  if (fromFilter) {
    where.push("DATE(transaction_date) >= ?");
    values.push(fromFilter);
  }
  if (toFilter) {
    where.push("DATE(transaction_date) <= ?");
    values.push(toFilter);
  }
  if (queryFilter) {
    where.push("(LOWER(category) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)");
    const q = `%${queryFilter.toLowerCase()}%`;
    values.push(q, q);
  }

  const txRows = await safeQueryRows<TxRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE ${where.join(" AND ")}
     ORDER BY transaction_date DESC, id DESC
     LIMIT 500`,
    values
  );
  const categoryRows = await safeQueryRows<CategoryRow>(
    db,
    `SELECT DISTINCT category
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY category ASC`,
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
  const categories = categoryRows.map((row) => row.category).filter(Boolean);

  const txWithStatus = txRows.map((tx) => {
    const lower = `${tx.category} ${tx.description || ""}`.toLowerCase();
    const isLate = Array.from(lateBillSet).some((b) => lower.includes(b));
    return {
      ...tx,
      uiStatus: (isLate ? "late" : "paid") as "late" | "paid"
    };
  });

  const filteredByStatus = statusFilter === "all" ? txWithStatus : txWithStatus.filter((tx) => tx.uiStatus === statusFilter);
  const totalItems = filteredByStatus.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedItems = filteredByStatus.slice(start, start + pageSize);

  const queryBase = new URLSearchParams({
    month: selectedMonth,
    lang,
    currency,
    type: typeFilter,
    category: categoryFilter,
    status: statusFilter,
    from: fromFilter,
    to: toFilter,
    q: queryFilter
  });

  const csvHeader = ["Month", "Main Type", "Category", "Sub-category", "Amount", "Bill Due Date", "Status"];
  const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csvLines = [
    csvHeader.map(csvEscape).join(","),
    ...filteredByStatus.map((tx) =>
      [
        monthShort,
        tx.type === "income" ? "Income" : "Expenses",
        tx.category,
        tx.description || "-",
        Math.abs(Number(tx.amount || 0)).toFixed(2),
        dayMonthYear(tx.transaction_date),
        tx.uiStatus === "late" ? "Late" : "Paid"
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    )
  ];
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvLines.join("\n"))}`;

  return (
    <div className="casha-wrap">
      <div className="casha-shell">
        <div className="workspace-shell">
          <DashboardSidebar current="spreadsheet" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main spreadsheet-mode">
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
              <form className="sheet-filters" method="get">
                <input type="hidden" name="month" value={selectedMonth} />
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="currency" value={currency} />

                <select name="type" defaultValue={typeFilter}>
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select name="category" defaultValue={categoryFilter}>
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select name="status" defaultValue={statusFilter}>
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="late">Late</option>
                </select>

                <input type="date" name="from" defaultValue={fromFilter} />
                <input type="date" name="to" defaultValue={toFilter} />
                <input type="text" name="q" defaultValue={queryFilter} placeholder="Search category/detail" />

                <button type="submit">Apply</button>
                <Link href={`?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>Clear</Link>
                <a href={csvHref} download={`spreadsheet-${selectedMonth}.csv`}>
                  Export CSV
                </a>
              </form>

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
                  {pagedItems.length ? (
                    pagedItems.map((tx) => {
                      return (
                        <tr key={tx.id}>
                          <td>{monthShort}</td>
                          <td>{tx.type === "income" ? "Income" : "Expenses"}</td>
                          <td>{tx.category}</td>
                          <td>{tx.description || "-"}</td>
                          <td>{fmt(Math.abs(Number(tx.amount || 0)), lang, currency)}</td>
                          <td>{dayMonthYear(tx.transaction_date)}</td>
                          <td className={tx.uiStatus === "late" ? "late" : "paid"}>
                            {tx.uiStatus === "late" ? "Late" : "Paid"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7}>No rows for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="sheet-pagination">
                <span>
                  Showing {totalItems ? start + 1 : 0}-{Math.min(start + pageSize, totalItems)} of {totalItems}
                </span>
                <div className="sheet-pagination-actions">
                  {safePage > 1 ? (
                    <Link href={`?${new URLSearchParams({ ...Object.fromEntries(queryBase.entries()), page: String(safePage - 1) }).toString()}`}>
                      Previous
                    </Link>
                  ) : (
                    <span className="disabled">Previous</span>
                  )}
                  <span>
                    Page {safePage}/{totalPages}
                  </span>
                  {safePage < totalPages ? (
                    <Link href={`?${new URLSearchParams({ ...Object.fromEntries(queryBase.entries()), page: String(safePage + 1) }).toString()}`}>
                      Next
                    </Link>
                  ) : (
                    <span className="disabled">Next</span>
                  )}
                </div>
              </div>
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
    </div>
  );
}
