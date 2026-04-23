import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().trim().min(2).max(60)
});

async function ensureDisplayNameColumn() {
  const db = getDb();
  try {
    await db.query("ALTER TABLE users ADD COLUMN display_name VARCHAR(60) NULL");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_FIELDNAME"
    ) {
      return;
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, displayName } = schema.parse(body);
    const safeEmail = email.trim().toLowerCase();
    const safeDisplayName = displayName.trim();

    await ensureDisplayNameColumn();
    const db = getDb();
    const [exists] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [safeEmail]);

    if (Array.isArray(exists) && exists.length > 0) {
      return NextResponse.json({ error: "Email já existe." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
      [safeEmail, passwordHash, safeDisplayName]
    );

    const userId = Number((result as { insertId: number }).insertId);
    await setSessionCookie({ userId, email: safeEmail, displayName: safeDisplayName });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    console.error("auth.register.error", error);
    return NextResponse.json({ error: "Falha ao registar utilizador." }, { status: 500 });
  }
}
