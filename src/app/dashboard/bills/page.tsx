import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { DashboardSidebar } from "../components/sidebar-nav";
import { BillsSubscriptionsManager } from "../components/bills-subscriptions-manager";
import "../dashboard-theme.css";

type BillRow = {
  id: number;
  name: string;
  amount: string;
  due_day: number;
  frequency: "monthly" | "quarterly" | "yearly";
  auto_pay: number;
  status: "pending" | "paid";
};

type SubRow = {
  id: number;
  service: string;
  cost: string;
  billing_cycle: "monthly" | "yearly";
  category: string;
  status: "active" | "paused" | "cancelled";
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
      title: "Contas e subscrições",
      subtitle: "Gestão centralizada das saídas fixas mensais"
    };
  }

  return {
    title: "Bills & subscriptions",
    subtitle: "Centralized management for monthly fixed outflows"
  };
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

export default async function BillsPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string | string[]; lang?: string | string[]; currency?: string | string[] }>;
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
  const bills = await safeQueryRows<BillRow>(
    db,
    `SELECT id, name, amount, due_day, frequency, auto_pay, status
     FROM bills
     WHERE user_id = ?
     ORDER BY due_day ASC, id DESC`,
    [user.userId]
  );

  const subscriptions = await safeQueryRows<SubRow>(
    db,
    `SELECT id, service, cost, billing_cycle, category, status
     FROM subscriptions
     WHERE user_id = ?
     ORDER BY id DESC`,
    [user.userId]
  );

  const initialBills = bills.map((row) => ({
    id: Number(row.id),
    name: row.name,
    amount: Number(row.amount || 0),
    dueDay: Number(row.due_day || 1),
    frequency: row.frequency,
    autoPay: Boolean(row.auto_pay),
    status: row.status
  }));

  const initialSubscriptions = subscriptions.map((row) => ({
    id: Number(row.id),
    service: row.service,
    cost: Number(row.cost || 0),
    billingCycle: row.billing_cycle,
    category: row.category,
    status: row.status
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
          <DashboardSidebar current="bills" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main">
            <section className="greeting-row">
              <div>
                <h1>{text.title}</h1>
                <p>{text.subtitle}</p>
              </div>
            </section>

            <BillsSubscriptionsManager
              lang={lang}
              currency={currency}
              initialBills={initialBills}
              initialSubscriptions={initialSubscriptions}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
