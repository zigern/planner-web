import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const budgetId = Number(id);
  if (!Number.isInteger(budgetId) || budgetId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const db = getDb();
  const [result] = await db.query(
    `DELETE FROM monthly_budgets
     WHERE id = ?
       AND user_id = ?
     LIMIT 1`,
    [budgetId, user.userId]
  );

  const affectedRows = Number((result as { affectedRows?: number }).affectedRows || 0);
  if (affectedRows === 0) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
