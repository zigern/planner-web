import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type DbUser = {
  id: number;
  email: string;
  password_hash: string;
  display_name?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    const db = getDb();
    let rows;
    try {
      const [withDisplayName] = await db.query(
        "SELECT id, email, password_hash, display_name FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      rows = withDisplayName;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ER_BAD_FIELD_ERROR"
      ) {
        const [withoutDisplayName] = await db.query(
          "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1",
          [email]
        );
        rows = withoutDisplayName;
      } else {
        throw error;
      }
    }

    const user = (rows as DbUser[])[0];

    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    await setSessionCookie({ userId: user.id, email: user.email, displayName: user.display_name || undefined });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: `Falha no login. Detalhe: ${message}` }, { status: 500 });
  }
}
