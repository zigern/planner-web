import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { RecurringRulesManager } from "../components/recurring-rules-manager";
import { DashboardSidebar } from "../components/sidebar-nav";
import "../dashboard-theme.css";

type RecurringRuleRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  day_of_month: number;
  last_applied_month: string | null;
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

function getText(lang: string) {
  if (lang === "pt-PT") {
    return {
      title: "Recorrentes",
      subtitle: "Salário, rendas e contas fixas mensais",
      period: "Período",
      prevMonth: "Mês anterior",
      thisMonth: "Mês atual",
      nextMonth: "Mês seguinte"
    };
  }
  return {
    title: "Recurring",
    subtitle: "Salary, rent and fixed monthly costs",
    period: "Period",
    prevMonth: "Previous month",
    thisMonth: "Current month",
    nextMonth: "Next month"
  };
}

function shiftMonth(isoMonth: string, delta: number) {
  const [year, month] = isoMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthBounds(isoMonth: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  const end = new Date(year, month, 0);
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  };
}

export default async function RecorrentesPage({
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
  const prevMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);
  const monthBounds = getMonthBounds(selectedMonth);
  const monthPeriodLabel = `${monthBounds.from} → ${monthBounds.to}`;

  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      type ENUM('income','expense') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category VARCHAR(80) NOT NULL,
      description VARCHAR(255) NULL,
      day_of_month TINYINT UNSIGNED NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_applied_month CHAR(7) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_recurring_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [rows] = await db.query(
    `SELECT id, type, amount, category, description, day_of_month, last_applied_month
     FROM recurring_rules
     WHERE user_id = ?
       AND is_active = 1
     ORDER BY created_at DESC, id DESC`,
    [user.userId]
  );

  const rules = (rows as RecurringRuleRow[]).map((row) => ({
    id: Number(row.id),
    type: row.type,
    amount: Number(row.amount || 0),
    category: row.category,
    description: row.description,
    dayOfMonth: Number(row.day_of_month || 1),
    lastAppliedMonth: row.last_applied_month
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
          <DashboardSidebar current="recurring" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main">
          <section className="greeting-row">
            <div>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
              <p className="budgets-period-label">{text.period}: {monthPeriodLabel}</p>
            </div>
            <div className="cta-row">
              <div className="activity-preset-group" aria-label="Recurring month shortcuts">
                <Link className="activity-preset" href={`/dashboard/recorrentes?month=${prevMonth}&lang=${lang}&currency=${currency}`}>
                  {text.prevMonth}
                </Link>
                <Link className="activity-preset active" href={`/dashboard/recorrentes?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                  {text.thisMonth}
                </Link>
                <Link className="activity-preset" href={`/dashboard/recorrentes?month=${nextMonth}&lang=${lang}&currency=${currency}`}>
                  {text.nextMonth}
                </Link>
              </div>
            </div>
          </section>

          <RecurringRulesManager lang={lang} currency={currency} selectedMonth={selectedMonth} initialRules={rules} />
          </main>
        </div>
      </div>
    </div>
  );
}
