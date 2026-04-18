import { NextResponse } from "next/server";
import type { Pool } from "mysql2/promise";
import * as XLSX from "xlsx";
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

type MonthSummaryRow = {
  month: string;
  income: string;
  expense: string;
};

type CategorySummaryRow = {
  category: string;
  total: string;
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

function monthLabel(monthIso: string, lang: string) {
  const [year, month] = monthIso.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(lang, { month: "short", year: "numeric" });
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

function sheetFromRows(rows: Array<Record<string, unknown>>, columns: string[]) {
  const aoa: unknown[][] = [columns];
  for (const row of rows) {
    aoa.push(columns.map((column) => row[column] ?? ""));
  }
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!autofilter"] = { ref: `A1:${String.fromCharCode(64 + columns.length)}1` };
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 } as unknown as XLSX.SheetProperties;
  return sheet;
}

function setColumns(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

function barText(value: number, max: number) {
  if (max <= 0 || value <= 0) return "";
  const count = Math.max(1, Math.round((value / max) * 20));
  return "█".repeat(count);
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const selectedMonth = parseMonthParam(url.searchParams.get("month"));
  const lang = parseLangParam(url.searchParams.get("lang"));
  const currency = parseCurrencyParam(url.searchParams.get("currency"));
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

  const txRows = await safeQueryRows<TxRow>(
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

  const monthSummary = await safeQueryRows<MonthSummaryRow>(
    db,
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY month ASC
     LIMIT 24`,
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

  const txExportRows = txRows.map((tx) => {
    const lower = `${tx.category} ${tx.description || ""}`.toLowerCase();
    const isLate = Array.from(lateBillSet).some((b) => lower.includes(b));
    const amountAbs = Math.abs(Number(tx.amount || 0));
    const converted = moneyValue(amountAbs, currency);
    return {
      Month: monthShort(tx.transaction_date, lang),
      Type: tx.type === "income" ? "Income" : "Expense",
      Category: tx.category,
      Detail: tx.description || "",
      Amount: converted,
      Date: normalizeDate(tx.transaction_date),
      Status: isLate ? "Late" : "Paid"
    };
  });

  const incomePeriod = txRows.reduce((sum, tx) => sum + (tx.type === "income" ? Number(tx.amount || 0) : 0), 0);
  const expensePeriod = txRows.reduce((sum, tx) => sum + (tx.type === "expense" ? Number(tx.amount || 0) : 0), 0);
  const savingsPeriod = incomePeriod - expensePeriod;

  const assetsTotal = assets.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const debtsOpenTotal = debts.reduce((sum, row) => sum + Math.max(0, Number(row.total_owed || 0) - Number(row.amount_paid || 0)), 0);
  const netWorth = assetsTotal - debtsOpenTotal + savingsPeriod;

  const maxIncome = Math.max(1, ...monthSummary.map((row) => Number(row.income || 0)));
  const maxExpense = Math.max(1, ...monthSummary.map((row) => Number(row.expense || 0)));
  const maxCategory = Math.max(1, ...categorySummary.map((row) => Number(row.total || 0)));

  const summarySheetRows: unknown[][] = [
    ["Planqly Assets - Export"],
    ["Generated at", new Date().toISOString()],
    ["Period", `${effectiveFrom} to ${effectiveTo}`],
    ["Currency", currency],
    [],
    ["KPI", "Value"],
    ["Income (period)", moneyValue(incomePeriod, currency)],
    ["Expense (period)", moneyValue(expensePeriod, currency)],
    ["Savings (period)", moneyValue(savingsPeriod, currency)],
    ["Assets total", moneyValue(assetsTotal, currency)],
    ["Open debt total", moneyValue(debtsOpenTotal, currency)],
    ["Net worth (snapshot)", moneyValue(netWorth, currency)],
    [],
    ["Monthly trend"],
    ["Month", "Income", "Expense", "Savings", "Income graph", "Expense graph"]
  ];

  for (const row of monthSummary) {
    const income = Number(row.income || 0);
    const expense = Number(row.expense || 0);
    summarySheetRows.push([
      monthLabel(row.month, lang),
      moneyValue(income, currency),
      moneyValue(expense, currency),
      moneyValue(income - expense, currency),
      barText(income, maxIncome),
      barText(expense, maxExpense)
    ]);
  }

  summarySheetRows.push([], ["Expense categories (period)"], ["Category", "Amount", "%", "Graph"]);
  const categoryTotal = categorySummary.reduce((sum, row) => sum + Number(row.total || 0), 0) || 1;
  for (const row of categorySummary) {
    const total = Number(row.total || 0);
    const pct = Math.round((total / categoryTotal) * 100);
    summarySheetRows.push([row.category, moneyValue(total, currency), pct, barText(total, maxCategory)]);
  }

  const workbook = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
  setColumns(wsSummary, [22, 18, 18, 18, 28, 28]);
  XLSX.utils.book_append_sheet(workbook, wsSummary, lang === "pt-PT" ? "Resumo" : "Summary");

  const wsMov = sheetFromRows(txExportRows, ["Month", "Type", "Category", "Detail", "Amount", "Date", "Status"]);
  setColumns(wsMov, [10, 10, 18, 34, 14, 14, 12]);
  XLSX.utils.book_append_sheet(workbook, wsMov, lang === "pt-PT" ? "Movimentos" : "Movements");

  const wsAllTx = sheetFromRows(
    allTxRows.map((tx) => ({
      ID: tx.id,
      Date: normalizeDate(tx.transaction_date),
      Type: tx.type,
      Category: tx.category,
      Detail: tx.description || "",
      Amount: moneyValue(Math.abs(Number(tx.amount || 0)), currency)
    })),
    ["ID", "Date", "Type", "Category", "Detail", "Amount"]
  );
  setColumns(wsAllTx, [8, 14, 12, 18, 36, 14]);
  XLSX.utils.book_append_sheet(workbook, wsAllTx, lang === "pt-PT" ? "TodosMovimentos" : "AllTransactions");

  const wsBills = sheetFromRows(
    bills.map((row) => ({
      ID: row.id,
      Name: row.name,
      Amount: moneyValue(Number(row.amount || 0), currency),
      Frequency: formatFrequency(row.frequency, lang),
      DueDay: Number(row.due_day),
      AutoPay: row.auto_pay ? "Yes" : "No",
      Status: row.status
    })),
    ["ID", "Name", "Amount", "Frequency", "DueDay", "AutoPay", "Status"]
  );
  setColumns(wsBills, [8, 28, 14, 14, 10, 10, 12]);
  XLSX.utils.book_append_sheet(workbook, wsBills, lang === "pt-PT" ? "Contas" : "Bills");

  const wsSubs = sheetFromRows(
    subscriptions.map((row) => ({
      ID: row.id,
      Service: row.service,
      Cost: moneyValue(Number(row.cost || 0), currency),
      Cycle: row.billing_cycle,
      Category: row.category,
      RenewalDate: normalizeDate(row.renewal_date),
      Status: row.status
    })),
    ["ID", "Service", "Cost", "Cycle", "Category", "RenewalDate", "Status"]
  );
  setColumns(wsSubs, [8, 28, 14, 12, 18, 14, 12]);
  XLSX.utils.book_append_sheet(workbook, wsSubs, lang === "pt-PT" ? "Subscricoes" : "Subscriptions");

  const wsAssets = sheetFromRows(
    assets.map((row) => ({
      ID: row.id,
      Name: row.name,
      Type: row.asset_type,
      Value: moneyValue(Number(row.value || 0), currency),
      AsOfDate: normalizeDate(row.as_of_date)
    })),
    ["ID", "Name", "Type", "Value", "AsOfDate"]
  );
  setColumns(wsAssets, [8, 22, 18, 14, 14]);
  XLSX.utils.book_append_sheet(workbook, wsAssets, lang === "pt-PT" ? "Ativos" : "Assets");

  const wsDebts = sheetFromRows(
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
  );
  setColumns(wsDebts, [8, 22, 14, 14, 14, 12, 14]);
  XLSX.utils.book_append_sheet(workbook, wsDebts, lang === "pt-PT" ? "Dividas" : "Debts");

  const wsBudgets = sheetFromRows(
    budgets.map((row) => ({
      ID: row.id,
      Month: row.budget_month,
      Category: row.category,
      Budget: moneyValue(Number(row.budget_amount || 0), currency)
    })),
    ["ID", "Month", "Category", "Budget"]
  );
  setColumns(wsBudgets, [8, 12, 18, 14]);
  XLSX.utils.book_append_sheet(workbook, wsBudgets, lang === "pt-PT" ? "Orcamentos" : "Budgets");

  const wsGoals = sheetFromRows(
    goals.map((row) => ({
      ID: row.id,
      Name: row.name,
      Target: moneyValue(Number(row.target_amount || 0), currency),
      Saved: moneyValue(Number(row.saved_amount || 0), currency),
      CompletionPct: Number(row.target_amount || 0) > 0
        ? Math.round((Number(row.saved_amount || 0) / Number(row.target_amount || 0)) * 100)
        : 0,
      Deadline: normalizeDate(row.deadline),
      Status: row.status
    })),
    ["ID", "Name", "Target", "Saved", "CompletionPct", "Deadline", "Status"]
  );
  setColumns(wsGoals, [8, 28, 14, 14, 14, 14, 14]);
  XLSX.utils.book_append_sheet(workbook, wsGoals, lang === "pt-PT" ? "Objetivos" : "Goals");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true
  }) as Buffer;

  const fileName = `planqly-export-${selectedMonth}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
