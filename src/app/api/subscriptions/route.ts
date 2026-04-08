import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const subscriptionSchema = z.object({
  service: z.string().min(1).max(120),
  cost: z.number().nonnegative(),
  billingCycle: z.enum(["monthly", "yearly"]),
  category: z.string().min(1).max(80),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
  renewalDate: z.string().optional()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const payload = subscriptionSchema.parse(await request.json());
    const db = getDb();
    await db.query(
      `INSERT INTO subscriptions (user_id, service, cost, billing_cycle, category, status, renewal_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        payload.service,
        payload.cost,
        payload.billingCycle,
        payload.category,
        payload.status,
        payload.renewalDate || null
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao criar subscription." }, { status: 500 });
  }
}
