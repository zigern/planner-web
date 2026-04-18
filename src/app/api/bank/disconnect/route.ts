import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ensureBankingTables } from "@/lib/banking/schema";

const schema = z.object({
  connectionId: z.number().int().positive()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const db = getDb();
    await ensureBankingTables(db);

    await db.query(
      `UPDATE bank_connections
       SET status = 'revoked', last_error = NULL, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [body.connectionId, user.userId]
    );

    await db.query(
      `DELETE FROM bank_connection_secrets
       WHERE connection_id = ? AND user_id = ?`,
      [body.connectionId, user.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("bank.disconnect.error", error);
    return NextResponse.json({ error: "Falha ao remover ligação bancária." }, { status: 500 });
  }
}
