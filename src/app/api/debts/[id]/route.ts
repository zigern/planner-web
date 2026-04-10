import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const patchSchema = z.object({
  amountPaid: z.number().nonnegative()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const debtId = Number(id);
  if (!Number.isInteger(debtId) || debtId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const payload = patchSchema.parse(await request.json());
    const db = getDb();
    await db.query(
      `UPDATE debts
       SET amount_paid = ?
       WHERE id = ?
         AND user_id = ?
       LIMIT 1`,
      [payload.amountPaid, debtId, user.userId]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao atualizar dívida." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const debtId = Number(id);
  if (!Number.isInteger(debtId) || debtId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const db = getDb();
  const [result] = await db.query(
    `DELETE FROM debts
     WHERE id = ?
       AND user_id = ?
     LIMIT 1`,
    [debtId, user.userId]
  );

  const affectedRows = Number((result as { affectedRows?: number }).affectedRows || 0);
  if (affectedRows === 0) {
    return NextResponse.json({ error: "Dívida não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
