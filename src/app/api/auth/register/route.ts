import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    const db = getDb();
    const [exists] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

    if (Array.isArray(exists) && exists.length > 0) {
      return NextResponse.json({ error: "Email já existe." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, passwordHash]
    );

    const userId = Number((result as { insertId: number }).insertId);
    await setSessionCookie({ userId, email });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha ao registar utilizador. Detalhe: ${message}` },
      { status: 500 }
    );
  }
}
