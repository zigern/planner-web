import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const patchSchema = z.object({
  savedAmount: z.number().nonnegative()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const goalId = Number(id);
  if (!Number.isInteger(goalId) || goalId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const payload = patchSchema.parse(await request.json());
    const db = getDb();

    const [rows] = await db.query(
      `SELECT target_amount
       FROM goals
       WHERE id = ?
         AND user_id = ?
       LIMIT 1`,
      [goalId, user.userId]
    );

    const goal = (rows as Array<{ target_amount: string }>)[0];
    if (!goal) {
      return NextResponse.json({ error: "Objetivo não encontrado." }, { status: 404 });
    }

    const target = Number(goal.target_amount || 0);
    const nextStatus = payload.savedAmount >= target && target > 0 ? "completed" : "in_progress";

    await db.query(
      `UPDATE goals
       SET saved_amount = ?,
           status = ?
       WHERE id = ?
         AND user_id = ?
       LIMIT 1`,
      [payload.savedAmount, nextStatus, goalId, user.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao atualizar objetivo." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const goalId = Number(id);
  if (!Number.isInteger(goalId) || goalId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const db = getDb();
  const [result] = await db.query(
    `DELETE FROM goals
     WHERE id = ?
       AND user_id = ?
     LIMIT 1`,
    [goalId, user.userId]
  );

  const affectedRows = Number((result as { affectedRows?: number }).affectedRows || 0);
  if (affectedRows === 0) {
    return NextResponse.json({ error: "Objetivo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
