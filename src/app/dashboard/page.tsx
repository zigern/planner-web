import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { LogoutButton } from "./components/logout-button";
import { QuickAddForm } from "./components/quick-add-form";
import { ViewControls } from "./components/view-controls";
import "./dashboard-theme.css";

type TotalsRow = { income: string | null; expense: string | null };
type MonthSummaryRow = { month: string; income: string; expense: string };
type CategoryRow = { category: string; total: string };
type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};
type BillRow = { id: number; name: string; amount: string; due_day: number; status: "pending" | "paid" };
type AssetRow = { asset_type: string; value: string };
type DebtRow = { total_owed: string; amount_paid: string };
type IncomeCategoryRow = { category: string; total: string };
type RecurringRuleRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  day_of_month: number;
  last_applied_month: string | null;
};
type SpendingCategoryRow = {
  key: string;
  label: string;
  total: number;
};

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function parseLangParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "pt-PT";
  const allowed = new Set(["pt-PT", "en-US", "es-ES", "fr-FR"]);
  return allowed.has(raw) ? raw : "pt-PT";
}

function parseCurrencyParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "EUR";
  const allowed = new Set(["EUR", "USD", "GBP", "BRL"]);
  return allowed.has(raw) ? raw : "EUR";
}

function formatMoney(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatCompactMoney(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function getCopy(lang: string) {
  const copy = {
    "pt-PT": {
      personalFinanceTracker: "Rastreador de Finanças Pessoais",
      availableBalance: "Saldo Disponível",
      dashboard: "Dashboard",
      spreadsheet: "Spreadsheet",
      totalNetWorth: "Património Líquido Total",
      spendings: "Despesas",
      incomeGoal: "Meta de Receita",
      progressToMonth: "Progresso no mês",
      incomeSource: "Fontes de Receita",
      income: "Receitas",
      notification: "Notificações",
      noOverdue: "Sem contas em atraso.",
      overdueMsg: "contas em atraso. Paga em breve para evitar taxas.",
      quickAddTransaction: "Adicionar transação",
      exportCsv: "Exportar CSV",
      incomeExpenses: "Receitas & Despesas",
      assets: "Ativos",
      noAssets: "Sem ativos",
      petsTitle: "Despesas com os meus cães e gatos",
      noPetExpenses: "Sem despesas com animais neste mês",
      recentTransactions: "Transações recentes",
      fixedMonthly: "Despesas/receitas fixas mensais",
      fixedExpenses: "Despesas fixas mensais",
      fixedIncomes: "Receitas fixas mensais",
      variableExpenses: "Despesas variáveis recentes",
      variableIncomes: "Receitas variáveis recentes",
      noFixed: "Sem itens fixos mensais",
      noFixedExpenses: "Sem despesas fixas mensais",
      noVariableExpenses: "Sem despesas variáveis recentes",
      noVariableIncomes: "Sem receitas variáveis recentes",
      recurringIncome: "Receita fixa",
      recurringExpense: "Despesa fixa"
    },
    "en-US": {
      personalFinanceTracker: "Personal Finance Tracker",
      availableBalance: "Available Balance",
      dashboard: "Dashboard",
      spreadsheet: "Spreadsheet",
      totalNetWorth: "Total Net Worth",
      spendings: "Spendings",
      incomeGoal: "Income Goal",
      progressToMonth: "Progress to month",
      incomeSource: "Income Source",
      income: "Income",
      notification: "Notification",
      noOverdue: "No overdue bills right now.",
      overdueMsg: "bills are past due. Pay soon to avoid late fees.",
      quickAddTransaction: "Quick add transaction",
      exportCsv: "Export CSV",
      incomeExpenses: "Income & Expenses",
      assets: "Assets",
      noAssets: "No assets",
      petsTitle: "Expenses for My Dogs and Cats",
      noPetExpenses: "No pet expenses in this month",
      recentTransactions: "Recent Transactions",
      fixedMonthly: "Fixed monthly income/expenses",
      fixedExpenses: "Fixed monthly expenses",
      fixedIncomes: "Fixed monthly incomes",
      variableExpenses: "Recent variable expenses",
      variableIncomes: "Recent variable incomes",
      noFixed: "No fixed monthly items",
      noFixedExpenses: "No fixed monthly expenses",
      noVariableExpenses: "No recent variable expenses",
      noVariableIncomes: "No recent variable incomes",
      recurringIncome: "Fixed income",
      recurringExpense: "Fixed expense"
    },
    "es-ES": {
      personalFinanceTracker: "Rastreador de Finanzas Personales",
      availableBalance: "Saldo Disponible",
      dashboard: "Panel",
      spreadsheet: "Hoja",
      totalNetWorth: "Patrimonio Neto Total",
      spendings: "Gastos",
      incomeGoal: "Meta de Ingresos",
      progressToMonth: "Progreso del mes",
      incomeSource: "Fuentes de Ingresos",
      income: "Ingresos",
      notification: "Notificación",
      noOverdue: "No hay facturas atrasadas.",
      overdueMsg: "facturas atrasadas. Paga pronto para evitar cargos.",
      quickAddTransaction: "Añadir transacción",
      exportCsv: "Exportar CSV",
      incomeExpenses: "Ingresos y Gastos",
      assets: "Activos",
      noAssets: "Sin activos",
      petsTitle: "Gastos de mis perros y gatos",
      noPetExpenses: "Sin gastos de mascotas este mes",
      recentTransactions: "Transacciones recientes",
      fixedMonthly: "Ingresos/gastos fijos mensuales",
      fixedExpenses: "Gastos fijos mensuales",
      fixedIncomes: "Ingresos fijos mensuales",
      variableExpenses: "Gastos variables recientes",
      variableIncomes: "Ingresos variables recientes",
      noFixed: "Sin elementos fijos mensuales",
      noFixedExpenses: "Sin gastos fijos mensuales",
      noVariableExpenses: "Sin gastos variables recientes",
      noVariableIncomes: "Sin ingresos variables recientes",
      recurringIncome: "Ingreso fijo",
      recurringExpense: "Gasto fijo"
    },
    "fr-FR": {
      personalFinanceTracker: "Suivi des Finances Personnelles",
      availableBalance: "Solde Disponible",
      dashboard: "Tableau",
      spreadsheet: "Feuille",
      totalNetWorth: "Patrimoine Net Total",
      spendings: "Dépenses",
      incomeGoal: "Objectif de Revenu",
      progressToMonth: "Progression du mois",
      incomeSource: "Sources de Revenu",
      income: "Revenus",
      notification: "Notification",
      noOverdue: "Aucune facture en retard.",
      overdueMsg: "factures en retard. Payez vite pour éviter des frais.",
      quickAddTransaction: "Ajouter une transaction",
      exportCsv: "Exporter CSV",
      incomeExpenses: "Revenus & Dépenses",
      assets: "Actifs",
      noAssets: "Aucun actif",
      petsTitle: "Dépenses pour mes chiens et chats",
      noPetExpenses: "Aucune dépense animale ce mois",
      recentTransactions: "Transactions récentes",
      fixedMonthly: "Revenus/dépenses mensuels fixes",
      fixedExpenses: "Dépenses fixes mensuelles",
      fixedIncomes: "Revenus fixes mensuels",
      variableExpenses: "Dépenses variables récentes",
      variableIncomes: "Revenus variables récents",
      noFixed: "Aucun élément fixe mensuel",
      noFixedExpenses: "Aucune dépense fixe mensuelle",
      noVariableExpenses: "Aucune dépense variable récente",
      noVariableIncomes: "Aucun revenu variable récent",
      recurringIncome: "Revenu fixe",
      recurringExpense: "Dépense fixe"
    }
  } as const;
  return copy[lang as keyof typeof copy] || copy["pt-PT"];
}

function dayMonth(v: string | Date, lang = "pt-PT") {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(lang, { day: "2-digit", month: "short" });
}

function smoothLinePath(data: number[], w: number, h: number) {
  if (data.length === 0) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? w / 2 : index * step;
    const y = h - ((value - min) / range) * (h - 8) - 4;
    return { x, y };
  });

  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(
      2
    )} ${p2.y.toFixed(2)}`;
  }

  return d;
}

function buildSeriesMap(rows: MonthSummaryRow[], key: "income" | "expense") {
  return new Map(rows.map((r) => [r.month, Number(r[key] || 0)]));
}

function buildMonthlySeries(rows: MonthSummaryRow[], selectedMonth: string, length: number, key: "income" | "expense") {
  const [year, month] = selectedMonth.split("-").map(Number);
  const map = buildSeriesMap(rows, key);
  const out: number[] = [];

  for (let i = length - 1; i >= 0; i -= 1) {
    const d = new Date(year, month - 1 - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push(map.get(m) ?? 0);
  }

  const hasAny = out.some((v) => v > 0);
  if (!hasAny) return Array.from({ length }, (_, i) => (i % 2 === 0 ? 12 : 8));
  if (out.filter((v) => v > 0).length === 1) {
    const idx = out.findIndex((v) => v > 0);
    const val = out[idx];
    const prev = Math.max(val * 0.65, 1);
    if (idx > 0) out[idx - 1] = prev;
    else if (idx < out.length - 1) out[idx + 1] = prev;
  }

  return out;
}

function buildMonthLabels(selectedMonth: string, length: number, lang: string) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = length - 1; i >= 0; i -= 1) {
    const d = new Date(year, month - 1 - i, 1);
    out.push(d.toLocaleDateString(lang, { month: "short" }));
  }
  return out;
}

function spendingIconKey(rawCategory: string) {
  const value = rawCategory.toLowerCase();
  if (/(housing|habita|renda|rent|mortgage|home|casa|bills|contas|utilities|electric|eletric|water|agua|internet|insurance|luz|phone|netflix|gym)/i.test(value)) {
    return "housing";
  }
  if (/(transport|transporte|car|carro|fuel|gas|uber|bolt|parking|viagem|trip)/i.test(value)) {
    return "transportation";
  }
  if (/(food|comida)/i.test(value)) return "food";
  if (/(pets|animais|pet|vet|groom)/i.test(value)) return "pets";
  if (/(health|saude|saúde|pharmacy|doctor|farmacia|farmácia)/i.test(value)) return "health";
  if (/(shopping|compras|beauty|hobby)/i.test(value)) return "shopping";
  return "personal";
}

function SpendingIcon({ category }: { category: string }) {
  const kind = spendingIconKey(category);
  if (kind === "housing") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "transportation") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 13.5 6.5 8h11l2.5 5.5v5a1 1 0 0 1-1 1h-1.5a2.5 2.5 0 0 1-5 0h-1a2.5 2.5 0 0 1-5 0H5a1 1 0 0 1-1-1z"
          fill="currentColor"
        />
        <circle cx="8.5" cy="18" r="1.3" fill="#0f173f" />
        <circle cx="15.5" cy="18" r="1.3" fill="#0f173f" />
      </svg>
    );
  }
  if (kind === "food") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h2v7a2 2 0 0 1-2 2zM10 3h2v7a2 2 0 0 1-2 2zM17 3h2v18h-2z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "pets") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="7" cy="8" r="2.2" fill="currentColor" />
        <circle cx="12" cy="6.8" r="2.2" fill="currentColor" />
        <circle cx="17" cy="8" r="2.2" fill="currentColor" />
        <path d="M6 16a6 5 0 0 1 12 0c0 2.4-2.2 4-6 4s-6-1.6-6-4z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "health") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "shopping") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 8h12l-1 11H7z" fill="currentColor" />
        <path d="M9 8V6a3 3 0 1 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="9" r="3" fill="currentColor" />
      <circle cx="16" cy="9" r="3" fill="currentColor" />
      <path d="M3 19a5 5 0 0 1 10 0v1H3zM11 20v-1a5 5 0 0 1 10 0v1z" fill="currentColor" />
    </svg>
  );
}

function SideMenuIcon({ name }: { name: string }) {
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.2" fill="currentColor" />
        <rect x="11" y="2" width="7" height="4" rx="1.2" fill="currentColor" />
        <rect x="11" y="8" width="7" height="10" rx="1.2" fill="currentColor" />
        <rect x="2" y="11" width="7" height="7" rx="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 14 7.5 9.5l3 2.5L16.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "up") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 16V4M10 4l-5 5M10 4l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "down") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 4v12M10 16l-5-5M10 16l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "card") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <line x1="2.5" y1="8.5" x2="17.5" y2="8.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 6.5v4.2l2.8 1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3.5 9.5 10 4l6.5 5.5V16h-4.2v-4.2H7.7V16H3.5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 7.5v5M7.5 10h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function spendingDisplayLabel(rawCategory: string, lang: string) {
  const normalized = rawCategory.trim().toLowerCase();
  const map: Record<string, string> =
    lang === "pt-PT"
      ? {
          housing: "Habitação",
          personal: "Pessoal",
          transportation: "Transporte",
          transport: "Transporte",
          food: "Comida",
          bills: "Contas",
          pets: "Animais",
          health: "Saúde",
          shopping: "Compras",
          other: "Outros"
        }
      : {};

  return map[normalized] || rawCategory;
}

function buildSpendingRows(expenseCategories: CategoryRow[], lang: string): SpendingCategoryRow[] {
  return expenseCategories.map((row) => ({
    key: row.category,
    label: spendingDisplayLabel(row.category, lang),
    total: Number(row.total || 0)
  }));
}

function spendingColorForCategory(rawCategory: string) {
  const normalized = rawCategory.trim().toLowerCase();
  const fixed: Record<string, { color: string; bg: string }> = {
    housing: { color: "#8b5cf6", bg: "rgba(139,92,246,0.28)" },
    personal: { color: "#f43f5e", bg: "rgba(244,63,94,0.28)" },
    transportation: { color: "#fb923c", bg: "rgba(251,146,60,0.28)" },
    transport: { color: "#fb923c", bg: "rgba(251,146,60,0.28)" },
    food: { color: "#22c55e", bg: "rgba(34,197,94,0.28)" },
    bills: { color: "#06b6d4", bg: "rgba(6,182,212,0.28)" },
    pets: { color: "#f59e0b", bg: "rgba(245,158,11,0.28)" },
    health: { color: "#ef4444", bg: "rgba(239,68,68,0.28)" },
    shopping: { color: "#3b82f6", bg: "rgba(59,130,246,0.28)" },
    other: { color: "#a3a3a3", bg: "rgba(163,163,163,0.24)" }
  };

  if (fixed[normalized]) return fixed[normalized];

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) hash = (hash * 31 + normalized.charCodeAt(i)) % 360;
  const hue = hash;
  return {
    color: `hsl(${hue} 88% 62%)`,
    bg: `hsl(${hue} 88% 62% / 0.26)`
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

async function applyRecurringRulesForMonth(db: ReturnType<typeof getDb>, userId: number, selectedMonth: string) {
  try {
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

    const rules = await safeQueryRows<RecurringRuleRow>(
      db,
      `SELECT id, type, amount, category, description, day_of_month, last_applied_month
       FROM recurring_rules
       WHERE user_id = ? AND is_active = 1`,
      [userId]
    );

    for (const rule of rules) {
      if (rule.last_applied_month === selectedMonth) continue;

      const txDate = `${selectedMonth}-${String(Math.min(28, Math.max(1, Number(rule.day_of_month || 1)))).padStart(
        2,
        "0"
      )}`;
      const recurringDesc = `Recurring Rule #${rule.id}${rule.description ? ` - ${rule.description}` : ""}`;

      const existing = await safeQueryRows<{ id: number }>(
        db,
        `SELECT id
         FROM transactions
         WHERE user_id = ?
           AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
           AND description = ?
         LIMIT 1`,
        [userId, selectedMonth, recurringDesc]
      );

      if (!existing.length) {
        await db.query(
          `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, rule.type, Number(rule.amount), rule.category, recurringDesc, txDate]
        );
      }

      await db.query(`UPDATE recurring_rules SET last_applied_month = ? WHERE id = ?`, [selectedMonth, rule.id]);
    }
  } catch {
    return;
  }
}

export default async function DashboardPage({
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
  const t = getCopy(lang);
  const db = getDb();
  await applyRecurringRulesForMonth(db, user.userId, selectedMonth);

  const totalsRows = await safeQueryRows<TotalsRow>(
    db,
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
    [user.userId, selectedMonth]
  );

  const summaryRows = await safeQueryRows<MonthSummaryRow>(
    db,
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY month DESC
     LIMIT 12`,
    [user.userId]
  );

  const expenseCategories = await safeQueryRows<CategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 8`,
    [user.userId, selectedMonth]
  );

  const incomeCategories = await safeQueryRows<IncomeCategoryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'income'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 4`,
    [user.userId, selectedMonth]
  );

  const txRows = await safeQueryRows<TxRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 8`,
    [user.userId, selectedMonth]
  );

  const billRows = await safeQueryRows<BillRow>(
    db,
    `SELECT id, name, amount, due_day, status
     FROM bills
     WHERE user_id = ?
     ORDER BY due_day ASC
     LIMIT 6`,
    [user.userId]
  );

  const assetRows = await safeQueryRows<AssetRow>(
    db,
    `SELECT asset_type, value FROM assets WHERE user_id = ? ORDER BY value DESC LIMIT 6`,
    [user.userId]
  );

  const debtRows = await safeQueryRows<DebtRow>(db, `SELECT total_owed, amount_paid FROM debts WHERE user_id = ?`, [
    user.userId
  ]);

  const totals = totalsRows[0] ?? { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const availableBalance = income - expense;

  const assetsTotal = assetRows.reduce((a, r) => a + Number(r.value || 0), 0);
  const liabilities = debtRows.reduce(
    (a, r) => a + Math.max(0, Number(r.total_owed || 0) - Number(r.amount_paid || 0)),
    0
  );
  const netWorth = assetsTotal - liabilities + availableBalance;

  const incomeSeries = buildMonthlySeries(summaryRows, selectedMonth, 12, "income");
  const expenseSeries = buildMonthlySeries(summaryRows, selectedMonth, 12, "expense");
  const chartMonths = buildMonthLabels(selectedMonth, 12, lang);

  const incomeGoalTarget = Math.max(1, income + expense);
  const incomeGoalPct = Math.min(100, (income / incomeGoalTarget) * 100);
  const incomeCompact = `+${formatCompactMoney(income, lang, currency)}`;

  const pieTotal = expenseCategories.reduce((a, r) => a + Number(r.total || 0), 0);
  const pieColors = ["#ef476f", "#6d4dff", "#1fd2ca", "#7ed957", "#f59e0b", "#60a5fa"];
  let cursor = 0;
  const pieGradient = expenseCategories.length
    ? `conic-gradient(${expenseCategories
        .map((r, i) => {
          const pctVal = pieTotal > 0 ? (Number(r.total || 0) / pieTotal) * 100 : 0;
          const start = cursor;
          cursor += pctVal;
          return `${pieColors[i % pieColors.length]} ${start}% ${cursor}%`;
        })
        .join(", ")})`
    : "conic-gradient(#293467 0% 100%)";

  const spendingRows = buildSpendingRows(expenseCategories, lang);

  const petKeywords = /(pet|animal|dog|cat|vet|veterin|food treat|kennel|racao|ração|groom|banho)/i;
  const petList = expenseCategories.filter((c) => petKeywords.test(c.category)).map((r) => ({
    label: r.category,
    value: Number(r.total || 0)
  }));

  const overdueBills = billRows.filter((b) => b.status === "pending" && b.due_day < new Date().getDate()).length;
  const recurringRules = await safeQueryRows<RecurringRuleRow>(
    db,
    `SELECT id, type, amount, category, description, day_of_month, last_applied_month
     FROM recurring_rules
     WHERE user_id = ? AND is_active = 1
     ORDER BY type ASC, day_of_month ASC
     LIMIT 8`,
    [user.userId]
  );
  const recurringExpenseRules = recurringRules.filter((rule) => rule.type === "expense");
  const recurringIncomeRules = recurringRules.filter((rule) => rule.type === "income");
  const variableExpenseRows = txRows.filter(
    (tx) => tx.type === "expense" && !(tx.description || "").startsWith("Recurring Rule #")
  );
  const variableIncomeRows = txRows.filter(
    (tx) => tx.type === "income" && !(tx.description || "").startsWith("Recurring Rule #")
  );
  const initials = user.email.slice(0, 2).toUpperCase();

  const sparkSpend = smoothLinePath(expenseSeries.slice(-8), 180, 40);
  const sparkIncome = smoothLinePath(incomeSeries.slice(-8), 180, 40);
  const bigIncome = smoothLinePath(incomeSeries.slice(-12), 620, 220);
  const bigExpense = smoothLinePath(expenseSeries.slice(-12), 620, 220);

  return (
    <div className="dash-wrap">
      <div className="dash-shell">
        <aside className="left-nav">
          <div className="brand-icon">{initials}</div>
          <div className="brand-name">Other Level&apos;s</div>
          <nav className="side-nav">
            <p className="side-group-title">Overview</p>
            <div className="side-group">
              <Link className="side-link active" href={`/dashboard?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="dashboard" /></span>
                  Dashboard
                </span>
              </Link>
              <Link className="side-link" href={`/dashboard/spreadsheet?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="chart" /></span>
                  Annual overview
                </span>
              </Link>
            </div>

            <p className="side-group-title">Tracking</p>
            <div className="side-group">
              <a className="side-link" href="#income-source">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="up" /></span>
                  Income
                </span>
                <span className="side-badge">{incomeCompact}</span>
              </a>
              <a className="side-link" href="#spending-list">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="down" /></span>
                  Expenses
                </span>
              </a>
              <a className="side-link" href="#notification-card">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="card" /></span>
                  Bills
                </span>
              </a>
              <a className="side-link" href="#notification-card">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="clock" /></span>
                  Subscriptions
                </span>
              </a>
            </div>

            <p className="side-group-title">Planning</p>
            <div className="side-group">
              <a className="side-link" href="#asset-card">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="home" /></span>
                  Savings
                </span>
              </a>
              <a className="side-link" href="#recent-card">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="plus" /></span>
                  Debt tracker
                </span>
              </a>
              <a className="side-link" href="#goal-card">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="clock" /></span>
                  Goals
                </span>
              </a>
              <a className="side-link" href="#asset-card">
                <span className="side-link-left">
                  <span className="side-icon"><SideMenuIcon name="chart" /></span>
                  Net worth
                </span>
              </a>
            </div>
          </nav>
        </aside>

        <main className="main-area">
          <header className="top-row">
            <div className="title-block">
              <p className="kicker">{t.personalFinanceTracker}</p>
              <h1>{t.availableBalance}</h1>
              <p className={`balance ${availableBalance >= 0 ? "income-number" : "expense-number"}`}>
                {formatMoney(availableBalance, lang, currency)}
              </p>
            </div>

            <div className="center-tabs">
              <Link className="tab active" href={`/dashboard?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="2" y="2" width="7" height="7" rx="1.2" fill="currentColor" />
                  <rect x="11" y="2" width="7" height="4" rx="1.2" fill="currentColor" />
                  <rect x="11" y="8" width="7" height="10" rx="1.2" fill="currentColor" />
                  <rect x="2" y="11" width="7" height="7" rx="1.2" fill="currentColor" />
                </svg>
                {t.dashboard}
              </Link>
              <Link
                className="tab"
                href={`/dashboard/spreadsheet?month=${selectedMonth}&lang=${lang}&currency=${currency}`}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="2" y="3" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="7" y1="8" x2="7" y2="17" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="12" y1="8" x2="12" y2="17" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                {t.spreadsheet}
              </Link>
            </div>

            <div className="date-card date-small">
              {new Date().toLocaleDateString(lang, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </div>

            <ViewControls lang={lang} currency={currency} />

            <div className="profile">
              <div className="avatar">{initials}</div>
              <LogoutButton className="logout-mini" label="Sair" />
            </div>
          </header>

          <section className="grid-board">
            <article className="card grad card-networth">
              <p className="card-label">{t.totalNetWorth}</p>
              <p className="card-big">{formatMoney(netWorth, lang, currency)}</p>
            </article>

            <article className="card card-spending-spark">
              <p className="card-label">{t.spendings}</p>
              <p className="card-num expense-number">{formatMoney(expense, lang, currency)}</p>
              <svg className="spark" viewBox="0 0 180 40" preserveAspectRatio="none">
                <path d={sparkSpend} />
              </svg>
            </article>

            <article className="card card-spending-list" id="spending-list">
              <p className="card-label">{t.spendings}</p>
              <ul className="spend-list">
                {spendingRows.map((row) => {
                  const spendColor = spendingColorForCategory(row.key);
                  return (
                  <li
                    key={row.key}
                    style={
                      {
                        "--spend-color": spendColor.color,
                        "--spend-bg": spendColor.bg
                      } as Record<string, string>
                    }
                  >
                    <span className="ico">
                      <SpendingIcon category={row.key} />
                    </span>
                    <span>{row.label}</span>
                    <b className="spend-value">{formatMoney(row.total, lang, currency)}</b>
                  </li>
                  );
                })}
              </ul>
            </article>

            <article className="card goal card-goal" id="goal-card">
              <p className="goal-top">{Math.round(incomeGoalPct)}%</p>
              <p className="card-label">{t.incomeGoal}</p>
              <p className="muted">{t.progressToMonth}</p>
              <p className="goal-value">
                {formatMoney(income, lang, currency)} / {formatMoney(incomeGoalTarget, lang, currency)}
              </p>
              <div className="goal-bar">
                <div style={{ width: `${incomeGoalPct}%` }} />
              </div>
            </article>

            <article className="card card-income-source" id="income-source">
              <p className="card-label">{t.incomeSource}</p>
              <div className="income-bars">
                {incomeCategories.map((c, i) => {
                  const max = Math.max(1, ...incomeCategories.map((x) => Number(x.total || 0)));
                  const h = (Number(c.total || 0) / max) * 80;
                  return (
                    <div key={c.category} className="ib-col">
                      <small>{formatMoney(Number(c.total || 0), lang, currency)}</small>
                      <div
                        className={`ib-bar c${(i % 4) + 1}`}
                        style={{ height: `${Math.max(6, h)}px` }}
                      />
                      <span>{c.category}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="card card-income-spark">
              <p className="card-label">{t.income}</p>
              <p className="card-num income-number">{formatMoney(income, lang, currency)}</p>
              <svg className="spark orange" viewBox="0 0 180 40" preserveAspectRatio="none">
                <path d={sparkIncome} />
              </svg>
            </article>

            <article className="card notification card-notice" id="notification-card">
              <p className="card-label">{t.notification}</p>
              <div className="notice">
                {overdueBills > 0
                  ? `${overdueBills} ${t.overdueMsg}`
                  : t.noOverdue}
              </div>
              <p className="card-label mt16">{t.quickAddTransaction}</p>
              <QuickAddForm lang={lang} />
              <p className="card-label mt16">{t.fixedExpenses}</p>
              <div className="fixed-list">
                {recurringExpenseRules.length ? (
                  recurringExpenseRules.map((rule) => (
                    <div key={rule.id} className="fixed-item">
                      <span>{t.recurringExpense}</span>
                      <span>{rule.description || rule.category}</span>
                      <b className="expense-number">
                        {formatMoney(Number(rule.amount || 0), lang, currency)}
                      </b>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t.noFixedExpenses}</p>
                )}
              </div>
              {recurringIncomeRules.length ? (
                <>
                  <p className="card-label mt16">{t.fixedIncomes}</p>
                  <div className="fixed-list">
                    {recurringIncomeRules.map((rule) => (
                      <div key={rule.id} className="fixed-item">
                        <span>{t.recurringIncome}</span>
                        <span>{rule.description || rule.category}</span>
                        <b className="income-number">{formatMoney(Number(rule.amount || 0), lang, currency)}</b>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              <p className="card-label mt16">{t.variableExpenses}</p>
              <div className="fixed-list">
                {variableExpenseRows.length ? (
                  variableExpenseRows.slice(0, 4).map((tx) => (
                    <div key={tx.id} className="fixed-item">
                      <span>{dayMonth(tx.transaction_date, lang)}</span>
                      <span>{tx.description || tx.category}</span>
                      <b className="expense-number">{formatMoney(Number(tx.amount || 0), lang, currency)}</b>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t.noVariableExpenses}</p>
                )}
              </div>
              <p className="card-label mt16">{t.variableIncomes}</p>
              <div className="fixed-list">
                {variableIncomeRows.length ? (
                  variableIncomeRows.slice(0, 4).map((tx) => (
                    <div key={tx.id} className="fixed-item">
                      <span>{dayMonth(tx.transaction_date, lang)}</span>
                      <span>{tx.description || tx.category}</span>
                      <b className="income-number">{formatMoney(Number(tx.amount || 0), lang, currency)}</b>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t.noVariableIncomes}</p>
                )}
              </div>
            </article>

            <article className="card line-chart card-trend">
              <div className="line-head">
                <p className="card-label">{t.incomeExpenses}</p>
                <Link
                  href={`/api/transactions/export?month=${selectedMonth}`}
                  className="export"
                >
                  {t.exportCsv}
                </Link>
              </div>
              <svg viewBox="0 0 620 220" preserveAspectRatio="none" className="big-chart">
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" x2="620" y1={i * 44} y2={i * 44} className="grid" />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <line key={`v-${i}`} y1="0" y2="220" x1={i * (620 / 11)} x2={i * (620 / 11)} className="grid" />
                ))}
                <path d={bigIncome} className="line income" />
                <path d={bigExpense} className="line expense" />
              </svg>
              <div className="chart-months">
                {chartMonths.map((m, idx) => (
                  <span key={`${m}-${idx}`}>{m}</span>
                ))}
              </div>
            </article>

            <article className="card asset card-assets" id="asset-card">
              <p className="card-label">{t.assets}</p>
              <div className="asset-wrap">
                <div className="donut" style={{ background: pieGradient }}>
                  <div className="donut-hole" />
                </div>
                <div className="asset-list">
                  {assetRows.slice(0, 4).map((a) => (
                    <div key={`${a.asset_type}-${a.value}`}>
                      <span>{a.asset_type}</span>
                      <b>{formatMoney(Number(a.value || 0), lang, currency)}</b>
                    </div>
                  ))}
                  {assetRows.length === 0 ? (
                    <div>
                      <span>{t.noAssets}</span>
                      <b>{formatMoney(0, lang, currency)}</b>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>

            <article className="card pets card-pets">
              <p className="card-label">{t.petsTitle}</p>
              <div className="pet-box">
                <div className="pet-lines">
                  {petList.length ? (
                    petList.map((p) => (
                      <div key={p.label}>
                        <span>{p.label}</span>
                        <b className="expense-number">{formatMoney(p.value, lang, currency)}</b>
                      </div>
                    ))
                  ) : (
                    <div>
                      <span>{t.noPetExpenses}</span>
                      <b>{formatMoney(0, lang, currency)}</b>
                    </div>
                  )}
                </div>
                <div className="pet-emoji">🐶</div>
              </div>
            </article>

            <article className="card table card-recent" id="recent-card">
              <p className="card-label">{t.recentTransactions}</p>
              <div className="rows">
                {txRows.map((tx) => (
                  <div key={tx.id} className="row">
                    <span>{tx.description || tx.category}</span>
                    <span>{dayMonth(tx.transaction_date, lang)}</span>
                    <span className={tx.type === "income" ? "pos" : "neg"}>
                      {tx.type === "income" ? "+" : "-"}
                      {formatMoney(Math.abs(Number(tx.amount || 0)), lang, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
