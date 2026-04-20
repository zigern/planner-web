import { NextResponse } from "next/server";
import type { Pool } from "mysql2/promise";
import ExcelJS from "exceljs";
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

  const categoryTotal = categorySummary.reduce((sum, row) => sum + Number(row.total || 0), 0) || 1;
  const topCategories = categorySummary
    .slice(0, 5)
    .map((row) => ({ category: row.category, total: Number(row.total || 0) }))
    .filter((row) => row.total > 0);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Planqly";
  workbook.created = new Date();

  const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1E3A8A" } };
  const darkFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0F172A" } };
  const subDarkFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1F2937" } };
  const whiteFont = { color: { argb: "FFFFFFFF" }, bold: true };

  const overview = workbook.addWorksheet(t.overview, {
    views: [{ showGridLines: false, showRowColHeaders: false, zoomScale: 125 }]
  });
  overview.columns = new Array(12).fill(null).map(() => ({ width: 14 }));

  overview.mergeCells("A1:L1");
  overview.getCell("A1").value = "Planqly Assets - Financial Dashboard";
  overview.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  overview.getCell("A1").font = { size: 18, bold: true, color: { argb: "FFE2E8F0" } };
  overview.getCell("A1").fill = darkFill;

  overview.getRow(3).values = [t.generatedAt, new Date().toISOString().slice(0, 19).replace("T", " "), t.period, `${effectiveFrom} to ${effectiveTo}`, t.currency, currency, "Filters", `${typeFilter}/${statusFilter}`];
  for (const addr of ["A3", "C3", "E3", "G3"]) {
    overview.getCell(addr).fill = subDarkFill;
    overview.getCell(addr).font = { color: { argb: "FFCBD5E1" }, bold: true };
  }
  for (const addr of ["B3", "D3", "F3", "H3"]) {
    overview.getCell(addr).fill = darkFill;
    overview.getCell(addr).font = { color: { argb: "FFF8FAFC" } };
  }

  overview.mergeCells("A5:L5");
  overview.getCell("A5").value = "Performance Snapshot";
  overview.getCell("A5").fill = subDarkFill;
  overview.getCell("A5").font = { color: { argb: "FFFFFFFF" }, bold: true, size: 12 };

  const cards = [
    { label: t.incomePeriod, value: moneyValue(incomePeriod, currency), range: "A6:C7", color: "FF0EA5E9" },
    { label: t.expensePeriod, value: moneyValue(expensePeriod, currency), range: "D6:F7", color: "FFEF4444" },
    { label: t.savingsPeriod, value: moneyValue(savingsPeriod, currency), range: "G6:I7", color: "FF22C55E" },
    { label: t.netWorth, value: moneyValue(netWorth, currency), range: "J6:L7", color: "FF8B5CF6" }
  ];
  for (const card of cards) {
    overview.mergeCells(card.range);
    const [start] = card.range.split(":");
    overview.getCell(start).value = `${card.label}\n${card.value.toLocaleString()}`;
    overview.getCell(start).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    overview.getCell(start).font = { color: { argb: "FFFFFFFF" }, bold: true, size: 13 };
    overview.getCell(start).fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.color } };
  }

  overview.mergeCells("A9:L9");
  overview.getCell("A9").value = "Visual Analytics (Excel formulas)";
  overview.getCell("A9").fill = subDarkFill;
  overview.getCell("A9").font = { color: { argb: "FFFFFFFF" }, bold: true };

  overview.getRow(10).values = ["Income Share", "Savings Rate", "Debt Load", "Expense Intensity"];
  for (const c of ["A10", "B10", "C10", "D10"]) {
    overview.getCell(c).fill = darkFill;
    overview.getCell(c).font = whiteFont;
  }

  overview.getCell("J40").value = moneyValue(incomePeriod, currency);
  overview.getCell("K40").value = moneyValue(expensePeriod, currency);
  overview.getCell("L40").value = moneyValue(savingsPeriod, currency);
  overview.getCell("M40").value = moneyValue(netWorth, currency);
  overview.getCell("J41").value = moneyValue(assetsTotal, currency);
  overview.getCell("K41").value = moneyValue(debtsOpenTotal, currency);
  overview.getCell("L41").value = moneyValue(annualIncomeTotal, currency);
  overview.getCell("M41").value = moneyValue(annualExpenseTotal, currency);

  overview.getCell("A11").value = { formula: "IFERROR(J40/(J40+K40),0)" };
  overview.getCell("B11").value = { formula: "IFERROR(L40/J40,0)" };
  overview.getCell("C11").value = { formula: "IFERROR(K41/J41,0)" };
  overview.getCell("D11").value = { formula: "IFERROR(M41/(L41+M41),0)" };
  for (const c of ["A11", "B11", "C11", "D11"]) {
    overview.getCell(c).numFmt = "0.00%";
    overview.getCell(c).fill = subDarkFill;
    overview.getCell(c).font = { color: { argb: "FFF8FAFC" }, bold: true };
  }

  overview.getCell("A12").value = { formula: 'REPT("█",ROUND(A11*20,0))' };
  overview.getCell("B12").value = { formula: 'REPT("█",ROUND(B11*20,0))' };
  overview.getCell("C12").value = { formula: 'REPT("█",ROUND(C11*20,0))' };
  overview.getCell("D12").value = { formula: 'REPT("█",ROUND(D11*20,0))' };
  for (const c of ["A12", "B12", "C12", "D12"]) {
    overview.getCell(c).fill = darkFill;
    overview.getCell(c).font = { color: { argb: "FF93C5FD" }, bold: true };
  }

  overview.mergeCells("F9:L9");
  overview.getCell("F9").value = t.categoryBreakdown;
  overview.getCell("F9").fill = subDarkFill;
  overview.getCell("F9").font = { color: { argb: "FFFFFFFF" }, bold: true };

  overview.getRow(10).getCell(6).value = t.category;
  overview.getRow(10).getCell(7).value = t.amount;
  overview.getRow(10).getCell(8).value = t.periodPercent;
  overview.getRow(10).getCell(9).value = t.trend;
  for (const c of ["F10", "G10", "H10", "I10"]) {
    overview.getCell(c).fill = darkFill;
    overview.getCell(c).font = whiteFont;
  }

  topCategories.forEach((row, idx) => {
    const excelRow = 11 + idx;
    overview.getCell(`F${excelRow}`).value = row.category;
    overview.getCell(`G${excelRow}`).value = moneyValue(row.total, currency);
    overview.getCell(`H${excelRow}`).value = categoryTotal > 0 ? row.total / categoryTotal : 0;
    overview.getCell(`I${excelRow}`).value = {
      formula: `REPT("█",ROUND(H${excelRow}*30,0))`
    };
    overview.getCell(`G${excelRow}`).numFmt = "#,##0.00";
    overview.getCell(`H${excelRow}`).numFmt = "0.00%";
    for (const c of [`F${excelRow}`, `G${excelRow}`, `H${excelRow}`, `I${excelRow}`]) {
      overview.getCell(c).fill = darkFill;
      overview.getCell(c).font = { color: { argb: "FFF8FAFC" } };
    }
  });

  overview.getRow(13).values = [t.assetsTotal, moneyValue(assetsTotal, currency), t.openDebtTotal, moneyValue(debtsOpenTotal, currency)];
  overview.getRow(15).values = [t.income, moneyValue(annualIncomeTotal, currency), t.expense, moneyValue(annualExpenseTotal, currency)];
  for (const r of [13, 15]) {
    for (const c of [1, 2, 3, 4]) {
      const cell = overview.getRow(r).getCell(c);
      cell.fill = darkFill;
      cell.font = { color: { argb: "FFE2E8F0" }, bold: c % 2 === 1 };
      if (c % 2 === 0) cell.numFmt = "#,##0.00";
    }
  }

  overview.mergeCells("A17:L17");
  overview.getCell("A17").value = "Monthly Evolution";
  overview.getCell("A17").fill = subDarkFill;
  overview.getCell("A17").font = { color: { argb: "FFFFFFFF" }, bold: true };
  overview.getRow(18).values = [t.month, t.income, t.expense, t.savings, `${t.income} ${t.trend}`, `${t.expense} ${t.trend}`];
  for (const c of ["A18", "B18", "C18", "D18", "E18", "F18"]) {
    overview.getCell(c).fill = headerFill;
    overview.getCell(c).font = whiteFont;
  }
  for (let i = 0; i < 12; i += 1) {
    const r = 19 + i;
    overview.getRow(r).values = [
      `${monthNameByIndex(i, lang)} ${selectedYear}`,
      moneyValue(annualIncomeByMonth[i], currency),
      moneyValue(annualExpenseByMonth[i], currency),
      moneyValue(annualSavingsByMonth[i], currency)
    ];
    overview.getCell(`E${r}`).value = { formula: `REPT("█",ROUND(B${r}/MAX($B$19:$B$30)*24,0))` };
    overview.getCell(`F${r}`).value = { formula: `REPT("█",ROUND(C${r}/MAX($C$19:$C$30)*24,0))` };
    for (const col of [2, 3, 4]) overview.getRow(r).getCell(col).numFmt = "#,##0.00";
    overview.getCell(`E${r}`).font = { color: { argb: "FF60A5FA" }, bold: true };
    overview.getCell(`F${r}`).font = { color: { argb: "FFF472B6" }, bold: true };
  }

  const chartMonthly = workbook.addWorksheet(lang === "pt-PT" ? "DadosGraficoMensal" : "ChartDataMonthly");
  chartMonthly.columns = [{ width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }];
  chartMonthly.addRow([t.month, t.income, t.expense, t.savings]);
  for (let i = 0; i < 12; i += 1) {
    chartMonthly.addRow([
      `${monthNameByIndex(i, lang)} ${selectedYear}`,
      moneyValue(annualIncomeByMonth[i], currency),
      moneyValue(annualExpenseByMonth[i], currency),
      moneyValue(annualSavingsByMonth[i], currency)
    ]);
  }

  const chartCategory = workbook.addWorksheet(lang === "pt-PT" ? "DadosGraficoCategoria" : "ChartDataCategory");
  chartCategory.columns = [{ width: 28 }, { width: 14 }, { width: 12 }];
  chartCategory.addRow([t.category, t.amount, t.periodPercent]);
  for (const row of categorySummary) {
    const total = Number(row.total || 0);
    chartCategory.addRow([row.category, moneyValue(total, currency), categoryTotal > 0 ? total / categoryTotal : 0]);
  }

  const addSimpleSheet = (name: string, headers: string[], rows: unknown[][]) => {
    const ws = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, Math.min(36, h.length + 6)) }));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = headerFill;
    for (const row of rows) ws.addRow(row);
    return ws;
  };

  addSimpleSheet(
    lang === "pt-PT" ? "Movimentos" : "Movements",
    [t.month, t.type, t.category, t.detail, t.amount, t.date, t.status],
    txRows.map((tx) => [
      monthShort(tx.transaction_date, lang),
      tx.type === "income" ? t.income : t.expense,
      tx.category,
      tx.description || "",
      moneyValue(Math.abs(Number(tx.amount || 0)), currency),
      normalizeDate(tx.transaction_date),
      tx.uiStatus === "late" ? t.late : t.paid
    ])
  );

  addSimpleSheet(
    lang === "pt-PT" ? "TodosMovimentos" : "AllTransactions",
    ["ID", t.date, t.type, t.category, t.detail, t.amount],
    allTxRows.map((tx) => [
      tx.id,
      normalizeDate(tx.transaction_date),
      tx.type === "income" ? t.income : t.expense,
      tx.category,
      tx.description || "",
      moneyValue(Math.abs(Number(tx.amount || 0)), currency)
    ])
  );

  addSimpleSheet(
    lang === "pt-PT" ? "Contas" : "Bills",
    ["ID", "Name", t.amount, "Frequency", "DueDay", "AutoPay", t.status],
    bills.map((row) => [row.id, row.name, moneyValue(Number(row.amount || 0), currency), formatFrequency(row.frequency, lang), row.due_day, row.auto_pay ? "Yes" : "No", row.status])
  );

  addSimpleSheet(
    lang === "pt-PT" ? "Subscricoes" : "Subscriptions",
    ["ID", "Service", "Cost", "Cycle", t.category, "RenewalDate", t.status],
    subscriptions.map((row) => [row.id, row.service, moneyValue(Number(row.cost || 0), currency), row.billing_cycle, row.category, normalizeDate(row.renewal_date), row.status])
  );

  addSimpleSheet(
    lang === "pt-PT" ? "Ativos" : "Assets",
    ["ID", "Name", t.type, t.value, "AsOfDate"],
    assets.map((row) => [row.id, row.name, row.asset_type, moneyValue(Number(row.value || 0), currency), normalizeDate(row.as_of_date)])
  );

  addSimpleSheet(
    lang === "pt-PT" ? "Dividas" : "Debts",
    ["ID", "Name", "TotalOwed", "AmountPaid", "Remaining", "InterestRate", "DueDate"],
    debts.map((row) => {
      const total = Number(row.total_owed || 0);
      const paid = Number(row.amount_paid || 0);
      return [row.id, row.name, moneyValue(total, currency), moneyValue(paid, currency), moneyValue(Math.max(0, total - paid), currency), Number(row.interest_rate || 0), normalizeDate(row.due_date)];
    })
  );

  addSimpleSheet(
    lang === "pt-PT" ? "Orcamentos" : "Budgets",
    ["ID", t.month, t.category, "Budget"],
    budgets.map((row) => [row.id, row.budget_month, row.category, moneyValue(Number(row.budget_amount || 0), currency)])
  );

  addSimpleSheet(
    lang === "pt-PT" ? "Objetivos" : "Goals",
    ["ID", "Name", "Target", "Saved", "CompletionPct", "Deadline", t.status],
    goals.map((row) => [
      row.id,
      row.name,
      moneyValue(Number(row.target_amount || 0), currency),
      moneyValue(Number(row.saved_amount || 0), currency),
      Number(row.target_amount || 0) > 0 ? Number(row.saved_amount || 0) / Number(row.target_amount || 0) : 0,
      normalizeDate(row.deadline),
      row.status
    ])
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const output = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const fileName = `${t.filePrefix}-${selectedMonth}.xlsx`;
  return new NextResponse(output, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
