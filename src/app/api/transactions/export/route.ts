import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

type ExportRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string | Date;
};

function parseMonth(month: string | null) {
  if (!month) return null;
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

function csvEscape(value: string | number) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function normalizeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const month = parseMonth(new URL(request.url).searchParams.get("month"));
  const db = getDb();

  const [rows] = await db.query(
    `SELECT id, type, amount, category, description, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND (? IS NULL OR DATE_FORMAT(transaction_date, '%Y-%m') = ?)
     ORDER BY transaction_date DESC, id DESC`,
    [user.userId, month, month]
  );

  const items = rows as ExportRow[];
  const lines = ["id,type,amount,category,description,transaction_date"];

  for (const item of items) {
    lines.push(
      [
        csvEscape(item.id),
        csvEscape(item.type),
        csvEscape(Number(item.amount).toFixed(2)),
        csvEscape(item.category),
        csvEscape(item.description ?? ""),
        csvEscape(normalizeDate(item.transaction_date))
      ].join(",")
    );
  }

  const fileName = month ? `transactions-${month}.csv` : "transactions.csv";

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
