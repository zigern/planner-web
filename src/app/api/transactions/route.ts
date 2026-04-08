import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1).max(80),
  description: z.string().max(255).optional(),
  transactionDate: z.string().min(1)
});

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const db = getDb();
  const [rows] = await db.query(
    `SELECT id, type, amount, category, description, transaction_date as transactionDate
     FROM transactions
     WHERE user_id = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 20`,
    [user.userId]
  );

  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const payload = createSchema.parse(await request.json());

    const db = getDb();
    await db.query(
      `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        payload.type,
        payload.amount,
        payload.category,
        payload.description || null,
        payload.transactionDate
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    return NextResponse.json({ error: "Falha ao criar transação." }, { status: 500 });
  }
}
