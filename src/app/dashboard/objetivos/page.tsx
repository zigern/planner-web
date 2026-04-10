import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "../components/logout-button";
import { ViewControls } from "../components/view-controls";
import { GoalsManager } from "../components/goals-manager";
import { DashboardSidebar } from "../components/sidebar-nav";
import "../dashboard-theme.css";

type GoalRow = {
  id: number;
  name: string;
  target_amount: string;
  saved_amount: string;
  deadline: string | null;
  status: "not_started" | "in_progress" | "completed";
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
      title: "Objetivos",
      subtitle: "Planeia metas e acompanha a tua poupança"
    };
  }
  return {
    title: "Goals",
    subtitle: "Plan targets and track your savings"
  };
}

export default async function ObjetivosPage({
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
    `SELECT id, name, target_amount, saved_amount, deadline, status
     FROM goals
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [user.userId]
  );

  const goals = (rows as GoalRow[]).map((row) => ({
    id: Number(row.id),
    name: row.name,
    targetAmount: Number(row.target_amount || 0),
    savedAmount: Number(row.saved_amount || 0),
    deadline: row.deadline,
    status: row.status
  }));

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

          <div className="top-actions">
            <div className="search-box">Search</div>
            <ViewControls lang={lang} currency={currency} />
            <div className="avatar-mini">{initials}</div>
            <LogoutButton className="logout-light" label={lang === "pt-PT" ? "Terminar sessão" : "Logout"} />
          </div>
        </div>
        <div className="workspace-shell">
          <DashboardSidebar current="goals" selectedMonth={selectedMonth} lang={lang} currency={currency} />
          <main className="dash-main">
            <section className="greeting-row">
              <div>
                <h1>{text.title}</h1>
                <p>{text.subtitle}</p>
              </div>
            </section>

            <GoalsManager lang={lang} currency={currency} initialGoals={goals} />
          </main>
        </div>
      </div>
    </div>
  );
}
