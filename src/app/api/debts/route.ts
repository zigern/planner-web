import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const debtSchema = z.object({
  name: z.string().min(1).max(140),
  totalOwed: z.number().nonnegative(),
  amountPaid: z.number().nonnegative(),
  interestRate: z.number().min(0).max(100).default(0),
  dueDate: z.string().optional()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const payload = debtSchema.parse(await request.json());
    const db = getDb();
    await db.query(
      `INSERT INTO debts (user_id, name, total_owed, amount_paid, interest_rate, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        payload.name,
        payload.totalOwed,
        payload.amountPaid,
        payload.interestRate,
        payload.dueDate || null
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao criar debt." }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const db = getDb();
  const [rows] = await db.query(
    `SELECT id, name, total_owed, amount_paid, interest_rate, due_date, created_at
     FROM debts
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [user.userId]
  );

  return NextResponse.json({ items: rows });
}
