import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser, setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional()
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

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName, currentPassword, newPassword } = schema.parse(body);

    if (!displayName && !newPassword) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    await ensureDisplayNameColumn();
    const db = getDb();
    const [rows] = await db.query("SELECT id, email, password_hash, display_name FROM users WHERE id = ? LIMIT 1", [
      sessionUser.userId
    ]);

    const user = (rows as Array<{ id: number; email: string; password_hash: string; display_name?: string | null }>)[0];
    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Indica a password atual." }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Password atual inválida." }, { status: 400 });
      }
      const nextHash = await bcrypt.hash(newPassword, 10);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [nextHash, sessionUser.userId]);
    }

    let nextDisplay = user.display_name || undefined;
    if (displayName) {
      nextDisplay = displayName;
      await db.query("UPDATE users SET display_name = ? WHERE id = ?", [displayName, sessionUser.userId]);
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      displayName: nextDisplay
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("auth.profile.error", error);
    return NextResponse.json({ error: "Falha ao atualizar perfil." }, { status: 500 });
  }
}
