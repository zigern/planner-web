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

function parsePresetParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "month";
  return raw === "month" || raw === "30d" || raw === "90d" ? raw : "month";
}

function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function isoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getMonthBounds(isoMonth: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  const end = new Date(year, month, 0);
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  };
}

function monthFromDate(v: string | Date, lang: string) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(lang, { month: "short" });
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

function dayMonthYear(v: string | Date, lang: string) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" });
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
    preset?: string | string[];
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
  const preset = parsePresetParam(params?.preset);
  const fromFilter = parseDateParam(params?.from);
  const toFilter = parseDateParam(params?.to);
  const queryFilter = parseTextParam(params?.q);
  const currentPage = parsePageParam(params?.page);
  const pageSize = 25;
  const monthBounds = getMonthBounds(selectedMonth);
  const todayIso = isoDate(new Date());
  const last30Iso = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const last90Iso = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));
  const effectiveFrom = fromFilter || (preset === "30d" ? last30Iso : preset === "90d" ? last90Iso : monthBounds.from);
  const effectiveTo = toFilter || (preset === "month" ? monthBounds.to : todayIso);
  const periodLabel = `${effectiveFrom} → ${effectiveTo}`;

  const db = getDb();
  const where: string[] = ["user_id = ?"];
  const values: unknown[] = [user.userId];
  where.push("DATE(transaction_date) >= ?");
  values.push(effectiveFrom);
  where.push("DATE(transaction_date) <= ?");
  values.push(effectiveTo);
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
       AND DATE(transaction_date) >= ?
       AND DATE(transaction_date) <= ?
     ORDER BY category ASC`,
    [user.userId, effectiveFrom, effectiveTo]
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

  const presetBase = new URLSearchParams({
    month: selectedMonth,
    lang,
    currency,
    type: typeFilter,
    category: categoryFilter,
    status: statusFilter,
    q: queryFilter
  });
  const monthPresetHref = `/dashboard/spreadsheet?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "month");
    p.set("from", monthBounds.from);
    p.set("to", monthBounds.to);
    p.set("page", "1");
    return p.toString();
  })()}`;
  const last30PresetHref = `/dashboard/spreadsheet?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "30d");
    p.set("from", last30Iso);
    p.set("to", todayIso);
    p.set("page", "1");
    return p.toString();
  })()}`;
  const last90PresetHref = `/dashboard/spreadsheet?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "90d");
    p.set("from", last90Iso);
    p.set("to", todayIso);
    p.set("page", "1");
    return p.toString();
  })()}`;
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
    preset,
    type: typeFilter,
    category: categoryFilter,
    status: statusFilter,
    from: effectiveFrom,
    to: effectiveTo,
    q: queryFilter
  });

  const csvHeader = ["Month", "Main Type", "Category", "Sub-category", "Amount", "Bill Due Date", "Status"];
  const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csvLines = [
    csvHeader.map(csvEscape).join(","),
    ...filteredByStatus.map((tx) =>
      [
        monthFromDate(tx.transaction_date, lang),
        tx.type === "income" ? "Income" : "Expenses",
        tx.category,
        tx.description || "-",
        Math.abs(Number(tx.amount || 0)).toFixed(2),
        dayMonthYear(tx.transaction_date, lang),
        tx.uiStatus === "late" ? "Late" : "Paid"
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    )
  ];
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvLines.join("\n"))}`;
  const text = lang === "pt-PT"
    ? {
        title: "Spreadsheet",
        subtitle: "Visão tabular com filtros, exportação e paginação",
        period: "Período",
        thisMonth: "Este mês",
        last30d: "Últimos 30 dias",
        last90d: "Últimos 90 dias",
        apply: "Aplicar",
        clear: "Limpar",
        export: "Exportar CSV",
        allTypes: "Todos os tipos",
        allCategories: "Todas as categorias",
        allStatus: "Todos os estados",
        income: "Receita",
        expense: "Despesa",
        paid: "Pago",
        late: "Atrasado",
        month: "Mês",
        mainType: "Tipo",
        category: "Categoria",
        subCategory: "Subcategoria",
        amount: "Valor",
        from: "De",
        to: "Até",
        search: "Pesquisar",
        dueDate: "Data",
        status: "Estado",
        noRows: "Sem movimentos para este filtro.",
        previous: "Anterior",
        next: "Seguinte",
        page: "Página",
        showing: "A mostrar",
        of: "de",
        assets: "Ativos",
        lastUpdate: "Última atualização",
        incomeGoal: "Meta receita"
      }
    : {
        title: "Spreadsheet",
        subtitle: "Tabular view with filters, export, and pagination",
        period: "Period",
        thisMonth: "This month",
        last30d: "Last 30 days",
        last90d: "Last 90 days",
        apply: "Apply",
        clear: "Clear",
        export: "Export CSV",
        allTypes: "All Types",
        allCategories: "All Categories",
        allStatus: "All Status",
        income: "Income",
        expense: "Expense",
        paid: "Paid",
        late: "Late",
        month: "Month",
        mainType: "Main Type",
        category: "Category",
        subCategory: "Sub-category",
        amount: "Amount",
        from: "From",
        to: "To",
        search: "Search",
        dueDate: "Bill Due Date",
        status: "Status",
        noRows: "No rows for this filter.",
        previous: "Previous",
        next: "Next",
        page: "Page",
        showing: "Showing",
        of: "of",
        assets: "Assets",
        lastUpdate: "Last update",
        incomeGoal: "Income Goal"
      };
  const name = user.email.split("@")[0];

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
            <div className="search-box">{selectedMonth}</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{name.slice(0, 2).toUpperCase()}</div>
            <LogoutButton className="logout-light" label={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          </div>
        </div>
        <div className="workspace-shell">
          <DashboardSidebar current="spreadsheet" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main spreadsheet-mode">
            <div className="greeting-row">
              <div>
                <h1>{text.title}</h1>
                <p>{text.subtitle}</p>
                <p className="budgets-period-label">{text.period}: {periodLabel}</p>
              </div>
              <div className="cta-row">
                <div className="activity-preset-group">
                  <Link className={`activity-preset ${preset === "month" ? "active" : ""}`} href={monthPresetHref}>
                    {text.thisMonth}
                  </Link>
                  <Link className={`activity-preset ${preset === "30d" ? "active" : ""}`} href={last30PresetHref}>
                    {text.last30d}
                  </Link>
                  <Link className={`activity-preset ${preset === "90d" ? "active" : ""}`} href={last90PresetHref}>
                    {text.last90d}
                  </Link>
                </div>
                <Link className="btn" href={csvHref} download={`spreadsheet-${selectedMonth}.csv`}>
                  {text.export}
                </Link>
              </div>
            </div>

            <section className="sheet-grid">
              <article className="sheet-main">
                <form className="sheet-filters" method="get">
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="currency" value={currency} />
                  <input type="hidden" name="preset" value={preset} />

                  <div className="sheet-filter-line sheet-filter-line-main">
                    <label className="sheet-filter-field">
                      <span>{text.mainType}</span>
                      <select name="type" defaultValue={typeFilter}>
                        <option value="all">{text.allTypes}</option>
                        <option value="income">{text.income}</option>
                        <option value="expense">{text.expense}</option>
                      </select>
                    </label>

                    <label className="sheet-filter-field">
                      <span>{text.category}</span>
                      <select name="category" defaultValue={categoryFilter}>
                        <option value="all">{text.allCategories}</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="sheet-filter-field">
                      <span>{text.status}</span>
                      <select name="status" defaultValue={statusFilter}>
                        <option value="all">{text.allStatus}</option>
                        <option value="paid">{text.paid}</option>
                        <option value="late">{text.late}</option>
                      </select>
                    </label>
                  </div>

                  <div className="sheet-filter-line sheet-filter-line-dates">
                    <label className="sheet-filter-field">
                      <span>{text.from}</span>
                      <input type="date" name="from" defaultValue={effectiveFrom} />
                    </label>
                    <label className="sheet-filter-field">
                      <span>{text.to}</span>
                      <input type="date" name="to" defaultValue={effectiveTo} />
                    </label>
                    <label className="sheet-filter-field sheet-filter-field-search">
                      <span>{text.search}</span>
                      <input type="text" name="q" defaultValue={queryFilter} placeholder={`${text.search} ${text.category.toLowerCase()}/${text.subCategory.toLowerCase()}`} />
                    </label>
                  </div>

                  <div className="sheet-filter-actions">
                    <button type="submit">{text.apply}</button>
                    <Link href={`?month=${selectedMonth}&lang=${lang}&currency=${currency}&preset=month&from=${monthBounds.from}&to=${monthBounds.to}`}>{text.clear}</Link>
                    <a href={csvHref} download={`spreadsheet-${selectedMonth}.csv`}>
                      {text.export}
                    </a>
                  </div>
                </form>

                <div className="activity-table-wrap">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th>{text.month}</th>
                        <th>{text.mainType}</th>
                        <th>{text.category}</th>
                        <th>{text.subCategory}</th>
                        <th>{text.amount}</th>
                        <th>{text.dueDate}</th>
                        <th>{text.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.length ? (
                        pagedItems.map((tx) => {
                          return (
                            <tr key={tx.id}>
                              <td>{monthFromDate(tx.transaction_date, lang)}</td>
                              <td>{tx.type === "income" ? text.income : text.expense}</td>
                              <td>{tx.category}</td>
                              <td>{tx.description || "-"}</td>
                              <td>{fmt(Math.abs(Number(tx.amount || 0)), lang, currency)}</td>
                              <td>{dayMonthYear(tx.transaction_date, lang)}</td>
                              <td className={tx.uiStatus === "late" ? "late" : "paid"}>
                                {tx.uiStatus === "late" ? text.late : text.paid}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7}>{text.noRows}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="sheet-pagination">
                  <span>
                    {text.showing} {totalItems ? start + 1 : 0}-{Math.min(start + pageSize, totalItems)} {text.of} {totalItems}
                  </span>
                  <div className="sheet-pagination-actions">
                    {safePage > 1 ? (
                      <Link href={`?${new URLSearchParams({ ...Object.fromEntries(queryBase.entries()), page: String(safePage - 1) }).toString()}`}>
                        {text.previous}
                      </Link>
                    ) : (
                      <span className="disabled">{text.previous}</span>
                    )}
                    <span>
                      {text.page} {safePage}/{totalPages}
                    </span>
                    {safePage < totalPages ? (
                      <Link href={`?${new URLSearchParams({ ...Object.fromEntries(queryBase.entries()), page: String(safePage + 1) }).toString()}`}>
                        {text.next}
                      </Link>
                    ) : (
                      <span className="disabled">{text.next}</span>
                    )}
                  </div>
                </div>
              </article>

              <aside className="sheet-side">
                <div className="sheet-box">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>{text.amount}</th>
                        <th>{text.assets}</th>
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
                  <p className="u-title">{text.lastUpdate}</p>
                  <p className="u-date">
                    {new Date().toLocaleDateString(lang, {
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
                        <th>{text.month}</th>
                        <th>{text.incomeGoal}</th>
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
