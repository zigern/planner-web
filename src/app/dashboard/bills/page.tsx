import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { DashboardSidebar } from "../components/sidebar-nav";
import { DashboardTopBar } from "../components/top-bar";
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
  renewal_date: string | Date | null;
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

function getMonthBounds(isoMonth: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  const end = new Date(year, month, 0);
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  };
}

function getText(lang: string) {
  if (lang === "pt-PT") {
    return {
      title: "Contas e subscrições",
      subtitle: "Gestão centralizada das saídas fixas mensais",
      thisMonth: "Este mês",
      last30Days: "Últimos 30 dias",
      last90Days: "Últimos 90 dias",
      period: "Período de análise"
    };
  }

  return {
    title: "Bills & subscriptions",
    subtitle: "Centralized management for monthly fixed outflows",
    thisMonth: "This month",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    period: "Analysis range"
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
  searchParams?: Promise<{
    month?: string | string[];
    lang?: string | string[];
    currency?: string | string[];
    preset?: string | string[];
    from?: string | string[];
    to?: string | string[];
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
  const preset = parsePresetParam(params?.preset);
  const fromParam = parseDateParam(params?.from);
  const toParam = parseDateParam(params?.to);
  const text = getText(lang);
  const monthBounds = getMonthBounds(selectedMonth);
  const todayIso = isoDate(new Date());
  const last30Iso = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const last90Iso = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));
  const effectiveFrom = fromParam || (preset === "30d" ? last30Iso : preset === "90d" ? last90Iso : monthBounds.from);
  const effectiveTo = toParam || (preset === "month" ? monthBounds.to : todayIso);

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
    `SELECT id, service, cost, billing_cycle, category, status, renewal_date
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
    status: row.status,
    renewalDate: row.renewal_date ? String(row.renewal_date) : null
  }));

  const name = user.displayName?.trim() || user.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  const presetBase = new URLSearchParams({
    month: selectedMonth,
    lang,
    currency
  });
  const monthPresetHref = `/dashboard/bills?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "month");
    p.set("from", monthBounds.from);
    p.set("to", monthBounds.to);
    return p.toString();
  })()}`;
  const last30PresetHref = `/dashboard/bills?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "30d");
    p.set("from", last30Iso);
    p.set("to", todayIso);
    return p.toString();
  })()}`;
  const last90PresetHref = `/dashboard/bills?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "90d");
    p.set("from", last90Iso);
    p.set("to", todayIso);
    return p.toString();
  })()}`;
  const periodLabel = `${text.period}: ${effectiveFrom} → ${effectiveTo}`;

  return (
    <div className="casha-wrap">
      <div className="casha-shell">
        <DashboardTopBar selectedMonth={selectedMonth} lang={lang} currency={currency} basePath="/dashboard/bills" />
        <div className="workspace-shell">
          <DashboardSidebar current="bills" selectedMonth={selectedMonth} lang={lang} currency={currency} showBottomControls userDisplayName={name} userInitials={initials} logoutLabel={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          <main className="dash-main">
            <section className="greeting-row">
              <div>
                <h1>{text.title}</h1>
                <p>{text.subtitle}</p>
              </div>
              <div className="cta-row">
                <div className="activity-preset-group">
                  <Link className={`activity-preset ${preset === "month" ? "active" : ""}`} href={monthPresetHref}>
                    {text.thisMonth}
                  </Link>
                  <Link className={`activity-preset ${preset === "30d" ? "active" : ""}`} href={last30PresetHref}>
                    {text.last30Days}
                  </Link>
                  <Link className={`activity-preset ${preset === "90d" ? "active" : ""}`} href={last90PresetHref}>
                    {text.last90Days}
                  </Link>
                </div>
              </div>
            </section>

            <BillsSubscriptionsManager
              lang={lang}
              currency={currency}
              initialBills={initialBills}
              initialSubscriptions={initialSubscriptions}
              periodFrom={effectiveFrom}
              periodTo={effectiveTo}
              periodLabel={periodLabel}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
