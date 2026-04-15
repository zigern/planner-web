import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { convertFromBaseEur, formatMoneyConverted } from "@/lib/currency-conversion";
import { DashboardSidebar } from "./components/sidebar-nav";
import { DashboardTopBar } from "./components/top-bar";
import { translateExpenseCategory } from "./utils/category-translation";
import "./dashboard-theme.css";

type TotalsRow = { income: string | null; expense: string | null };
type MonthSummaryRow = { month: string; income: string; expense: string };
type YearMonthSummaryRow = { month_num: string; income: string; expense: string };
type CategoryRow = { category: string; total: string };
type BudgetAlertRow = { category: string; budget_amount: string; spent: string };
type SpendByCategoryRow = { category: string; spent: string };
type SubRow = { id: number; service: string; cost: string; renewal_date: string | Date | null };
type AssetRow = { asset_type: string; value: string };
type DebtRow = { total_owed: string; amount_paid: string };

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

function formatMoney(value: number, lang: string, currency: string) {
  return formatMoneyConverted(value, lang, currency, 0);
}

function formatMoneySmall(value: number, lang: string, currency: string) {
  return formatMoneyConverted(value, lang, currency, 2);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildYearSeries(rows: YearMonthSummaryRow[], key: "income" | "expense") {
  const map = new Map(rows.map((r) => [Number(r.month_num), Number(r[key] || 0)]));
  return Array.from({ length: 12 }, (_, i) => map.get(i + 1) ?? 0);
}

function buildYearLabels(year: number, lang: string) {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1).toLocaleDateString(lang, { month: "short" }));
}

function compactAxisNumber(value: number, lang: string, currency: string) {
  const converted = convertFromBaseEur(value, currency);
  if (converted >= 1000000) return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(converted / 1000000)}M`;
  if (converted >= 1000) return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(converted / 1000)}k`;
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(converted);
}

function dayText(v: string | Date | null, lang: string) {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
}

function getMonthBounds(isoMonth: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return {
      from: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`,
      to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
    };
  }
  const end = new Date(year, month, 0);
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  };
}

function categoryKey(name: string) {
  return name.trim().toLowerCase();
}

function iconByCategory(name: string) {
  const k = categoryKey(name);
  if (/(housing|habita|rent|mortgage|home|house|utilities|bills)/i.test(k)) return "home";
  if (/(transport|car|fuel|uber|parking|trip)/i.test(k)) return "car";
  if (/(food|dining|restaurant|comida)/i.test(k)) return "food";
  if (/(shopping|store|compras)/i.test(k)) return "bag";
  if (/(health|saude|doctor|pharmacy)/i.test(k)) return "plus";
  if (/(pets|animal|dog|cat|vet)/i.test(k)) return "paw";
  if (/(entertainment|movie|fun|games)/i.test(k)) return "play";
  return "dot";
}

type SubscriptionVisual = {
  logoUrl: string | null;
  bg: string;
  fg: string;
  initials: string;
};

function getSubscriptionVisual(service: string): SubscriptionVisual {
  const value = service.trim().toLowerCase();
  const catalog: Array<{ pattern: RegExp; domain: string; bg: string; fg: string }> = [
    { pattern: /netflix/, domain: "netflix.com", bg: "rgba(229,9,20,0.12)", fg: "#b50710" },
    { pattern: /spotify/, domain: "spotify.com", bg: "rgba(29,185,84,0.14)", fg: "#14833d" },
    { pattern: /youtube|yt premium/, domain: "youtube.com", bg: "rgba(255,0,0,0.12)", fg: "#c10000" },
    { pattern: /disney/, domain: "disneyplus.com", bg: "rgba(17,60,207,0.12)", fg: "#113ccf" },
    { pattern: /amazon prime|prime video/, domain: "primevideo.com", bg: "rgba(19,153,255,0.12)", fg: "#0f79c9" },
    { pattern: /hbo|max/, domain: "max.com", bg: "rgba(82,82,242,0.12)", fg: "#4a4ad6" },
    { pattern: /apple music|apple one|icloud/, domain: "apple.com", bg: "rgba(17,17,17,0.08)", fg: "#111111" },
    { pattern: /google drive|google one/, domain: "google.com", bg: "rgba(66,133,244,0.12)", fg: "#2e69c7" },
    { pattern: /dropbox/, domain: "dropbox.com", bg: "rgba(0,97,255,0.12)", fg: "#0054de" },
    { pattern: /notion/, domain: "notion.so", bg: "rgba(17,17,17,0.08)", fg: "#111111" },
    { pattern: /adobe/, domain: "adobe.com", bg: "rgba(255,0,0,0.12)", fg: "#ca0000" },
    { pattern: /canva/, domain: "canva.com", bg: "rgba(0,196,204,0.12)", fg: "#0097a0" },
    { pattern: /figma/, domain: "figma.com", bg: "rgba(242,78,30,0.12)", fg: "#d74416" },
    { pattern: /chatgpt|openai/, domain: "openai.com", bg: "rgba(65,41,145,0.12)", fg: "#412991" },
    { pattern: /claude|anthropic/, domain: "anthropic.com", bg: "rgba(245,158,11,0.14)", fg: "#b26700" }
  ];

  const match = catalog.find((item) => item.pattern.test(value));
  const initials = service
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0]?.toUpperCase() ?? "")
    .join("");

  if (match) {
    return {
      logoUrl: `https://www.google.com/s2/favicons?domain=${match.domain}&sz=64`,
      bg: match.bg,
      fg: match.fg,
      initials: initials || "S"
    };
  }

  const guessedDomain = `${value.replace(/[^a-z0-9]/g, "") || "app"}.com`;
  return {
    logoUrl: `https://www.google.com/s2/favicons?domain=${guessedDomain}&sz=64`,
    bg: "rgba(47,107,232,0.12)",
    fg: "#2f6be8",
    initials: initials || "S"
  };
}

