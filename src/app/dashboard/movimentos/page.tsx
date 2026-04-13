import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { formatMoneyConverted } from "@/lib/currency-conversion";
import { LogoutButton } from "../components/logout-button";
import { QuickAddForm } from "../components/quick-add-form";
import { ViewControls } from "../components/view-controls";
import { ActivityDeleteButton } from "../components/activity-delete-button";
import { DashboardSidebar } from "../components/sidebar-nav";
import { translateExpenseCategory } from "../utils/category-translation";
import "../dashboard-theme.css";

type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function parseDateParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function parsePresetParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "month";
  return raw === "month" || raw === "30d" || raw === "90d" ? raw : "month";
}

function isoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
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
  return formatMoneyConverted(value, lang, currency, 2);
}

function formatDate(value: string | Date, lang: string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(lang, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getText(lang: string) {
  if (lang === "pt-PT") {
    return {
      title: "Movimentos",
      subtitle: "Adicionar entradas e saídas",
      formTitle: "Novo movimento",
      listTitle: "Registos do período",
      quickRanges: "Atalhos",
      thisMonth: "Este mês",
      last30Days: "Últimos 30 dias",
      last90Days: "Últimos 90 dias",
      noItems: "Sem movimentos para este mês.",
      date: "Data",
      kind: "Tipo",
      category: "Categoria",
      detail: "Detalhe",
      amount: "Valor",
      action: "Ação",
      income: "Entrada",
      expense: "Saída",
      cancel: "Anular",
      cancelConfirm: "Queres anular este registo?"
    };
  }

  return {
    title: "Movements",
    subtitle: "Add money in and out records",
    formTitle: "New movement",
    listTitle: "Period records",
    quickRanges: "Quick ranges",
    thisMonth: "This month",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    noItems: "No transactions found for this month.",
    date: "Date",
    kind: "Type",
    category: "Category",
    detail: "Detail",
    amount: "Amount",
    action: "Action",
    income: "Income",
    expense: "Expense",
    cancel: "Cancel",
    cancelConfirm: "Do you want to cancel this record?"
  };
}

export default async function MovimentosPage({
  searchParams
}: {
  searchParams?: Promise<{
    month?: string | string[];
    lang?: string | string[];
    currency?: string | string[];
    from?: string | string[];
    to?: string | string[];
    preset?: string | string[];
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
  const presetFilter = parsePresetParam(params?.preset);
  const fromParam = parseDateParam(params?.from);
  const toParam = parseDateParam(params?.to);
  const text = getText(lang);

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = isoDate(new Date(year, month - 1, 1));
  const monthEnd = isoDate(new Date(year, month, 0));
  const todayIso = isoDate(new Date());
  const last30Iso = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const last90Iso = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));

  const effectiveFrom =
    fromParam || (presetFilter === "30d" ? last30Iso : presetFilter === "90d" ? last90Iso : monthStart);
  const effectiveTo = toParam || (presetFilter === "month" ? monthEnd : todayIso);

  const db = getDb();
  const [rows] = await db.query(
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE(transaction_date) >= ?
       AND DATE(transaction_date) <= ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 300`,
    [user.userId, effectiveFrom, effectiveTo]
  );

  const items = rows as TxRow[];
  const name = user.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  const presetBase = new URLSearchParams({
    month: selectedMonth,
    lang,
    currency
  });
  const monthPresetHref = `/dashboard/movimentos?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "month");
    p.set("from", monthStart);
    p.set("to", monthEnd);
    return p.toString();
  })()}`;
  const last30PresetHref = `/dashboard/movimentos?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "30d");
    p.set("from", last30Iso);
    p.set("to", todayIso);
    return p.toString();
  })()}`;
  const last90PresetHref = `/dashboard/movimentos?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "90d");
    p.set("from", last90Iso);
    p.set("to", todayIso);
    return p.toString();
  })()}`;

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
            <div className="search-box">{lang === "pt-PT" ? "Pesquisar" : "Search"}</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{initials}</div>
            <LogoutButton className="logout-light" label={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          </div>
        </div>
        <div className="workspace-shell">
          <DashboardSidebar current="movements" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main">
          <section className="greeting-row">
            <div>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
            </div>
          </section>

          <section className="movement-grid">
            <article className="panel">
              <div className="panel-head">
                <h3>{text.formTitle}</h3>
              </div>
              <QuickAddForm lang={lang} />
            </article>

            <article className="panel activity-panel">
              <div className="movement-toolbar">
                <div className="panel-head movement-list-head">
                  <h3>{text.listTitle}</h3>
                </div>
                <div className="activity-preset-group" aria-label={text.quickRanges}>
                  <Link className={`activity-preset ${presetFilter === "month" ? "active" : ""}`} href={monthPresetHref}>
                    {text.thisMonth}
                  </Link>
                  <Link className={`activity-preset ${presetFilter === "30d" ? "active" : ""}`} href={last30PresetHref}>
                    {text.last30Days}
                  </Link>
                  <Link className={`activity-preset ${presetFilter === "90d" ? "active" : ""}`} href={last90PresetHref}>
                    {text.last90Days}
                  </Link>
                </div>
              </div>
              <div className="activity-table-wrap">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>{text.date}</th>
                      <th>{text.kind}</th>
                      <th>{text.category}</th>
                      <th>{text.detail}</th>
                      <th>{text.amount}</th>
                      <th>{text.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length ? (
                      items.map((tx) => {
                        const isIncome = tx.type === "income";
                        return (
                          <tr key={tx.id}>
                            <td>{formatDate(tx.transaction_date, lang)}</td>
                            <td>
                              <span className={`activity-kind ${isIncome ? "in" : "out"}`}>
                                {isIncome ? text.income : text.expense}
                              </span>
                            </td>
                            <td>{translateExpenseCategory(tx.category, lang)}</td>
                            <td>{tx.description || "—"}</td>
                            <td className={isIncome ? "money-in" : "money-out"}>
                              {isIncome ? "+" : "-"}
                              {formatMoney(Math.abs(Number(tx.amount || 0)), lang, currency)}
                            </td>
                            <td>
                              <ActivityDeleteButton id={tx.id} label={text.cancel} confirmText={text.cancelConfirm} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="activity-empty">
                          {text.noItems}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
          </main>
        </div>
      </div>
    </div>
  );
}
