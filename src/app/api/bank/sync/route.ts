import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ensureBankingTables } from "@/lib/banking/schema";
import { syncBankConnection } from "@/lib/banking/sync";

const schema = z.object({
  connectionId: z.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function isoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const payload = schema.parse(await request.json().catch(() => ({})));
    const dateTo = payload.dateTo || isoDate(new Date());
    const dateFrom = payload.dateFrom || isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));

    const db = getDb();
    await ensureBankingTables(db);

    const [connections] = await db.query(
      `SELECT id
       FROM bank_connections
       WHERE user_id = ?
         AND status IN ('linked', 'connected', 'syncing')
         ${payload.connectionId ? "AND id = ?" : ""}
       ORDER BY id DESC`,
      payload.connectionId ? [user.userId, payload.connectionId] : [user.userId]
    );
    const rows = connections as Array<{ id: number }>;
    if (!rows.length) {
      return NextResponse.json({ error: "Sem ligações bancárias para sincronizar." }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const startedAt = new Date();

    const [logInsert] = await db.query(
      `INSERT INTO bank_sync_logs (user_id, connection_id, status, started_at)
       VALUES (?, ?, 'running', ?)`,
      [user.userId, payload.connectionId || null, startedAt]
    );
    const logId = Number((logInsert as { insertId: number }).insertId);

    try {
      for (const row of rows) {
        const result = await syncBankConnection(db, {
          userId: user.userId,
          connectionId: Number(row.id),
          dateFrom,
          dateTo
        });
        imported += result.imported;
        skipped += result.skipped;
      }

      await db.query(
        `UPDATE bank_sync_logs
         SET status = 'success', finished_at = NOW(), imported_count = ?, skipped_count = ?, message = ?
         WHERE id = ?`,
        [imported, skipped, "Sincronização concluída.", logId]
      );
    } catch (error) {
      await db.query(
        `UPDATE bank_sync_logs
         SET status = 'error', finished_at = NOW(), imported_count = ?, skipped_count = ?, message = ?
         WHERE id = ?`,
        [imported, skipped, "Falha na sincronização.", logId]
      );
      throw error;
    }

    return NextResponse.json({ ok: true, imported, skipped, syncedConnections: rows.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("bank.sync.error", error);
    return NextResponse.json({ error: "Falha ao sincronizar dados bancários." }, { status: 500 });
  }
}
