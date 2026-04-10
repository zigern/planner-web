import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { WealthManager } from "../components/wealth-manager";
import "../dashboard-theme.css";

type AssetRow = {
  id: number;
  name: string;
  asset_type: string;
  value: string;
};

type DebtRow = {
  id: number;
  name: string;
  total_owed: string;
  amount_paid: string;
  interest_rate: string;
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

export default async function PatrimonioPage({
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

  const db = getDb();
  const [assetRows] = await db.query(
    `SELECT id, name, asset_type, value
     FROM assets
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [user.userId]
  );
  const [debtRows] = await db.query(
    `SELECT id, name, total_owed, amount_paid, interest_rate
     FROM debts
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [user.userId]
  );

  const assets = (assetRows as AssetRow[]).map((row) => ({
    id: Number(row.id),
    name: row.name,
    assetType: row.asset_type,
    value: Number(row.value || 0)
  }));
  const debts = (debtRows as DebtRow[]).map((row) => ({
    id: Number(row.id),
    name: row.name,
    totalOwed: Number(row.total_owed || 0),
    amountPaid: Number(row.amount_paid || 0),
    interestRate: Number(row.interest_rate || 0)
  }));

  const assetsTotal = assets.reduce((acc, row) => acc + row.value, 0);
  const liabilitiesTotal = debts.reduce((acc, row) => acc + Math.max(0, row.totalOwed - row.amountPaid), 0);
  const netWorth = assetsTotal - liabilitiesTotal;
  const initials = user.email.slice(0, 2).toUpperCase();

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
            <Link className="nav-item" href={`/dashboard/movimentos?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Movements
            </Link>
            <Link className="nav-item" href={`/dashboard/recorrentes?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Recurring
            </Link>
            <Link className="nav-item" href={`/dashboard/orcamentos?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Budgets
            </Link>
            <Link className="nav-item" href={`/dashboard/objetivos?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Goals
            </Link>
            <Link className="nav-item active" href={`/dashboard/patrimonio?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
              Net Worth
            </Link>
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
          <section className="metrics-grid wealth-metrics">
            <article className="panel">
              <div className="panel-head">
                <h3>Total Assets</h3>
              </div>
              <p className="mid-number money-in">{formatMoney(assetsTotal, lang, currency)}</p>
            </article>
            <article className="panel">
              <div className="panel-head">
                <h3>Total Liabilities</h3>
              </div>
              <p className="mid-number money-out">{formatMoney(liabilitiesTotal, lang, currency)}</p>
            </article>
            <article className="panel">
              <div className="panel-head">
                <h3>Net Worth</h3>
              </div>
              <p className={`mid-number ${netWorth >= 0 ? "money-in" : "money-out"}`}>{formatMoney(netWorth, lang, currency)}</p>
            </article>
          </section>

          <WealthManager lang={lang} currency={currency} assets={assets} debts={debts} />
        </main>
      </div>
    </div>
  );
}
