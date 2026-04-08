import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const billSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().nonnegative(),
  dueDay: z.number().int().min(1).max(31),
  frequency: z.enum(["monthly", "quarterly", "yearly"]),
  status: z.enum(["pending", "paid"]).default("pending"),
  autoPay: z.boolean().default(false),
  nextDue: z.string().optional()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const payload = billSchema.parse(await request.json());
    const db = getDb();
    await db.query(
      `INSERT INTO bills (user_id, name, amount, due_day, frequency, status, auto_pay, next_due)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        payload.name,
        payload.amount,
        payload.dueDay,
        payload.frequency,
        payload.status,
        payload.autoPay ? 1 : 0,
        payload.nextDue || null
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao criar bill." }, { status: 500 });
  }
}
