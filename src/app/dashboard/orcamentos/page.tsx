import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { BudgetsManager } from "../components/budgets-manager";
import { DashboardSidebar } from "../components/sidebar-nav";
import "../dashboard-theme.css";

type BudgetRow = {
  id: number;
  category: string;
  budget_amount: string;
  spent: string;
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

function parseCategoryParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  return raw.trim().slice(0, 60);
}

function getText(lang: string) {
  if (lang === "pt-PT") {
    return {
      title: "Orçamentos",
      subtitle: "Limites por categoria e controlo mensal"
    };
  }
  return {
    title: "Budgets",
    subtitle: "Category limits and monthly control"
  };
}

export default async function OrcamentosPage({
  searchParams
}: {
  searchParams?: Promise<{
    month?: string | string[];
    lang?: string | string[];
    currency?: string | string[];
    category?: string | string[];
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
  const prefillCategory = parseCategoryParam(params?.category);
  const text = getText(lang);

  const db = getDb();
  const [rows] = await db.query(
    `SELECT b.id, b.category, b.budget_amount, COALESCE(SUM(t.amount), 0) as spent
     FROM monthly_budgets b
     LEFT JOIN transactions t
       ON t.user_id = b.user_id
      AND t.type = 'expense'
      AND DATE_FORMAT(t.transaction_date, '%Y-%m') = b.budget_month
      AND t.category = b.category
     WHERE b.user_id = ?
       AND b.budget_month = ?
     GROUP BY b.id, b.category, b.budget_amount
     ORDER BY b.category ASC`,
    [user.userId, selectedMonth]
  );

  const budgetRows = (rows as BudgetRow[]).map((row) => ({
    id: Number(row.id),
    category: row.category,
    budgetAmount: Number(row.budget_amount || 0),
    spent: Number(row.spent || 0)
  }));

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

          <div className="top-actions">
            <div className="search-box">Search</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{initials}</div>
            <LogoutButton className="logout-light" label={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          </div>
        </div>
        <div className="workspace-shell">
          <DashboardSidebar current="budgets" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main">
          <section className="greeting-row">
            <div>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
            </div>
          </section>

          <BudgetsManager
            lang={lang}
            currency={currency}
            month={selectedMonth}
            initialRows={budgetRows}
            prefillCategory={prefillCategory}
          />
          </main>
        </div>
      </div>
    </div>
  );
}
