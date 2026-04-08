import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const assetSchema = z.object({
  name: z.string().min(1).max(140),
  assetType: z.string().min(1).max(80),
  value: z.number().nonnegative(),
  asOfDate: z.string().optional()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const payload = assetSchema.parse(await request.json());
    const db = getDb();
    await db.query(
      `INSERT INTO assets (user_id, name, asset_type, value, as_of_date)
       VALUES (?, ?, ?, ?, ?)`,
      [user.userId, payload.name, payload.assetType, payload.value, payload.asOfDate || null]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao criar asset." }, { status: 500 });
  }
}
