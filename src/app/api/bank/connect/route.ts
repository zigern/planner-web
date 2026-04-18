import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createRequisition, hasGoCardlessConfig } from "@/lib/banking/gocardless";
import { ensureBankingTables } from "@/lib/banking/schema";
import { encryptSecret } from "@/lib/security/encryption";

const schema = z.object({
  institutionId: z.string().min(2).max(64),
  country: z.string().min(2).max(2).optional()
});

function resolveRedirectUri(request: Request) {
  if (process.env.GOCARDLESS_REDIRECT_URI) {
    return process.env.GOCARDLESS_REDIRECT_URI;
  }
  const url = new URL(request.url);
  return `${url.origin}/api/bank/callback`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!hasGoCardlessConfig()) {
    return NextResponse.json(
      { error: "Falta configurar ligação bancária (GOCARDLESS_SECRET_ID/KEY)." },
      { status: 400 }
    );
  }

  try {
    const body = schema.parse(await request.json());
    const db = getDb();
    await ensureBankingTables(db);

    const reference = randomUUID().replace(/-/g, "").slice(0, 32);
    const requisition = await createRequisition({
      institutionId: body.institutionId,
      redirect: resolveRedirectUri(request),
      reference,
      userLanguage: "PT"
    });

    const [result] = await db.query(
      `INSERT INTO bank_connections (
        user_id, provider, provider_requisition_id, provider_institution_id, provider_reference, status
      ) VALUES (?, 'gocardless', ?, ?, ?, 'pending')`,
      [user.userId, requisition.id, body.institutionId, reference]
    );

    const connectionId = Number((result as { insertId: number }).insertId);
    await db.query(
      `INSERT INTO bank_connection_secrets (connection_id, user_id, requisition_payload_enc)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE requisition_payload_enc = VALUES(requisition_payload_enc)`,
      [connectionId, user.userId, encryptSecret(JSON.stringify(requisition))]
    );

    return NextResponse.json({
      ok: true,
      connectionId,
      authUrl: requisition.link
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("bank.connect.error", error);
    return NextResponse.json({ error: "Falha ao iniciar ligação bancária." }, { status: 500 });
  }
}