function Icon({ kind }: { kind: string }) {
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5V20h-5v-5h-6v5H4z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "car") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 13 7.5 8h9L19 13v6h-2a2 2 0 0 1-4 0h-2a2 2 0 0 1-4 0H5z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "food") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h2v8a2 2 0 0 1-2 2zM10 3h2v8a2 2 0 0 1-2 2zM17 3h2v18h-2z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "bag") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 8h12l-1 11H7z" fill="currentColor" />
        <path d="M9 8V6a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (kind === "plus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "paw") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="7" cy="8" r="2" fill="currentColor" />
        <circle cx="12" cy="6.8" r="2" fill="currentColor" />
        <circle cx="17" cy="8" r="2" fill="currentColor" />
        <path d="M6 16a6 4.6 0 0 1 12 0c0 2.2-2.2 3.6-6 3.6S6 18.2 6 16Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6v12l10-6z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="currentColor" />
    </svg>
  );
}

const accent = ["#46d369", "#f0a474", "#5f89ff", "#f15eaa", "#b07cff", "#ff6b6b", "#45b4ff", "#9bd664"];

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

export default async function DashboardPage({
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
          <h1 className="text-2xl font-bold text-amber-900">Missing MySQL/Auth setup</h1>
          <p className="mt-3 text-amber-800">Configure environment variables and refresh.</p>
        </section>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");
  const name = user.displayName?.trim() || user.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();

  const params = await searchParams;
  const selectedMonth = parseMonthParam(params?.month);
  const lang = parseLangParam(params?.lang);
  const isPt = lang === "pt-PT";
  const currency = parseCurrencyParam(params?.currency);
  const presetFilter = parsePresetParam(params?.preset);
  const fromParam = parseDateParam(params?.from);
  const toParam = parseDateParam(params?.to);
  const monthBounds = getMonthBounds(selectedMonth);
  const todayIso = isoDate(new Date());
  const last30Iso = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const last90Iso = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));
  const effectiveFrom =
    fromParam || (presetFilter === "30d" ? last30Iso : presetFilter === "90d" ? last90Iso : monthBounds.from);
  const effectiveTo = toParam || (presetFilter === "month" ? monthBounds.to : todayIso);
  const text = isPt
    ? {
        search: "Pesquisar",
        logout: "Terminar sessão",
        greeting: `Boa tarde, ${name}👋`,
        subtitle: "As tuas finanças estão saudáveis neste período.",
        month: "Mês",
        apply: "Aplicar",
        thisMonth: "Este mês",
        last30Days: "Últimos 30 dias",
        last90Days: "Últimos 90 dias",
        addExpense: "Adicionar despesa",
        addIncome: "Adicionar receita",
        more: "Mais",
        netBalance: "Saldo líquido",
        safe: "SEGURO",
        vsLastMonth: "vs mês anterior",
        burnRate: "Taxa de gasto",
        savingsTrack: "Estás no caminho certo para aumentar as tuas poupanças este mês.",
        income: "Receita",
        expense: "Despesa",
        savingsRatio: "Rácio de poupança",
        remainingBalance: "Saldo restante",
        netWorth: "Património",
        overspending: "Excesso de gastos",
        increased: "aumentou",
        thisWeek: "esta semana.",
        youSpent: "Gastaste",
        moreSuffix: "a mais.",
        noOverspending: "Sem excesso de gastos.",
        subscription: "Subscrições",
        manage: "Gerir",
        renewsOn: "Renova em",
        noActiveSubscriptions: "Sem subscrições ativas.",
        budgetAlmostExceeded: "Orçamento quase excedido",
        unplanned: "Sem orçamento",
        left: "restante",
        viewActivity: "Ver atividade",
        setBudget: "Definir orçamento",
        noBudgetAlerts: "Sem alertas de orçamento este mês.",
        incomeVsExpenseChart: "Gráfico receita vs despesa",
        all: "Todos",
        last6Months: "Últimos 6 meses",
        max: "máx",
        addMovements: "Adicionar movimentos",
        spendingBreakdown: "Despesas por categoria",
        noExpenseData: "Sem dados de despesa neste mês.",
        critical: "Crítico",
        warning: "Aviso",
        watch: "Atenção",
        budgetReached: "Orçamento atingiu",
        usage: "de uso.",
        noBudgetSetPrefix: "Sem orçamento definido. Já gastaste",
        noBudgetSetSuffix: "neste mês."
      }
    : {
        search: "Search",
        logout: "Logout",
        greeting: `Good evening, ${name}👋`,
        subtitle: "Your finances are looking healthy in this period.",
        month: "Month",
        apply: "Apply",
        thisMonth: "This month",
        last30Days: "Last 30 days",
        last90Days: "Last 90 days",
        addExpense: "Add Expense",
        addIncome: "Add Income",
        more: "More",
        netBalance: "Net Balance",
        safe: "SAFE",
        vsLastMonth: "vs last month",
        burnRate: "Burn Rate",
        savingsTrack: "You are on track to grow your savings this month.",
        income: "Income",
        expense: "Expense",
        savingsRatio: "Savings Ratio",
        remainingBalance: "Remaining Balance",
        netWorth: "Net Worth",
        overspending: "Overspending",
        increased: "increased",
        thisWeek: "this week.",
        youSpent: "You spent",
        moreSuffix: "more.",
        noOverspending: "No overspending detected",
        subscription: "Subscription",
        manage: "Manage",
        renewsOn: "Renews on",
        noActiveSubscriptions: "No active subscriptions",
        budgetAlmostExceeded: "Budget Almost Exceeded",
        unplanned: "Unplanned",
        left: "left",
        viewActivity: "View activity",
        setBudget: "Set budget",
        noBudgetAlerts: "No budget alerts this month",
        incomeVsExpenseChart: "Income vs Expense Chart",
        all: "All",
        last6Months: "Last 6 months",
        max: "max",
        addMovements: "Add movements",
        spendingBreakdown: "Spending Breakdown",
        noExpenseData: "No expense data for this month.",
        critical: "Critical",
        warning: "Warning",
        watch: "Watch",
        budgetReached: "Budget reached",
        usage: "usage.",
        noBudgetSetPrefix: "No budget set. Already spent",
        noBudgetSetSuffix: "this month."
      };

  const db = getDb();

  const totalsRows = await safeQueryRows<TotalsRow>(
    db,
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND DATE(transaction_date) >= ?
       AND DATE(transaction_date) <= ?`,
    [user.userId, effectiveFrom, effectiveTo]
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
       AND DATE(transaction_date) >= ?
       AND DATE(transaction_date) <= ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 6`,
    [user.userId, effectiveFrom, effectiveTo]
  );

  const subsRows = await safeQueryRows<SubRow>(
    db,
    `SELECT id, service, cost, renewal_date
     FROM subscriptions
     WHERE user_id = ? AND status = 'active'
     ORDER BY id DESC
     LIMIT 12`,
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

  const budgetRows = await safeQueryRows<BudgetAlertRow>(
    db,
    `SELECT b.category, b.budget_amount, COALESCE(SUM(t.amount), 0) as spent
      FROM monthly_budgets b
      LEFT JOIN transactions t
        ON t.user_id = b.user_id
       AND t.type = 'expense'
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = b.budget_month
       AND t.category = b.category
      WHERE b.user_id = ? AND b.budget_month = ?
      GROUP BY b.category, b.budget_amount
      ORDER BY spent DESC
      LIMIT 4`,
    [user.userId, selectedMonth]
  );

  const spendByCategoryRows = await safeQueryRows<SpendByCategoryRow>(
    db,
    `SELECT category, SUM(amount) AS spent
       FROM transactions
      WHERE user_id = ?
        AND type = 'expense'
        AND DATE(transaction_date) >= ?
        AND DATE(transaction_date) <= ?
      GROUP BY category
      ORDER BY spent DESC`,
    [user.userId, effectiveFrom, effectiveTo]
  );

  const selectedYear = Number(selectedMonth.slice(0, 4));
  const yearSummaryRows = await safeQueryRows<YearMonthSummaryRow>(
    db,
    `SELECT DATE_FORMAT(transaction_date, '%m') AS month_num,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND YEAR(transaction_date) = ?
     GROUP BY DATE_FORMAT(transaction_date, '%m')
     ORDER BY month_num ASC`,
    [user.userId, selectedYear]
  );

  const totals = totalsRows[0] ?? { income: "0", expense: "0" };
  const income = Number(totals.income || 0);
  const expense = Number(totals.expense || 0);
  const netBalance = income - expense;

  const [year, month] = selectedMonth.split("-").map(Number);
  const previousDate = new Date(year, month - 2, 1);
  const previousMonthIso = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
  const monthMap = new Map(summaryRows.map((r) => [r.month, r]));
  const prev = monthMap.get(previousMonthIso);
  const prevIncome = Number(prev?.income || 0);
  const prevExpense = Number(prev?.expense || 0);
  const prevBalance = prevIncome - prevExpense;

  const incomeDelta = percentChange(income, prevIncome);
  const expenseDelta = percentChange(expense, prevExpense);
  const netDelta = percentChange(netBalance, prevBalance);

  const savingsRatio = income > 0 ? (Math.max(netBalance, 0) / income) * 100 : 0;
  const burnRate = income > 0 ? (expense / income) * 100 : 0;

  const assetsTotal = assetRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const liabilitiesTotal = debtRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)),
    0
  );
  const netWorth = assetsTotal - liabilitiesTotal + netBalance;
  const remainingBalance = Math.max(netBalance, 0);

  const incomeSeries = buildYearSeries(yearSummaryRows, "income");
  const expenseSeries = buildYearSeries(yearSummaryRows, "expense");
  const labels = buildYearLabels(selectedYear, lang);
  const maxY = Math.max(1, ...incomeSeries, ...expenseSeries);
  const barHeightPx = 220;
  const yTicks = [1, 0.75, 0.5, 0.25, 0];

  const totalSpent = Math.max(1, expenseCategories.reduce((sum, row) => sum + Number(row.total || 0), 0));
  const rangeDays = Math.max(
    1,
    Math.floor((new Date(`${effectiveTo}T00:00:00`).getTime() - new Date(`${effectiveFrom}T00:00:00`).getTime()) / 86400000) + 1
  );
  const overSpending = expenseCategories.slice(0, 3).map((row) => {
    const current = Number(row.total || 0);
    const weeklyIncrease = Math.round((current / Math.max(1, rangeDays)) * 7 * 0.14);
    return {
      category: row.category,
      pct: Math.max(8, Math.min(68, Math.round((weeklyIncrease / Math.max(1, current)) * 100))),
      amount: weeklyIncrease
    };
  });

  const budgetMap = new Map(
    budgetRows.map((row) => {
      const budget = Number(row.budget_amount || 0);
      const spent = Number(row.spent || 0);
      const left = Math.max(0, budget - spent);
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      return [categoryKey(row.category), { category: row.category, budget, spent, left, pct }] as const;
    })
  );

  const budgetAlerts = Array.from(budgetMap.values())
    .filter((row) => row.pct >= 70)
    .map((row) => {
      const severity = row.pct >= 100 ? "out" : row.pct >= 90 ? "warn" : "in";
      const severityLabel =
        row.pct >= 100 ? text.critical : row.pct >= 90 ? text.warning : text.watch;
      return {
        category: row.category,
        left: row.left,
        pct: row.pct,
        isUnplanned: false,
        severity,
        severityText: severityLabel,
        message: `${text.budgetReached} ${row.pct}% ${text.usage}`
      };
    });

  const unplannedAlerts = spendByCategoryRows
    .filter((row) => !budgetMap.has(categoryKey(row.category)))
    .map((row) => {
      const spent = Number(row.spent || 0);
      const threshold = Math.max(75, expense * 0.06);
      const severity = spent >= threshold ? "warn" : "in";
      const severityText = spent >= threshold ? text.warning : text.watch;
      return {
        category: row.category,
        left: 0,
        pct: 0,
        isUnplanned: true,
        severity,
        severityText,
        message: `${text.noBudgetSetPrefix} ${formatMoneySmall(spent, lang, currency)} ${text.noBudgetSetSuffix}`
      };
    })
    .slice(0, 2);

  const mergedBudgetAlerts = [...budgetAlerts, ...unplannedAlerts]
    .sort((a, b) => {
      const rank = { out: 3, warn: 2, in: 1 } as const;
      return rank[b.severity as keyof typeof rank] - rank[a.severity as keyof typeof rank] || b.pct - a.pct;
    })
    .slice(0, 4);

  const presetBase = new URLSearchParams({
    month: selectedMonth,
    lang,
    currency
  });
  return (
    <div className="casha-wrap">
      <div className="casha-shell">
        <DashboardTopBar selectedMonth={selectedMonth} lang={lang} currency={currency} />
        <div className="workspace-shell">
          <DashboardSidebar
            current="dashboard"
            selectedMonth={selectedMonth}
            lang={lang}
            currency={currency}
            showBottomControls
            userDisplayName={name} userInitials={initials} logoutLabel={text.logout}
          />
          <main className="dash-main">
          <section className="greeting-row">
            <div>
              <h1 className="dashboard-title">{text.greeting}</h1>
              <p className="dashboard-subtitle">{text.subtitle}</p>
            </div>
            <div className="cta-row">
              <Link
                href={`/dashboard/movimentos?month=${selectedMonth}&lang=${lang}&currency=${currency}&preset=${presetFilter}&from=${effectiveFrom}&to=${effectiveTo}`}
                className="btn btn-dark"
              >
                {text.addExpense}
              </Link>
              <Link
                href={`/dashboard/movimentos?month=${selectedMonth}&lang=${lang}&currency=${currency}&preset=${presetFilter}&from=${effectiveFrom}&to=${effectiveTo}`}
                className="btn"
              >
                {text.addIncome}
              </Link>
              <Link href={`/dashboard/spreadsheet?month=${selectedMonth}&lang=${lang}&currency=${currency}`} className="btn">
                {text.more}
              </Link>
            </div>
          </section>

          <section className="metrics-grid">
            <article className="panel panel-net-balance">
              <div className="panel-head">
                <h3>{text.netBalance}</h3>
                <span className="safe-pill">{text.safe}</span>
              </div>
              <p className="big-number">
                {netBalance >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(netBalance), lang, currency)}
              </p>
              <p className={`delta ${netDelta >= 0 ? "up" : "down"}`}>
                {netDelta >= 0 ? "↑" : "↓"}
                {Math.abs(netDelta).toFixed(1)}% {text.vsLastMonth}
              </p>
              <div className="hr" />
              <div className="burn-row">
                <span>{text.burnRate}</span>
                <span>{Math.round(burnRate)}%</span>
              </div>
              <div className="burn-track">
                <div style={{ width: `${Math.min(100, burnRate)}%` }} />
              </div>
              <p className="sub-copy">{text.savingsTrack}</p>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>{text.income}</h3>
              </div>
              <p className="mid-number">{formatMoney(income, lang, currency)}</p>
              <p className={`delta ${incomeDelta >= 0 ? "up" : "down"}`}>
                {incomeDelta >= 0 ? "↑" : "↓"}
                {Math.abs(incomeDelta).toFixed(1)}% {text.vsLastMonth}
              </p>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>{text.expense}</h3>
              </div>
              <p className="mid-number">{formatMoney(expense, lang, currency)}</p>
              <p className={`delta ${expenseDelta <= 0 ? "up" : "down"}`}>
                {expenseDelta <= 0 ? "↑" : "↓"}
                {Math.abs(expenseDelta).toFixed(1)}% {text.vsLastMonth}
              </p>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>{text.savingsRatio}</h3>
              </div>
              <p className="mid-number">{Math.max(0, savingsRatio).toFixed(0)}%</p>
              <p className="delta up">
                ↑{Math.max(0, netDelta).toFixed(1)}% {text.vsLastMonth}
              </p>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>{text.remainingBalance}</h3>
              </div>
              <p className="mid-number">{formatMoney(remainingBalance, lang, currency)}</p>
              <p className="sub-copy">
                {text.netWorth}: {formatMoney(netWorth, lang, currency)}
              </p>
            </article>
          </section>

          <section className="insight-grid">
            <article className="panel">
              <div className="panel-head">
                <h3>{text.overspending}</h3>
              </div>
              <ul className="list-simple">
                {overSpending.length ? (
                  overSpending.map((item, i) => (
                    <li key={`${item.category}-${i}`}>
                      <span
                        className="icon-badge"
                        style={{ backgroundColor: `${accent[i % accent.length]}20`, color: accent[i % accent.length] }}
                      >
                        <Icon kind={iconByCategory(item.category)} />
                      </span>
                      <div>
                        <b>{translateExpenseCategory(item.category, lang)}</b>
                        <p>
                          {text.increased} <strong>{item.pct}%</strong> {text.thisWeek} {text.youSpent}{" "}
                          <strong>{formatMoneySmall(item.amount, lang, currency)}</strong> {text.moreSuffix}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div>
                      <b>{text.noOverspending}</b>
                    </div>
                  </li>
                )}
              </ul>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>{text.subscription}</h3>
                <Link className="panel-manage-link" href={`/dashboard/bills?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                  {text.manage}
                </Link>
              </div>
              <ul className="list-money">
                {subsRows.length ? (
                  subsRows.map((sub) => {
                    const visual = getSubscriptionVisual(sub.service);
                    return (
                      <li key={sub.id}>
                        <span className="icon-badge sub-logo" style={{ backgroundColor: visual.bg, color: visual.fg }}>
                          {visual.logoUrl ? (
                            <img src={visual.logoUrl} alt={`${sub.service} logo`} loading="lazy" />
                          ) : (
                            <span className="sub-logo-fallback">{visual.initials}</span>
                          )}
                        </span>
                        <div>
                          <b>{sub.service}</b>
                          <p>
                            {text.renewsOn} {dayText(sub.renewal_date, lang)}
                          </p>
                        </div>
                        <strong>{formatMoneySmall(Number(sub.cost || 0), lang, currency)}</strong>
                      </li>
                    );
                  })
                ) : (
                  <li>
                    <div>
                      <b>{text.noActiveSubscriptions}</b>
                    </div>
                  </li>
                )}
              </ul>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>{text.budgetAlmostExceeded}</h3>
                <Link className="panel-manage-link" href={`/dashboard/orcamentos?month=${selectedMonth}&lang=${lang}&currency=${currency}`}>
                  {text.manage}
                </Link>
              </div>
              <ul className="list-simple">
                {mergedBudgetAlerts.length ? (
                  mergedBudgetAlerts.map((alert, i) => (
                    <li key={`${alert.category}-${i}`}>
                      <span
                        className="icon-badge"
                        style={{
                          backgroundColor: `${accent[(i + 3) % accent.length]}20`,
                          color: accent[(i + 3) % accent.length]
                        }}
                      >
                        <Icon kind={iconByCategory(alert.category)} />
                      </span>
                      <div>
                        <b>
                          {translateExpenseCategory(alert.category, lang)}{" "}
                          <strong>
                            {alert.isUnplanned ? text.unplanned : `${formatMoneySmall(alert.left, lang, currency)} ${text.left}`}
                          </strong>
                        </b>
                        <p>{alert.message}</p>
                        <div className="alert-actions">
                          <Link
                            href={`/dashboard/activity?month=${selectedMonth}&lang=${lang}&currency=${currency}&preset=${presetFilter}&type=expense&category=${encodeURIComponent(alert.category)}&from=${effectiveFrom}&to=${effectiveTo}`}
                          >
                            {text.viewActivity}
                          </Link>
                          <Link
                            href={`/dashboard/orcamentos?month=${selectedMonth}&lang=${lang}&currency=${currency}&category=${encodeURIComponent(alert.category)}`}
                          >
                            {text.setBudget}
                          </Link>
                        </div>
                      </div>
                      <span className={`activity-kind ${alert.severity}`}>{alert.severityText}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <div>
                      <b>{text.noBudgetAlerts}</b>
                    </div>
                  </li>
                )}
              </ul>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel panel-chart">
              <div className="panel-head">
                <h3>{text.incomeVsExpenseChart}</h3>
                <div className="filters">
                  <span>{text.all}</span>
                  <span>{text.last6Months}</span>
                </div>
              </div>
              <div className="annual-chart-wrap">
                <div className="annual-y-axis">
                  {yTicks.map((ratio) => (
                    <span key={ratio}>{compactAxisNumber(maxY * ratio, lang, currency)}</span>
                  ))}
                </div>
                <div className="annual-plot-area">
                  <div className="annual-grid-lines" aria-hidden="true">
                    {yTicks.map((ratio) => (
                      <span key={ratio} />
                    ))}
                  </div>
                  <div className="annual-bars">
                    {labels.map((label, index) => (
                      <div key={`${label}-${index}`} className="annual-bar-col">
                        <div className="annual-bar-stack">
                          <div
                            className="annual-bar income"
                            style={{ height: `${Math.max((incomeSeries[index] / maxY) * barHeightPx, incomeSeries[index] > 0 ? 6 : 0)}px` }}
                            title={`${text.income}: ${formatMoneySmall(incomeSeries[index], lang, currency)}`}
                          />
                          <div
                            className="annual-bar expense"
                            style={{ height: `${Math.max((expenseSeries[index] / maxY) * barHeightPx, expenseSeries[index] > 0 ? 6 : 0)}px` }}
                            title={`${text.expense}: ${formatMoneySmall(expenseSeries[index], lang, currency)}`}
                          />
                        </div>
                        <small>{label}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="panel-actions-row">
                <Link
                  className="panel-manage-link"
                  href={`/dashboard/movimentos?month=${selectedMonth}&lang=${lang}&currency=${currency}&preset=${presetFilter}&from=${effectiveFrom}&to=${effectiveTo}`}
                >
                  {text.addMovements}
                </Link>
                <Link
                  className="panel-manage-link"
                  href={`/dashboard/activity?month=${selectedMonth}&lang=${lang}&currency=${currency}&preset=${presetFilter}&from=${effectiveFrom}&to=${effectiveTo}`}
                >
                  {text.viewActivity}
                </Link>
              </div>
            </article>

            <article className="panel panel-breakdown">
              <div className="panel-head">
                <h3>{text.spendingBreakdown}</h3>
              </div>
              <ul className="breakdown-list">
                {expenseCategories.length ? (
                  expenseCategories.map((row, idx) => {
                    const value = Number(row.total || 0);
                    const pct = Math.round((value / totalSpent) * 100);
                    const color = accent[idx % accent.length];
                    return (
                      <li key={row.category}>
                        <div className="break-label-row">
                          <span className="break-name">
                            <span
                              className="icon-badge break-badge"
                              style={{
                                backgroundColor: `${color}20`,
                                color
                              }}
                              aria-hidden="true"
                            >
                              <Icon kind={iconByCategory(row.category)} />
                            </span>
                            <span>{translateExpenseCategory(row.category, lang)}</span>
                          </span>
                          <b>{formatMoneySmall(value, lang, currency)}</b>
                        </div>
                        <div className="break-track">
                          <div style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <small>{pct}%</small>
                      </li>
                    );
                  })
                ) : (
                  <li>{text.noExpenseData}</li>
                )}
              </ul>
            </article>
          </section>

          </main>
        </div>
      </div>
    </div>
  );
}
