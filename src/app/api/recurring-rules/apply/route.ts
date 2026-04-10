import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const applySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

async function ensureRecurringTable(db: ReturnType<typeof getDb>) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      type ENUM('income','expense') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category VARCHAR(80) NOT NULL,
      description VARCHAR(255) NULL,
      day_of_month TINYINT UNSIGNED NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_applied_month CHAR(7) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_recurring_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

type RuleRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  day_of_month: number;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const payload = applySchema.parse(await request.json());
    const db = getDb();
    await ensureRecurringTable(db);

    const [rules] = await db.query(
      `SELECT id, type, amount, category, description, day_of_month
       FROM recurring_rules
       WHERE user_id = ?
         AND is_active = 1
         AND (last_applied_month IS NULL OR last_applied_month <> ?)`,
      [user.userId, payload.month]
    );

    const recurringRules = rules as RuleRow[];
    if (!recurringRules.length) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const [year, month] = payload.month.split("-").map(Number);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const rule of recurringRules) {
        const day = Math.min(28, Math.max(1, Number(rule.day_of_month || 1)));
        const txDate = new Date(year, month - 1, day);
        const txIso = txDate.toISOString().slice(0, 10);

        await connection.query(
          `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.userId, rule.type, rule.amount, rule.category, rule.description || null, txIso]
        );

        await connection.query(
          `UPDATE recurring_rules
           SET last_applied_month = ?
           WHERE id = ?
             AND user_id = ?`,
          [payload.month, rule.id, user.userId]
        );
      }

      await connection.commit();
      return NextResponse.json({ ok: true, inserted: recurringRules.length });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao aplicar recorrentes." }, { status: 500 });
  }
}
