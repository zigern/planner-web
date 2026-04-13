import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { WealthManager } from "../components/wealth-manager";
import { DashboardSidebar } from "../components/sidebar-nav";
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
  const isPt = lang === "pt-PT";
  const currency = parseCurrencyParam(params?.currency);
  const preset = parsePresetParam(params?.preset);
  const fromParam = parseDateParam(params?.from);
  const toParam = parseDateParam(params?.to);
  const monthBounds = getMonthBounds(selectedMonth);
  const todayIso = isoDate(new Date());
  const last30Iso = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const last90Iso = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));
  const effectiveFrom = fromParam || (preset === "30d" ? last30Iso : preset === "90d" ? last90Iso : monthBounds.from);
  const effectiveTo = toParam || (preset === "month" ? monthBounds.to : todayIso);

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
  const t = isPt
    ? {
        search: "Pesquisar",
        logout: "Terminar sessão",
        title: "Património",
        subtitle: "Resumo de ativos e passivos",
        thisMonth: "Este mês",
        last30Days: "Últimos 30 dias",
        last90Days: "Últimos 90 dias",
        totalAssets: "Ativos totais",
        totalLiabilities: "Passivos totais",
        netWorth: "Património"
      }
    : {
        search: "Search",
        logout: "Logout",
        title: "Net Worth",
        subtitle: "Assets and liabilities snapshot",
        thisMonth: "This month",
        last30Days: "Last 30 days",
        last90Days: "Last 90 days",
        totalAssets: "Total Assets",
        totalLiabilities: "Total Liabilities",
        netWorth: "Net Worth"
      };
  const presetBase = new URLSearchParams({
    month: selectedMonth,
    lang,
    currency
  });
  const monthPresetHref = `/dashboard/patrimonio?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "month");
    p.set("from", monthBounds.from);
    p.set("to", monthBounds.to);
    return p.toString();
  })()}`;
  const last30PresetHref = `/dashboard/patrimonio?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "30d");
    p.set("from", last30Iso);
    p.set("to", todayIso);
    return p.toString();
  })()}`;
  const last90PresetHref = `/dashboard/patrimonio?${(() => {
    const p = new URLSearchParams(presetBase);
    p.set("preset", "90d");
    p.set("from", last90Iso);
    p.set("to", todayIso);
    return p.toString();
  })()}`;
  const periodLabel = `${effectiveFrom} → ${effectiveTo}`;

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
            <div className="search-box">{t.search}</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{initials}</div>
            <LogoutButton className="logout-light" label={t.logout} />
          </div>
        </div>
        <div className="workspace-shell">
          <DashboardSidebar current="networth" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main">
            <section className="greeting-row">
              <div>
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
              </div>
              <div className="cta-row">
                <div className="activity-preset-group">
                  <Link className={`activity-preset ${preset === "month" ? "active" : ""}`} href={monthPresetHref}>
                    {t.thisMonth}
                  </Link>
                  <Link className={`activity-preset ${preset === "30d" ? "active" : ""}`} href={last30PresetHref}>
                    {t.last30Days}
                  </Link>
                  <Link className={`activity-preset ${preset === "90d" ? "active" : ""}`} href={last90PresetHref}>
                    {t.last90Days}
                  </Link>
                </div>
              </div>
            </section>
            <section className="metrics-grid wealth-metrics">
              <article className="panel">
                <div className="panel-head">
                  <h3>{t.totalAssets}</h3>
                </div>
                <p className="mid-number money-in">{formatMoney(assetsTotal, lang, currency)}</p>
              </article>
              <article className="panel">
                <div className="panel-head">
                  <h3>{t.totalLiabilities}</h3>
                </div>
                <p className="mid-number money-out">{formatMoney(liabilitiesTotal, lang, currency)}</p>
              </article>
              <article className="panel">
                <div className="panel-head">
                  <h3>{t.netWorth}</h3>
                </div>
                <p className={`mid-number ${netWorth >= 0 ? "money-in" : "money-out"}`}>
                  {formatMoney(netWorth, lang, currency)}
                </p>
              </article>
            </section>

            <WealthManager lang={lang} currency={currency} assets={assets} debts={debts} periodLabel={periodLabel} />
          </main>
        </div>
      </div>
    </div>
  );
}
