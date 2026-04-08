import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const goalSchema = z.object({
  name: z.string().min(1).max(140),
  targetAmount: z.number().nonnegative(),
  savedAmount: z.number().nonnegative(),
  deadline: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).default("not_started")
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const payload = goalSchema.parse(await request.json());
    const db = getDb();
    await db.query(
      `INSERT INTO goals (user_id, name, target_amount, saved_amount, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        payload.name,
        payload.targetAmount,
        payload.savedAmount,
        payload.deadline || null,
        payload.status
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao criar goal." }, { status: 500 });
  }
}
