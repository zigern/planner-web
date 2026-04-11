import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const subscriptionId = Number(id);
  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const db = getDb();
  await db.query(`DELETE FROM subscriptions WHERE id = ? AND user_id = ?`, [subscriptionId, user.userId]);
  return NextResponse.json({ ok: true });
}
