import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { QuickAddForm } from "../components/quick-add-form";
import { ViewControls } from "../components/view-controls";
import { ActivityDeleteButton } from "../components/activity-delete-button";
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
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
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
      listTitle: "Registos do mês",
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
    listTitle: "Month records",
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
  const text = getText(lang);

  const db = getDb();
  const [rows] = await db.query(
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 300`,
    [user.userId, selectedMonth]
  );

  const items = rows as TxRow[];
  const name = user.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();

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

          <nav className="main-nav">
            <Link className="nav-item" href={`/dashboard?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Dashboard
            </Link>
            <a className="nav-item" href="#">
              Analytics
            </a>
            <Link className="nav-item active" href={`/dashboard/movimentos?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Movements
            </Link>
            <a className="nav-item" href="#">
              Goals
            </a>
            <Link className="nav-item" href={`/dashboard/activity?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Activity
            </Link>
          </nav>

          <div className="top-actions">
            <div className="search-box">Search</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{initials}</div>
            <LogoutButton className="logout-light" label={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          </div>
        </div>

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
              <div className="panel-head movement-list-head">
                <h3>{text.listTitle}</h3>
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
                            <td>{tx.category}</td>
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
  );
}
