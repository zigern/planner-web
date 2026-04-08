import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  category: z.string().min(1).max(80),
  amount: z.number().nonnegative()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const payload = budgetSchema.parse(await request.json());
    const db = getDb();

    await db.query(
      `INSERT INTO monthly_budgets (user_id, budget_month, category, budget_amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE budget_amount = VALUES(budget_amount)`,
      [user.userId, payload.month, payload.category, payload.amount]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao gravar orçamento." }, { status: 500 });
  }
}
