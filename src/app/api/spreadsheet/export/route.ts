import { NextResponse } from "next/server";
import type { Pool } from "mysql2/promise";
import { getSessionUser } from "@/lib/auth/session";
import { convertFromBaseEur } from "@/lib/currency-conversion";
import { getDb } from "@/lib/db";

type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};

type BillRow = {
  id: number;
  name: string;
  amount: string;
  due_day: number;
  frequency: "monthly" | "quarterly" | "yearly";
  auto_pay: number;
  status: "pending" | "paid";
};

type SubscriptionRow = {
  id: number;
  service: string;
  cost: string;
  billing_cycle: "monthly" | "yearly";
  category: string;
  status: "active" | "paused" | "cancelled";
  renewal_date: string | Date | null;
};

type AssetRow = {
  id: number;
  name: string;
  asset_type: string;
  value: string;
  as_of_date: string | Date | null;
};

type DebtRow = {
  id: number;
  name: string;
  total_owed: string;
  amount_paid: string;
  interest_rate: string;
  due_date: string | Date | null;
};

type BudgetRow = {
  id: number;
  budget_month: string;
  category: string;
  budget_amount: string;
};

type GoalRow = {
  id: number;
  name: string;
  target_amount: string;
  saved_amount: string;
  deadline: string | Date | null;
  status: "not_started" | "in_progress" | "completed";
};

type CategorySummaryRow = {
  category: string;
  total: string;
};

type ExportText = {
  filePrefix: string;
  generatedAt: string;
  period: string;
  currency: string;
  kpi: string;
  value: string;
  incomePeriod: string;
  expensePeriod: string;
  savingsPeriod: string;
  assetsTotal: string;
  openDebtTotal: string;
  netWorth: string;
  income: string;
  expense: string;
  savings: string;
  month: string;
  category: string;
  amount: string;
  detail: string;
  date: string;
  status: string;
  type: string;
  paid: string;
  late: string;
  overview: string;
  monthlyEvolution: string;
  categoryBreakdown: string;
  annualSummary: string;
  trend: string;
  periodPercent: string;
};

type CellType = "String" | "Number" | "DateTime";

type CellModel = {
  value: unknown;
  styleId?: string;
  type?: CellType;
  mergeAcross?: number;
};

type RowModel = CellModel[];

type WorksheetModel = {
  name: string;
  rows: RowModel[];
  columnWidths?: number[];
  freezeHeaderRow?: boolean;
  hideGridlines?: boolean;
  hideHeadings?: boolean;
  zoom?: number;
};

function parseMonthParam(value: string | null) {
  if (!value) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 7);
}

function parseLangParam(value: string | null) {
  if (!value) return "en-US";
  const allowed = new Set(["pt-PT", "en-US", "es-ES", "fr-FR"]);
  return allowed.has(value) ? value : "en-US";
}

function parseCurrencyParam(value: string | null) {
  if (!value) return "USD";
  const allowed = new Set(["EUR", "USD", "GBP", "BRL"]);
  return allowed.has(value) ? value : "USD";
}

function parseTypeParam(value: string | null) {
  if (!value) return "all";
  return value === "income" || value === "expense" ? value : "all";
}

function parseStatusParam(value: string | null) {
  if (!value) return "all";
  return value === "late" || value === "paid" ? value : "all";
}

