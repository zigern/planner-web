import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { hasGoCardlessConfig } from "@/lib/banking/gocardless";
import { ensureBankingTables } from "@/lib/banking/schema";
import { DashboardSidebar } from "../components/sidebar-nav";
import { DashboardTopBar } from "../components/top-bar";
import { BankConnectionsManager } from "../components/bank-connections-manager";
import "../dashboard-theme.css";

function parseMonthParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

function parseLangParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "en-US";
  const allowed = new Set(["pt-PT", "en-US", "es-ES", "fr-FR"]);
  return allowed.has(raw) ? raw : "en-US";
}

function parseCurrencyParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "USD";
  const allowed = new Set(["EUR", "USD", "GBP", "BRL"]);
  return allowed.has(raw) ? raw : "USD";
}

export default async function BancosPage({
  searchParams
}: {
  searchParams?: Promise<{
    month?: string | string[];
    lang?: string | string[];
    currency?: string | string[];
    bank_status?: string | string[];
  }>;
}) {
  if (!hasDatabaseConfig() || !process.env.AUTH_SECRET) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-bold text-amber-900">Falta configurar MySQL/Auth</h1>
          <p className="mt-3 text-amber-800">Configura as variáveis de ambiente e volta a carregar.</p>
        </section>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const selectedMonth = parseMonthParam(params?.month);
  const lang = parseLangParam(params?.lang);
  const currency = parseCurrencyParam(params?.currency);
  const bankStatus = (Array.isArray(params?.bank_status) ? params?.bank_status[0] : params?.bank_status) || null;

  const db = getDb();
  await ensureBankingTables(db);

  const [connectionsRows] = await db.query(
    `SELECT id, provider_institution_id, status, last_synced_at, consent_expires_at
     FROM bank_connections
     WHERE user_id = ?
     ORDER BY id DESC`,
    [user.userId]
  );
  const [accountsRows] = await db.query(
    `SELECT id, connection_id, account_name, iban_masked, currency, balance, balance_date
     FROM bank_accounts
     WHERE user_id = ?
     ORDER BY id DESC`,
    [user.userId]
  );
  const [logsRows] = await db.query(
    `SELECT id, status, message, imported_count, skipped_count, created_at
     FROM bank_sync_logs
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 8`,
    [user.userId]
  );

  const connections = (connectionsRows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    providerInstitutionId: String(row.provider_institution_id || ""),
    status: String(row.status || "pending") as "pending" | "linked" | "connected" | "syncing" | "revoked" | "error",
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
    consentExpiresAt: row.consent_expires_at ? String(row.consent_expires_at) : null
  }));

  const accounts = (accountsRows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    connectionId: Number(row.connection_id),
    accountName: row.account_name ? String(row.account_name) : null,
    ibanMasked: row.iban_masked ? String(row.iban_masked) : null,
    currency: row.currency ? String(row.currency) : null,
    balance: row.balance !== null && row.balance !== undefined ? Number(row.balance) : null,
    balanceDate: row.balance_date ? String(row.balance_date) : null
  }));

  const logs = (logsRows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    status: String(row.status || "running") as "running" | "success" | "partial" | "error",
    message: row.message ? String(row.message) : null,
    importedCount: Number(row.imported_count || 0),
    skippedCount: Number(row.skipped_count || 0),
    createdAt: String(row.created_at || "")
  }));

  const name = user.displayName?.trim() || user.email.split("@")[0];

  return (
    <div className="casha-wrap">
      <div className="casha-shell">
        <DashboardTopBar selectedMonth={selectedMonth} lang={lang} currency={currency} basePath="/dashboard/bancos" />
        <div className="workspace-shell">
          <DashboardSidebar
            current="banks"
            selectedMonth={selectedMonth}
            lang={lang}
            currency={currency}
            showBottomControls
            userDisplayName={name}
            logoutLabel={lang === "pt-PT" ? "Terminar sessão" : "Logout"}
          />
          <main className="dash-main">
            <section className="greeting-row">
              <div>
                <h1>{lang === "pt-PT" ? "Bancos ligados" : "Connected banks"}</h1>
                <p>
                  {lang === "pt-PT"
                    ? "Conecta bancos com PSD2 e sincroniza movimentos automaticamente."
                    : "Connect banks via PSD2 and sync transactions automatically."}
                </p>
              </div>
            </section>

            <BankConnectionsManager
              lang={lang}
              currency={currency}
              providerReady={hasGoCardlessConfig()}
              initialConnections={connections}
              initialAccounts={accounts}
              initialSyncLogs={logs}
              initialStatus={bankStatus}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
