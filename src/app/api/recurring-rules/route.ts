import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1).max(80),
  description: z.string().max(255).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional()
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

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const db = getDb();
  await ensureRecurringTable(db);

  const [rows] = await db.query(
    `SELECT id, type, amount, category, description, day_of_month, is_active, last_applied_month, created_at
     FROM recurring_rules
     WHERE user_id = ?
     ORDER BY is_active DESC, created_at DESC, id DESC`,
    [user.userId]
  );

  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const payload = createSchema.parse(await request.json());
    const db = getDb();

    await ensureRecurringTable(db);

    await db.query(
      `INSERT INTO recurring_rules (user_id, type, amount, category, description, day_of_month)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        payload.type,
        payload.amount,
        payload.category,
        payload.description || null,
        payload.dayOfMonth || 1
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    return NextResponse.json({ error: "Falha ao criar regra mensal." }, { status: 500 });
  }
}