function parseDateParam(value: string | null) {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function parseTextParam(value: string | null) {
  if (!value) return "";
  return value.trim().slice(0, 80);
}

function parsePresetParam(value: string | null) {
  if (!value) return "month";
  return value === "month" || value === "30d" || value === "90d" ? value : "month";
}

function getExportText(lang: string): ExportText {
  if (lang === "pt-PT") {
    return {
      filePrefix: "planqly-relatorio",
      generatedAt: "Gerado em",
      period: "Período",
      currency: "Moeda",
      kpi: "Indicador",
      value: "Valor",
      incomePeriod: "Receita (período)",
      expensePeriod: "Despesa (período)",
      savingsPeriod: "Poupança (período)",
      assetsTotal: "Ativos totais",
      openDebtTotal: "Dívida em aberto",
      netWorth: "Património líquido",
      income: "Receita",
      expense: "Despesa",
      savings: "Poupança",
      month: "Mês",
      category: "Categoria",
      amount: "Montante",
      detail: "Detalhe",
      date: "Data",
      status: "Estado",
      type: "Tipo",
      paid: "Pago",
      late: "Em atraso",
      overview: "Resumo Executivo",
      monthlyEvolution: "Evolução Mensal (Jan-Dez)",
      categoryBreakdown: "Distribuição por Categoria (Período)",
      annualSummary: "Resumo Anual",
      trend: "Tendência",
      periodPercent: "% no período"
    };
  }
  return {
    filePrefix: "planqly-report",
    generatedAt: "Generated at",
    period: "Period",
    currency: "Currency",
    kpi: "KPI",
    value: "Value",
    incomePeriod: "Income (period)",
    expensePeriod: "Expense (period)",
    savingsPeriod: "Savings (period)",
    assetsTotal: "Assets total",
    openDebtTotal: "Open debt total",
    netWorth: "Net worth",
    income: "Income",
    expense: "Expense",
    savings: "Savings",
    month: "Month",
    category: "Category",
    amount: "Amount",
    detail: "Detail",
    date: "Date",
    status: "Status",
    type: "Type",
    paid: "Paid",
    late: "Late",
    overview: "Executive Overview",
    monthlyEvolution: "Monthly Evolution (Jan-Dec)",
    categoryBreakdown: "Category Breakdown (Period)",
    annualSummary: "Annual Summary",
    trend: "Trend",
    periodPercent: "% in period"
  };
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

function normalizeDate(value: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function monthShort(value: string | Date, lang: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(lang, { month: "short" });
}

function monthNameByIndex(monthIndex: number, lang: string) {
  const date = new Date(2000, monthIndex, 1);
  return date.toLocaleDateString(lang, { month: "short" });
}

function moneyValue(value: number, currency: string) {
  return Number(convertFromBaseEur(value, currency).toFixed(2));
}

function formatFrequency(value: string, lang: string) {
  if (lang === "pt-PT") {
    if (value === "monthly") return "Mensal";
    if (value === "quarterly") return "Trimestral";
    if (value === "yearly") return "Anual";
  }
  if (value === "monthly") return "Monthly";
  if (value === "quarterly") return "Quarterly";
  if (value === "yearly") return "Yearly";
  return value;
}

async function safeQueryRows<T>(db: Pool, sql: string, params: unknown[]): Promise<T[]> {
  try {
    const [rows] = await db.query(sql, params);
    return rows as T[];
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (((error as { code?: string }).code === "ER_NO_SUCH_TABLE") ||
        ((error as { code?: string }).code === "ER_BAD_FIELD_ERROR"))
    ) {
      return [];
    }
    throw error;
  }
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isNumericLike(value: unknown) {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
}

function inferCellType(value: unknown): CellType {
  return isNumericLike(value) ? "Number" : "String";
}

function toCellModel(value: unknown, styleId?: string, type?: CellType, mergeAcross?: number): CellModel {
  return { value, styleId, type, mergeAcross };
}

function xmlCell(cell: CellModel) {
  const style = cell.styleId ? ` ss:StyleID="${cell.styleId}"` : "";
  const mergeAcross = Number.isInteger(cell.mergeAcross) && (cell.mergeAcross || 0) > 0 ? ` ss:MergeAcross="${cell.mergeAcross}"` : "";
  const type = cell.type || inferCellType(cell.value);
  const value = type === "Number" ? Number(cell.value || 0) : escapeXml(cell.value);
  return `<Cell${style}${mergeAcross}><Data ss:Type="${type}">${value}</Data></Cell>`;
}

function xmlRow(cells: RowModel) {
  return `<Row>${cells.map((cell) => xmlCell(cell)).join("")}</Row>`;
}

function worksheetOptionsXml(options: {
  freezeHeaderRow?: boolean;
  hideGridlines?: boolean;
  hideHeadings?: boolean;
  zoom?: number;
}) {
  const hasOptions = Boolean(options.freezeHeaderRow || options.hideGridlines || options.hideHeadings || options.zoom);
  if (!hasOptions) return "";

  const freezeXml = options.freezeHeaderRow
    ? `
    <FreezePanes/>
    <FrozenNoSplit/>
    <SplitHorizontal>1</SplitHorizontal>
    <TopRowBottomPane>1</TopRowBottomPane>
    <ActivePane>2</ActivePane>`
    : "";

  const gridXml = options.hideGridlines ? "\n    <DoNotDisplayGridlines/>" : "";
  const headingsXml = options.hideHeadings ? "\n    <DoNotDisplayHeadings/>" : "";
  const zoomXml = options.zoom ? `\n    <Zoom>${Math.max(60, Math.min(200, Math.round(options.zoom)))}</Zoom>` : "";

  return `
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">${freezeXml}${gridXml}${headingsXml}${zoomXml}
  </WorksheetOptions>`;
}

function xmlWorksheet(sheet: WorksheetModel) {
  const columnsXml = (sheet.columnWidths || []).map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${Math.max(40, width)}"/>`).join("");
  const rowsXml = sheet.rows.map((row) => xmlRow(row)).join("");
  const worksheetOptions = worksheetOptionsXml({
    freezeHeaderRow: sheet.freezeHeaderRow,
    hideGridlines: sheet.hideGridlines,
    hideHeadings: sheet.hideHeadings,
    zoom: sheet.zoom
  });
  return `<Worksheet ss:Name="${escapeXml(sheet.name).slice(0, 31)}"><Table>${columnsXml}${rowsXml}</Table>${worksheetOptions}</Worksheet>`;
}

function tableRows(
  headers: Array<{ label: string; styleId?: string }>,
  rows: Array<Array<{ value: unknown; kind?: "text" | "number" | "currency" | "percent" | "date" }>>,
  variant: "light" | "dark" = "light"
) {
  const headerStyle = variant === "dark" ? "DarkTableHeader" : "TableHeader";
  const textPrefix = variant === "dark" ? "DarkCellText" : "CellText";
  const numberPrefix = variant === "dark" ? "DarkCellNumber" : "CellNumber";
  const currencyPrefix = variant === "dark" ? "DarkCellCurrency" : "CellCurrency";
  const percentPrefix = variant === "dark" ? "DarkCellPercent" : "CellPercent";
  const datePrefix = variant === "dark" ? "DarkCellDate" : "CellDate";

  const out: RowModel[] = [
    headers.map((h) => toCellModel(h.label, h.styleId || headerStyle, "String"))
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const isEven = i % 2 === 0;
    const suffix = isEven ? "Even" : "Odd";
    out.push(
      rows[i].map((cell) => {
        if (cell.kind === "number") return toCellModel(cell.value, `${numberPrefix}${suffix}`, "Number");
        if (cell.kind === "currency") return toCellModel(cell.value, `${currencyPrefix}${suffix}`, "Number");
        if (cell.kind === "percent") return toCellModel(cell.value, `${percentPrefix}${suffix}`, "Number");
        if (cell.kind === "date") return toCellModel(cell.value, `${datePrefix}${suffix}`, "String");
        return toCellModel(cell.value, `${textPrefix}${suffix}`, "String");
      })
    );
  }
  return out;
}

function barText(value: number, max: number) {
  if (max <= 0 || value <= 0) return "";
  const count = Math.max(1, Math.round((value / max) * 20));
  return "█".repeat(count);
}

function sparkline(values: number[]) {
  const chars = "▁▂▃▄▅▆▇█";
  const max = Math.max(...values, 0);
  if (max <= 0) return "";
  return values
    .map((v) => {
      const idx = Math.max(0, Math.min(chars.length - 1, Math.round((v / max) * (chars.length - 1))));
      return chars[idx];
    })
    .join("");
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function circleGauge(ratio: number) {
  const pct = clamp01(ratio);
  const filled = Math.round(pct * 10);
  return `${"●".repeat(filled)}${"○".repeat(Math.max(0, 10 - filled))} ${Math.round(pct * 100)}%`;
}

function barGauge(ratio: number, width = 24) {
  const pct = clamp01(ratio);
  const filled = Math.round(pct * width);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))} ${Math.round(pct * 100)}%`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const selectedMonth = parseMonthParam(url.searchParams.get("month"));
  const selectedYear = Number(selectedMonth.slice(0, 4)) || new Date().getFullYear();
  const lang = parseLangParam(url.searchParams.get("lang"));
  const currency = parseCurrencyParam(url.searchParams.get("currency"));
  const t = getExportText(lang);
  const typeFilter = parseTypeParam(url.searchParams.get("type"));
  const categoryFilter = parseTextParam(url.searchParams.get("category")) || "all";
  const statusFilter = parseStatusParam(url.searchParams.get("status"));
  const preset = parsePresetParam(url.searchParams.get("preset"));
  const fromFilter = parseDateParam(url.searchParams.get("from"));
  const toFilter = parseDateParam(url.searchParams.get("to"));
  const queryFilter = parseTextParam(url.searchParams.get("q"));

  const monthBounds = getMonthBounds(selectedMonth);
  const todayIso = isoDate(new Date());
  const last30Iso = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const last90Iso = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));
  const effectiveFrom = fromFilter || (preset === "30d" ? last30Iso : preset === "90d" ? last90Iso : monthBounds.from);
  const effectiveTo = toFilter || (preset === "month" ? monthBounds.to : todayIso);

  const db = getDb();
  const where: string[] = ["user_id = ?", "DATE(transaction_date) >= ?", "DATE(transaction_date) <= ?"];
  const values: unknown[] = [user.userId, effectiveFrom, effectiveTo];

  if (typeFilter !== "all") {
    where.push("type = ?");
    values.push(typeFilter);
  }
  if (categoryFilter !== "all") {
    where.push("category = ?");
    values.push(categoryFilter);
  }
  if (queryFilter) {
    where.push("(LOWER(category) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)");
    const q = `%${queryFilter.toLowerCase()}%`;
    values.push(q, q);
  }

  const txRowsRaw = await safeQueryRows<TxRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE ${where.join(" AND ")}
     ORDER BY transaction_date DESC, id DESC
     LIMIT 5000`,
    values
  );

  const allTxRows = await safeQueryRows<TxRow>(
    db,
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 10000`,
    [user.userId]
  );

  const bills = await safeQueryRows<BillRow>(
    db,
    `SELECT id, name, amount, due_day, frequency, auto_pay, status
     FROM bills
     WHERE user_id = ?
     ORDER BY id DESC`,
    [user.userId]
  );

  const subscriptions = await safeQueryRows<SubscriptionRow>(
    db,
    `SELECT id, service, cost, billing_cycle, category, status, renewal_date
     FROM subscriptions
     WHERE user_id = ?
     ORDER BY id DESC`,
    [user.userId]
  );

  const assets = await safeQueryRows<AssetRow>(
    db,
    `SELECT id, name, asset_type, value, as_of_date
     FROM assets
     WHERE user_id = ?
     ORDER BY value DESC`,
    [user.userId]
  );

  const debts = await safeQueryRows<DebtRow>(
    db,
    `SELECT id, name, total_owed, amount_paid, interest_rate, due_date
     FROM debts
     WHERE user_id = ?
     ORDER BY total_owed DESC`,
    [user.userId]
  );

  const budgets = await safeQueryRows<BudgetRow>(
    db,
    `SELECT id, budget_month, category, budget_amount
     FROM monthly_budgets
     WHERE user_id = ?
     ORDER BY budget_month DESC, category ASC`,
    [user.userId]
  );

  const goals = await safeQueryRows<GoalRow>(
    db,
    `SELECT id, name, target_amount, saved_amount, deadline, status
     FROM goals
     WHERE user_id = ?
     ORDER BY id DESC`,
    [user.userId]
  );

  const categorySummary = await safeQueryRows<CategorySummaryRow>(
    db,
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE(transaction_date) >= ?
       AND DATE(transaction_date) <= ?
     GROUP BY category
     ORDER BY total DESC`,
    [user.userId, effectiveFrom, effectiveTo]
  );

  const lateBillSet = new Set(
    bills.filter((b) => b.status === "pending" && Number(b.due_day) < new Date().getDate()).map((b) => b.name.toLowerCase())
  );

  const txRows = txRowsRaw
    .map((tx) => {
      const lower = `${tx.category} ${tx.description || ""}`.toLowerCase();
      const isLate = Array.from(lateBillSet).some((b) => lower.includes(b));
      const amountAbs = Math.abs(Number(tx.amount || 0));
      return {
        ...tx,
        uiStatus: isLate ? "late" : "paid",
        amountConverted: moneyValue(amountAbs, currency)
      };
    })
    .filter((tx) => (statusFilter === "all" ? true : tx.uiStatus === statusFilter));

  const incomePeriod = txRows.reduce((sum, tx) => sum + (tx.type === "income" ? Number(tx.amount || 0) : 0), 0);
  const expensePeriod = txRows.reduce((sum, tx) => sum + (tx.type === "expense" ? Number(tx.amount || 0) : 0), 0);
  const savingsPeriod = incomePeriod - expensePeriod;

  const assetsTotal = assets.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const debtsOpenTotal = debts.reduce((sum, row) => sum + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)), 0);
  const netWorth = assetsTotal - debtsOpenTotal + savingsPeriod;

  const annualIncomeByMonth = new Array<number>(12).fill(0);
  const annualExpenseByMonth = new Array<number>(12).fill(0);
  for (const row of allTxRows) {
    const rawDate = normalizeDate(row.transaction_date);
    if (!rawDate) continue;
    const year = Number(rawDate.slice(0, 4));
    const monthIdx = Number(rawDate.slice(5, 7)) - 1;
    if (year !== selectedYear || monthIdx < 0 || monthIdx > 11) continue;
    const amount = Number(row.amount || 0);
    if (row.type === "income") annualIncomeByMonth[monthIdx] += amount;
    else annualExpenseByMonth[monthIdx] += amount;
  }
  const annualSavingsByMonth = annualIncomeByMonth.map((inc, i) => inc - annualExpenseByMonth[i]);
  const annualIncomeTotal = annualIncomeByMonth.reduce((a, b) => a + b, 0);
  const annualExpenseTotal = annualExpenseByMonth.reduce((a, b) => a + b, 0);
  const annualSavingsTotal = annualSavingsByMonth.reduce((a, b) => a + b, 0);

  const maxIncome = Math.max(1, ...annualIncomeByMonth);
  const maxExpense = Math.max(1, ...annualExpenseByMonth);
  const maxCategory = Math.max(1, ...categorySummary.map((row) => Number(row.total || 0)));
  const categoryTotal = categorySummary.reduce((sum, row) => sum + Number(row.total || 0), 0) || 1;
  const incomeShare = incomePeriod + expensePeriod > 0 ? incomePeriod / (incomePeriod + expensePeriod) : 0;
  const savingsRate = incomePeriod > 0 ? savingsPeriod / incomePeriod : 0;
  const debtLoad = assetsTotal > 0 ? debtsOpenTotal / assetsTotal : 0;
  const expenseLoad = annualIncomeTotal + annualExpenseTotal > 0 ? annualExpenseTotal / (annualIncomeTotal + annualExpenseTotal) : 0;
  const topCategoryRows = categorySummary.slice(0, 5).map((row) => {
    const total = Number(row.total || 0);
    const ratio = categoryTotal > 0 ? total / categoryTotal : 0;
    return { category: row.category, total, ratio };
  });

  const overviewRows: RowModel[] = [
    [toCellModel("Planqly Assets - Financial Dashboard", "DashTitle", "String", 11)],
    [],
    [
      toCellModel(t.generatedAt, "DashMetaLabel"),
      toCellModel(new Date().toISOString().slice(0, 19).replace("T", " "), "DashMetaValue", "String", 1),
      toCellModel(t.period, "DashMetaLabel"),
      toCellModel(`${effectiveFrom} to ${effectiveTo}`, "DashMetaValue", "String", 1),
      toCellModel(t.currency, "DashMetaLabel"),
      toCellModel(currency, "DashMetaValue", "String", 1),
      toCellModel("Filters", "DashMetaLabel"),
      toCellModel(`${typeFilter}/${statusFilter}`, "DashMetaValue", "String", 1)
    ],
    [],
    [toCellModel("Performance Snapshot", "DashSection", "String", 11)],
    [
      toCellModel(t.incomePeriod, "CardIncomeLabel", "String", 2),
      toCellModel(t.expensePeriod, "CardExpenseLabel", "String", 2),
      toCellModel(t.savingsPeriod, "CardSavingsLabel", "String", 2),
      toCellModel(t.netWorth, "CardNetLabel", "String", 2)
    ],
    [
      toCellModel(moneyValue(incomePeriod, currency), "CardIncomeValue", "Number", 2),
      toCellModel(moneyValue(expensePeriod, currency), "CardExpenseValue", "Number", 2),
      toCellModel(moneyValue(savingsPeriod, currency), "CardSavingsValue", "Number", 2),
      toCellModel(moneyValue(netWorth, currency), "CardNetValue", "Number", 2)
    ],
    [
      toCellModel(t.assetsTotal, "CardAltLabel", "String", 2),
      toCellModel(t.openDebtTotal, "CardAltLabel", "String", 2),
      toCellModel(`${t.income} (${selectedYear})`, "CardAltLabel", "String", 2),
      toCellModel(`${t.expense} (${selectedYear})`, "CardAltLabel", "String", 2)
    ],
    [
      toCellModel(moneyValue(assetsTotal, currency), "CardAltValue", "Number", 2),
      toCellModel(moneyValue(debtsOpenTotal, currency), "CardAltValue", "Number", 2),
      toCellModel(moneyValue(annualIncomeTotal, currency), "CardAltValue", "Number", 2),
      toCellModel(moneyValue(annualExpenseTotal, currency), "CardAltValue", "Number", 2)
    ],
    [],
    [toCellModel("Visual Analytics", "DashSection", "String", 11)],
    [
      toCellModel("Income vs Expense", "VisualHeader", "String", 2),
      toCellModel("Savings Rate", "VisualHeader", "String", 2),
      toCellModel("Debt Load", "VisualHeader", "String", 2),
      toCellModel("Expense Intensity", "VisualHeader", "String", 2)
    ],
    [
      toCellModel(circleGauge(incomeShare), "VisualCell", "String", 2),
      toCellModel(circleGauge(savingsRate), "VisualCell", "String", 2),
      toCellModel(circleGauge(debtLoad), "VisualCell", "String", 2),
      toCellModel(circleGauge(expenseLoad), "VisualCell", "String", 2)
    ],
    [],
    [toCellModel("Top Categories", "DashSection", "String", 11)],
    [
      toCellModel(t.category, "VisualHeader"),
      toCellModel(t.amount, "VisualHeader", "String", 1),
      toCellModel(t.periodPercent, "VisualHeader"),
      toCellModel("Bar", "VisualHeader", "String", 7)
    ],
    ...topCategoryRows.map((row) => [
      toCellModel(row.category, "VisualCell"),
      toCellModel(moneyValue(row.total, currency), "VisualCellNumber", "Number", 1),
      toCellModel(row.ratio, "VisualCellPct", "Number"),
      toCellModel(barGauge(row.ratio), "VisualCell", "String", 7)
    ]),
    [],
    [toCellModel("KPI Table", "DashSection", "String", 11)],
    ...tableRows(
      [{ label: t.kpi }, { label: t.value }],
      [
        [{ value: t.incomePeriod }, { value: moneyValue(incomePeriod, currency), kind: "currency" }],
        [{ value: t.expensePeriod }, { value: moneyValue(expensePeriod, currency), kind: "currency" }],
        [{ value: t.savingsPeriod }, { value: moneyValue(savingsPeriod, currency), kind: "currency" }],
        [{ value: t.assetsTotal }, { value: moneyValue(assetsTotal, currency), kind: "currency" }],
        [{ value: t.openDebtTotal }, { value: moneyValue(debtsOpenTotal, currency), kind: "currency" }],
        [{ value: t.netWorth }, { value: moneyValue(netWorth, currency), kind: "currency" }]
      ],
      "dark"
    ),
    [],
    [toCellModel(t.annualSummary, "DashSection", "String", 11)],
    ...tableRows(
      [{ label: t.kpi }, { label: t.value }, { label: t.trend }],
      [
        [
          { value: t.income },
          { value: moneyValue(annualIncomeTotal, currency), kind: "currency" },
          { value: sparkline(annualIncomeByMonth), kind: "text" }
        ],
        [
          { value: t.expense },
          { value: moneyValue(annualExpenseTotal, currency), kind: "currency" },
          { value: sparkline(annualExpenseByMonth), kind: "text" }
        ],
        [
          { value: t.savings },
          { value: moneyValue(annualSavingsTotal, currency), kind: "currency" },
          { value: sparkline(annualSavingsByMonth.map((v) => Math.max(v, 0))), kind: "text" }
        ]
      ],
      "dark"
    ),
    [],
    [toCellModel(t.monthlyEvolution, "DashSection", "String", 11)],
    ...tableRows(
      [
        { label: t.month },
        { label: t.income },
        { label: t.expense },
        { label: t.savings },
        { label: `${t.income} ${t.trend}` },
        { label: `${t.expense} ${t.trend}` }
      ],
      new Array(12).fill(null).map((_, i) => {
        const income = annualIncomeByMonth[i];
        const expense = annualExpenseByMonth[i];
        const savings = income - expense;
        return [
          { value: `${monthNameByIndex(i, lang)} ${selectedYear}` },
          { value: moneyValue(income, currency), kind: "currency" },
          { value: moneyValue(expense, currency), kind: "currency" },
          { value: moneyValue(savings, currency), kind: "currency" },
          { value: barText(income, maxIncome) },
          { value: barText(expense, maxExpense) }
        ];
      }),
      "dark"
    ),
    [],
    [toCellModel(t.categoryBreakdown, "DashSection", "String", 11)],
    ...tableRows(
      [
        { label: t.category },
        { label: t.amount },
        { label: t.periodPercent },
        { label: t.trend }
      ],
      categorySummary.map((row) => {
        const total = Number(row.total || 0);
        const ratio = total / categoryTotal;
        return [
          { value: row.category },
          { value: moneyValue(total, currency), kind: "currency" },
          { value: ratio, kind: "percent" },
          { value: barText(total, maxCategory) }
        ];
      }),
      "dark"
    )
  ];

  const monthlyChartRows = tableRows(
    [
      { label: t.month },
      { label: t.income },
      { label: t.expense },
      { label: t.savings }
    ],
    new Array(12).fill(null).map((_, i) => [
      { value: `${monthNameByIndex(i, lang)} ${selectedYear}` },
      { value: moneyValue(annualIncomeByMonth[i], currency), kind: "currency" },
      { value: moneyValue(annualExpenseByMonth[i], currency), kind: "currency" },
      { value: moneyValue(annualSavingsByMonth[i], currency), kind: "currency" }
    ])
  );

  const categoryChartRows = tableRows(
    [
      { label: t.category },
      { label: t.amount },
      { label: t.periodPercent }
    ],
    categorySummary.map((row) => {
      const total = Number(row.total || 0);
      return [
        { value: row.category },
        { value: moneyValue(total, currency), kind: "currency" },
        { value: total / categoryTotal, kind: "percent" }
      ];
    })
  );

  const movementsRows = tableRows(
    [
      { label: t.month },
      { label: t.type },
      { label: t.category },
      { label: t.detail },
      { label: t.amount },
      { label: t.date },
      { label: t.status }
    ],
    txRows.map((tx) => [
      { value: monthShort(tx.transaction_date, lang) },
      { value: tx.type === "income" ? t.income : t.expense },
      { value: tx.category },
      { value: tx.description || "" },
      { value: tx.amountConverted, kind: "currency" },
      { value: normalizeDate(tx.transaction_date), kind: "date" },
      { value: tx.uiStatus === "late" ? t.late : t.paid }
    ])
  );

  const allTransactionsRows = tableRows(
    [
      { label: "ID" },
      { label: t.date },
      { label: t.type },
      { label: t.category },
      { label: t.detail },
      { label: t.amount }
    ],
    allTxRows.map((tx) => [
      { value: tx.id, kind: "number" },
      { value: normalizeDate(tx.transaction_date), kind: "date" },
      { value: tx.type === "income" ? t.income : t.expense },
      { value: tx.category },
      { value: tx.description || "" },
      { value: moneyValue(Math.abs(Number(tx.amount || 0)), currency), kind: "currency" }
    ])
  );

  const billsRows = tableRows(
    [
      { label: "ID" },
      { label: "Name" },
      { label: t.amount },
      { label: "Frequency" },
      { label: "DueDay" },
      { label: "AutoPay" },
      { label: t.status }
    ],
    bills.map((row) => [
      { value: row.id, kind: "number" },
      { value: row.name },
      { value: moneyValue(Number(row.amount || 0), currency), kind: "currency" },
      { value: formatFrequency(row.frequency, lang) },
      { value: Number(row.due_day), kind: "number" },
      { value: row.auto_pay ? "Yes" : "No" },
      { value: row.status }
    ])
  );

  const subscriptionsRows = tableRows(
    [
      { label: "ID" },
      { label: "Service" },
      { label: "Cost" },
      { label: "Cycle" },
      { label: t.category },
      { label: "RenewalDate" },
      { label: t.status }
    ],
    subscriptions.map((row) => [
      { value: row.id, kind: "number" },
      { value: row.service },
      { value: moneyValue(Number(row.cost || 0), currency), kind: "currency" },
      { value: row.billing_cycle },
      { value: row.category },
      { value: normalizeDate(row.renewal_date), kind: "date" },
      { value: row.status }
    ])
  );

  const assetsRows = tableRows(
    [
      { label: "ID" },
      { label: "Name" },
      { label: t.type },
      { label: t.value },
      { label: "AsOfDate" }
    ],
    assets.map((row) => [
      { value: row.id, kind: "number" },
      { value: row.name },
      { value: row.asset_type },
      { value: moneyValue(Number(row.value || 0), currency), kind: "currency" },
      { value: normalizeDate(row.as_of_date), kind: "date" }
    ])
  );

  const debtsRows = tableRows(
    [
      { label: "ID" },
      { label: "Name" },
      { label: "TotalOwed" },
      { label: "AmountPaid" },
      { label: "Remaining" },
      { label: "InterestRate" },
      { label: "DueDate" }
    ],
    debts.map((row) => {
      const total = Number(row.total_owed || 0);
      const paid = Number(row.amount_paid || 0);
      return [
        { value: row.id, kind: "number" },
        { value: row.name },
        { value: moneyValue(total, currency), kind: "currency" },
        { value: moneyValue(paid, currency), kind: "currency" },
        { value: moneyValue(Math.max(0, total - paid), currency), kind: "currency" },
        { value: Number(row.interest_rate || 0), kind: "number" },
        { value: normalizeDate(row.due_date), kind: "date" }
      ];
    })
  );

  const budgetsRows = tableRows(
    [
      { label: "ID" },
      { label: t.month },
      { label: t.category },
      { label: "Budget" }
    ],
    budgets.map((row) => [
      { value: row.id, kind: "number" },
      { value: row.budget_month },
      { value: row.category },
      { value: moneyValue(Number(row.budget_amount || 0), currency), kind: "currency" }
    ])
  );

  const goalsRows = tableRows(
    [
      { label: "ID" },
      { label: "Name" },
      { label: "Target" },
      { label: "Saved" },
      { label: "CompletionPct" },
      { label: "Deadline" },
      { label: t.status }
    ],
    goals.map((row) => {
      const completion =
        Number(row.target_amount || 0) > 0 ? Number(row.saved_amount || 0) / Number(row.target_amount || 0) : 0;
      return [
        { value: row.id, kind: "number" },
        { value: row.name },
        { value: moneyValue(Number(row.target_amount || 0), currency), kind: "currency" },
        { value: moneyValue(Number(row.saved_amount || 0), currency), kind: "currency" },
        { value: completion, kind: "percent" },
        { value: normalizeDate(row.deadline), kind: "date" },
        { value: row.status }
      ];
    })
  );

  const sheets: WorksheetModel[] = [
    {
      name: t.overview,
      rows: overviewRows,
      columnWidths: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90],
      hideGridlines: true,
      hideHeadings: true,
      zoom: 130
    },
    {
      name: lang === "pt-PT" ? "DadosGraficoMensal" : "ChartDataMonthly",
      rows: monthlyChartRows,
      columnWidths: [160, 130, 130, 130],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "DadosGraficoCategoria" : "ChartDataCategory",
      rows: categoryChartRows,
      columnWidths: [220, 130, 130],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Movimentos" : "Movements",
      rows: movementsRows,
      columnWidths: [90, 100, 170, 260, 120, 120, 110],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "TodosMovimentos" : "AllTransactions",
      rows: allTransactionsRows,
      columnWidths: [70, 120, 100, 170, 260, 120],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Contas" : "Bills",
      rows: billsRows,
      columnWidths: [70, 190, 120, 120, 90, 90, 100],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Subscricoes" : "Subscriptions",
      rows: subscriptionsRows,
      columnWidths: [70, 190, 120, 100, 160, 120, 110],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Ativos" : "Assets",
      rows: assetsRows,
      columnWidths: [70, 220, 140, 120, 120],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Dividas" : "Debts",
      rows: debtsRows,
      columnWidths: [70, 210, 120, 120, 120, 110, 120],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Orcamentos" : "Budgets",
      rows: budgetsRows,
      columnWidths: [70, 110, 180, 120],
      freezeHeaderRow: true,
      hideGridlines: true
    },
    {
      name: lang === "pt-PT" ? "Objetivos" : "Goals",
      rows: goalsRows,
      columnWidths: [70, 220, 120, 120, 120, 120, 110],
      freezeHeaderRow: true,
      hideGridlines: true
    }
  ];

  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
    <Style ss:ID="DashTitle">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#E2E8F0"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1F2937"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1F2937"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1F2937"/>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1F2937"/>
      </Borders>
    </Style>
    <Style ss:ID="DashMetaLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#CBD5E1"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="DashMetaValue">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#F8FAFC"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="DashSection">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#F8FAFC"/>
      <Interior ss:Color="#374151" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CardIncomeLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#E0F2FE"/>
      <Interior ss:Color="#0369A1" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CardIncomeValue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#F0F9FF"/>
      <Interior ss:Color="#075985" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CardExpenseLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FEE2E2"/>
      <Interior ss:Color="#B91C1C" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CardExpenseValue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FEF2F2"/>
      <Interior ss:Color="#991B1B" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CardSavingsLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#DCFCE7"/>
      <Interior ss:Color="#15803D" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CardSavingsValue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#F0FDF4"/>
      <Interior ss:Color="#166534" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CardNetLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#EDE9FE"/>
      <Interior ss:Color="#6D28D9" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CardNetValue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#F5F3FF"/>
      <Interior ss:Color="#5B21B6" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CardAltLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#D1D5DB"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CardAltValue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#F9FAFB"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="VisualHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#E2E8F0"/>
      <Interior ss:Color="#334155" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="VisualCell">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#F8FAFC"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="VisualCellNumber">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#F8FAFC"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="VisualCellPct">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#F8FAFC"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00%"/>
    </Style>
    <Style ss:ID="DarkTableHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#F9FAFB"/>
      <Interior ss:Color="#334155" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="DarkCellTextEven">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="DarkCellTextOdd">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="DarkCellNumberEven">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="DarkCellNumberOdd">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="DarkCellCurrencyEven">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="DarkCellCurrencyOdd">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="DarkCellPercentEven">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00%"/>
    </Style>
    <Style ss:ID="DarkCellPercentOdd">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00%"/>
    </Style>
    <Style ss:ID="DarkCellDateEven">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="yyyy-mm-dd"/>
    </Style>
    <Style ss:ID="DarkCellDateOdd">
      <Font ss:Color="#F8FAFC"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="yyyy-mm-dd"/>
    </Style>
    <Style ss:ID="TableHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CellTextEven">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CellTextOdd">
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CellNumberEven">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CellNumberOdd">
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CellCurrencyEven">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CellCurrencyOdd">
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="CellPercentEven">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00%"/>
    </Style>
    <Style ss:ID="CellPercentOdd">
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00%"/>
    </Style>
    <Style ss:ID="CellDateEven">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="yyyy-mm-dd"/>
    </Style>
    <Style ss:ID="CellDateOdd">
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="yyyy-mm-dd"/>
    </Style>
  </Styles>
  ${sheets.map((sheet) => xmlWorksheet(sheet)).join("")}
</Workbook>`;

  const fileName = `${t.filePrefix}-${selectedMonth}.xml`;
  return new NextResponse(workbookXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
