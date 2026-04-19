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

function xmlCell(value: unknown, header = false) {
  const style = header ? ` ss:StyleID="Header"` : "";
  if (isNumericLike(value)) {
    return `<Cell${style}><Data ss:Type="Number">${Number(value)}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function xmlRow(cells: unknown[], header = false) {
  return `<Row>${cells.map((cell) => xmlCell(cell, header)).join("")}</Row>`;
}

function xmlWorksheet(name: string, rows: unknown[][]) {
  return `<Worksheet ss:Name="${escapeXml(name).slice(0, 31)}"><Table>${rows
    .map((row, idx) => xmlRow(row, idx === 0))
    .join("")}</Table></Worksheet>`;
}

function rowsFromObjects(rows: Array<Record<string, unknown>>, columns: string[]) {
  const out: unknown[][] = [columns];
  for (const row of rows) {
    out.push(columns.map((column) => row[column] ?? ""));
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

  const txExportRows = txRows.map((tx) => ({
    [t.month]: monthShort(tx.transaction_date, lang),
    [t.type]: tx.type === "income" ? t.income : t.expense,
    [t.category]: tx.category,
    [t.detail]: tx.description || "",
    [t.amount]: tx.amountConverted,
    [t.date]: normalizeDate(tx.transaction_date),
    [t.status]: tx.uiStatus === "late" ? t.late : t.paid
  }));

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

  const summarySheetRows: unknown[][] = [
    ["Planqly Assets - Excel Premium Export"],
    [t.generatedAt, new Date().toISOString()],
    [t.period, `${effectiveFrom} to ${effectiveTo}`],
    [t.currency, currency],
    [],
    [t.kpi, t.value],
    [t.incomePeriod, moneyValue(incomePeriod, currency)],
    [t.expensePeriod, moneyValue(expensePeriod, currency)],
    [t.savingsPeriod, moneyValue(savingsPeriod, currency)],
    [t.assetsTotal, moneyValue(assetsTotal, currency)],
    [t.openDebtTotal, moneyValue(debtsOpenTotal, currency)],
    [t.netWorth, moneyValue(netWorth, currency)],
    [],
    [t.annualSummary],
    [t.income, moneyValue(annualIncomeTotal, currency), sparkline(annualIncomeByMonth)],
    [t.expense, moneyValue(annualExpenseTotal, currency), sparkline(annualExpenseByMonth)],
    [t.savings, moneyValue(annualSavingsTotal, currency), sparkline(annualSavingsByMonth.map((v) => Math.max(v, 0)))],
    [],
    [t.monthlyEvolution],
    [t.month, t.income, t.expense, t.savings, `${t.income} ${t.trend}`, `${t.expense} ${t.trend}`]
  ];

  for (let i = 0; i < 12; i += 1) {
    const income = annualIncomeByMonth[i];
    const expense = annualExpenseByMonth[i];
    summarySheetRows.push([
      `${monthNameByIndex(i, lang)} ${selectedYear}`,
      moneyValue(income, currency),
      moneyValue(expense, currency),
      moneyValue(income - expense, currency),
      barText(income, maxIncome),
      barText(expense, maxExpense)
    ]);
  }

  summarySheetRows.push([], [t.categoryBreakdown], [t.category, t.amount, t.periodPercent, t.trend]);
  for (const row of categorySummary) {
    const total = Number(row.total || 0);
    const pct = Math.round((total / categoryTotal) * 100);
    summarySheetRows.push([row.category, moneyValue(total, currency), pct, barText(total, maxCategory)]);
  }

  const monthlyChartRows: unknown[][] = [[t.month, t.income, t.expense, t.savings]];
  for (let i = 0; i < 12; i += 1) {
    monthlyChartRows.push([
      `${monthNameByIndex(i, lang)} ${selectedYear}`,
      moneyValue(annualIncomeByMonth[i], currency),
      moneyValue(annualExpenseByMonth[i], currency),
      moneyValue(annualSavingsByMonth[i], currency)
    ]);
  }

  const categoryChartRows: unknown[][] = [[t.category, t.amount, t.periodPercent]];
  for (const row of categorySummary) {
    const total = Number(row.total || 0);
    const pct = Math.round((total / categoryTotal) * 100);
    categoryChartRows.push([row.category, moneyValue(total, currency), pct]);
  }

  const sheets = [
    xmlWorksheet(t.overview, summarySheetRows),
    xmlWorksheet(lang === "pt-PT" ? "DadosGraficoMensal" : "ChartDataMonthly", monthlyChartRows),
    xmlWorksheet(lang === "pt-PT" ? "DadosGraficoCategoria" : "ChartDataCategory", categoryChartRows),
    xmlWorksheet(lang === "pt-PT" ? "Movimentos" : "Movements", rowsFromObjects(txExportRows, [t.month, t.type, t.category, t.detail, t.amount, t.date, t.status])),
    xmlWorksheet(
      lang === "pt-PT" ? "TodosMovimentos" : "AllTransactions",
      rowsFromObjects(
        allTxRows.map((tx) => ({
          ID: tx.id,
          [t.date]: normalizeDate(tx.transaction_date),
          [t.type]: tx.type === "income" ? t.income : t.expense,
          [t.category]: tx.category,
          [t.detail]: tx.description || "",
          [t.amount]: moneyValue(Math.abs(Number(tx.amount || 0)), currency)
        })),
        ["ID", t.date, t.type, t.category, t.detail, t.amount]
      )
    ),
    xmlWorksheet(
      lang === "pt-PT" ? "Contas" : "Bills",
      rowsFromObjects(
        bills.map((row) => ({
          ID: row.id,
          Name: row.name,
          [t.amount]: moneyValue(Number(row.amount || 0), currency),
          Frequency: formatFrequency(row.frequency, lang),
          DueDay: Number(row.due_day),
          AutoPay: row.auto_pay ? "Yes" : "No",
          [t.status]: row.status
        })),
        ["ID", "Name", t.amount, "Frequency", "DueDay", "AutoPay", t.status]
      )
    ),
    xmlWorksheet(
      lang === "pt-PT" ? "Subscricoes" : "Subscriptions",
      rowsFromObjects(
        subscriptions.map((row) => ({
          ID: row.id,
          Service: row.service,
          Cost: moneyValue(Number(row.cost || 0), currency),
          Cycle: row.billing_cycle,
          [t.category]: row.category,
          RenewalDate: normalizeDate(row.renewal_date),
          [t.status]: row.status
        })),
        ["ID", "Service", "Cost", "Cycle", t.category, "RenewalDate", t.status]
      )
    ),
    xmlWorksheet(
      lang === "pt-PT" ? "Ativos" : "Assets",
      rowsFromObjects(
        assets.map((row) => ({
          ID: row.id,
          Name: row.name,
          [t.type]: row.asset_type,
          [t.value]: moneyValue(Number(row.value || 0), currency),
          AsOfDate: normalizeDate(row.as_of_date)
        })),
        ["ID", "Name", t.type, t.value, "AsOfDate"]
      )
    ),
    xmlWorksheet(
      lang === "pt-PT" ? "Dividas" : "Debts",
      rowsFromObjects(
        debts.map((row) => {
          const total = Number(row.total_owed || 0);
          const paid = Number(row.amount_paid || 0);
          return {
            ID: row.id,
            Name: row.name,
            TotalOwed: moneyValue(total, currency),
            AmountPaid: moneyValue(paid, currency),
            Remaining: moneyValue(Math.max(0, total - paid), currency),
            InterestRate: Number(row.interest_rate || 0),
            DueDate: normalizeDate(row.due_date)
          };
        }),
        ["ID", "Name", "TotalOwed", "AmountPaid", "Remaining", "InterestRate", "DueDate"]
      )
    ),
    xmlWorksheet(
      lang === "pt-PT" ? "Orcamentos" : "Budgets",
      rowsFromObjects(
        budgets.map((row) => ({
          ID: row.id,
          [t.month]: row.budget_month,
          [t.category]: row.category,
          Budget: moneyValue(Number(row.budget_amount || 0), currency)
        })),
        ["ID", t.month, t.category, "Budget"]
      )
    ),
    xmlWorksheet(
      lang === "pt-PT" ? "Objetivos" : "Goals",
      rowsFromObjects(
        goals.map((row) => ({
          ID: row.id,
          Name: row.name,
          Target: moneyValue(Number(row.target_amount || 0), currency),
          Saved: moneyValue(Number(row.saved_amount || 0), currency),
          CompletionPct:
            Number(row.target_amount || 0) > 0
              ? Math.round((Number(row.saved_amount || 0) / Number(row.target_amount || 0)) * 100)
              : 0,
          Deadline: normalizeDate(row.deadline),
          [t.status]: row.status
        })),
        ["ID", "Name", "Target", "Saved", "CompletionPct", "Deadline", t.status]
      )
    )
  ];

  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Bottom" ss:WrapText="1"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#EAF0FF" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  ${sheets.join("")}
</Workbook>`;

  const fileName = `${t.filePrefix}-${selectedMonth}.xls`;
  return new NextResponse(workbookXml, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
