import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { hasGoCardlessConfig } from "@/lib/banking/gocardless";
import { ensureBankingTables } from "@/lib/banking/schema";
import { syncBankConnection } from "@/lib/banking/sync";

function isoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  if (errorParam) {
    return NextResponse.redirect(new URL("/dashboard/bancos?bank_status=error", url.origin));
  }
  if (!hasGoCardlessConfig()) {
    return NextResponse.redirect(new URL("/dashboard/bancos?bank_status=missing_config", url.origin));
  }

  const requisitionIdParam = url.searchParams.get("requisition_id");
  const referenceParam = url.searchParams.get("ref");
  const db = getDb();
  await ensureBankingTables(db);

  let connectionId: number | null = null;
  if (requisitionIdParam) {
    const [rows] = await db.query(
      `SELECT id
       FROM bank_connections
       WHERE user_id = ? AND provider_requisition_id = ?
       LIMIT 1`,
      [user.userId, requisitionIdParam]
    );
    const row = (rows as Array<{ id: number }>)[0];
    if (row) connectionId = Number(row.id);
  } else if (referenceParam) {
    const [rows] = await db.query(
      `SELECT id
       FROM bank_connections
       WHERE user_id = ? AND provider_reference = ?
       LIMIT 1`,
      [user.userId, referenceParam]
    );
    const row = (rows as Array<{ id: number }>)[0];
    if (row) connectionId = Number(row.id);
  }

  if (!connectionId) {
    return NextResponse.redirect(new URL("/dashboard/bancos?bank_status=not_found", url.origin));
  }

  try {
    const dateTo = isoDate(new Date());
    const dateFrom = isoDate(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000));
    const result = await syncBankConnection(db, {
      userId: user.userId,
      connectionId,
      dateFrom,
      dateTo
    });
    const target = new URL("/dashboard/bancos", url.origin);
    target.searchParams.set("bank_status", "connected");
    target.searchParams.set("imported", String(result.imported));
    return NextResponse.redirect(target);
  } catch (error) {
    console.error("bank.callback.error", error);
    return NextResponse.redirect(new URL("/dashboard/bancos?bank_status=sync_error", url.origin));
  }
}
