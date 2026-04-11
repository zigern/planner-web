import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const billId = Number(id);
  if (!Number.isFinite(billId) || billId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const db = getDb();
  await db.query(`DELETE FROM bills WHERE id = ? AND user_id = ?`, [billId, user.userId]);
  return NextResponse.json({ ok: true });
}

const updateBillSchema = z.object({
  status: z.enum(["pending", "paid"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const billId = Number(id);
  if (!Number.isFinite(billId) || billId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const payload = updateBillSchema.parse(await request.json());
    const db = getDb();
    await db.query(`UPDATE bills SET status = ? WHERE id = ? AND user_id = ?`, [payload.status, billId, user.userId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
}
