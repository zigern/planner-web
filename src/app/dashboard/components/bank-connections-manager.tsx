"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoneyConverted } from "@/lib/currency-conversion";

type ConnectionItem = {
  id: number;
  providerInstitutionId: string;
  status: "pending" | "linked" | "connected" | "syncing" | "revoked" | "error";
  lastSyncedAt: string | null;
  consentExpiresAt: string | null;
};

type AccountItem = {
  id: number;
  connectionId: number;
  accountName: string | null;
  ibanMasked: string | null;
  currency: string | null;
  balance: number | null;
  balanceDate: string | null;
};

type SyncLogItem = {
  id: number;
  status: "running" | "success" | "partial" | "error";
  message: string | null;
  importedCount: number;
  skippedCount: number;
  createdAt: string;
};

type InstitutionItem = {
  id: string;
  name: string;
  countries: string[];
  logo: string | null;
};

function fmtMoney(value: number | null, lang: string, currency: string) {
  if (value === null) return "—";
  return formatMoneyConverted(value, lang, currency, 2);
}

function fmtDate(value: string | null, lang: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(lang, { day: "2-digit", month: "short", year: "numeric" });
}

export function BankConnectionsManager({
  lang,
  currency,
  providerReady,
  initialConnections,
  initialAccounts,
  initialSyncLogs,
  initialStatus
}: {
  lang: string;
  currency: string;
  providerReady: boolean;
  initialConnections: ConnectionItem[];
  initialAccounts: AccountItem[];
  initialSyncLogs: SyncLogItem[];
  initialStatus: string | null;
}) {
  const isPt = lang === "pt-PT";
  const router = useRouter();
  const [country, setCountry] = useState("PT");
  const [institutionId, setInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [message, setMessage] = useState<string | null>(
    initialStatus === "connected"
      ? isPt
        ? "Conta bancária ligada com sucesso."
        : "Bank account connected successfully."
      : null
  );
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  const t = useMemo(
    () =>
      isPt
        ? {
            title: "Contas bancárias",
            subtitle:
              "Ligação automática aos principais bancos via PSD2. Saldos e movimentos sincronizados sem introdução manual.",
            securityTitle: "Os seus dados, protegidos de raiz.",
            securityText:
              "Encriptação AES‑256 em repouso, TLS em trânsito, conformidade PSD2 e RGPD. Os dados ficam isolados por utilizador.",
            securityChecks: [
              "Ligação regulada PSD2",
              "Encriptação AES‑256 em repouso",
              "Dados alojados na UE",
              "Direitos RGPD: acesso, portabilidade e eliminação"
            ],
            connectTitle: "Ligar novo banco",
            country: "País",
            institution: "Banco",
            connect: "Ligar banco",
            syncing: "A sincronizar...",
            syncAll: "Sincronizar tudo",
            connections: "Ligações ativas",
            accounts: "Contas sincronizadas",
            lastSyncs: "Últimas sincronizações",
            status: "Estado",
            syncNow: "Sincronizar",
            disconnect: "Desligar",
            noConnections: "Sem ligações bancárias ativas.",
            noAccounts: "Sem contas sincronizadas.",
            noLogs: "Sem histórico de sincronização.",
            missingProvider:
              "Falta configurar GOCARDLESS_SECRET_ID e GOCARDLESS_SECRET_KEY para ativar a ligação bancária.",
            loadingBanks: "A carregar bancos...",
            chooseBank: "Seleciona um banco",
            linkedOn: "Ligada em",
            imported: "importados",
            skipped: "ignorados"
          }
        : {
            title: "Bank accounts",
            subtitle:
              "Automatic connection to major banks via PSD2. Balances and transactions synced without manual entry.",
            securityTitle: "Your data, protected by design.",
            securityText:
              "AES‑256 encryption at rest, TLS in transit, PSD2 and GDPR compliance. Data is isolated per user.",
            securityChecks: [
              "Regulated PSD2 access",
              "AES‑256 encryption at rest",
              "EU data residency",
              "GDPR rights: access, portability and deletion"
            ],
            connectTitle: "Connect a new bank",
            country: "Country",
            institution: "Bank",
            connect: "Connect bank",
            syncing: "Syncing...",
            syncAll: "Sync all",
            connections: "Active connections",
            accounts: "Synced accounts",
            lastSyncs: "Recent sync logs",
            status: "Status",
            syncNow: "Sync",
            disconnect: "Disconnect",
            noConnections: "No active bank connections.",
            noAccounts: "No synced accounts.",
            noLogs: "No sync logs yet.",
            missingProvider: "Missing GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY to enable bank linking.",
            loadingBanks: "Loading banks...",
            chooseBank: "Choose a bank",
            linkedOn: "Linked on",
            imported: "imported",
            skipped: "skipped"
          },
    [isPt]
  );

  useEffect(() => {
    if (!providerReady) return;
    const ac = new AbortController();
    setLoadingInstitutions(true);
    fetch(`/api/bank/institutions?country=${encodeURIComponent(country)}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{ items: InstitutionItem[] }>;
      })
      .then((payload) => {
        setInstitutions(payload.items || []);
      })
      .catch(() => {
        setInstitutions([]);
      })
      .finally(() => setLoadingInstitutions(false));

    return () => ac.abort();
  }, [country, providerReady]);

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!providerReady || !institutionId || isConnecting) return;
    setIsConnecting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/bank/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, country })
      });
      const payload = (await response.json()) as { error?: string; authUrl?: string };
      if (!response.ok || !payload.authUrl) {
        setMessage(payload.error || (isPt ? "Falha ao ligar banco." : "Failed to connect bank."));
        return;
      }
      window.location.href = payload.authUrl;
    } catch {
      setMessage(isPt ? "Falha ao ligar banco." : "Failed to connect bank.");
    } finally {
      setIsConnecting(false);
    }
  }

  async function onSync(connectionId?: number) {
    if (syncingAll || workingId) return;
    if (connectionId) setWorkingId(connectionId);
    else setSyncingAll(true);
    setMessage(null);
    try {
      const response = await fetch("/api/bank/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionId ? { connectionId } : {})
      });
      const payload = (await response.json()) as { error?: string; imported?: number; skipped?: number };
      if (!response.ok) {
        setMessage(payload.error || (isPt ? "Falha ao sincronizar." : "Sync failed."));
        return;
      }
      setMessage(
        isPt
          ? `Sincronização concluída: ${payload.imported || 0} ${t.imported}, ${payload.skipped || 0} ${t.skipped}.`
          : `Sync finished: ${payload.imported || 0} ${t.imported}, ${payload.skipped || 0} ${t.skipped}.`
      );
      router.refresh();
    } catch {
      setMessage(isPt ? "Falha ao sincronizar." : "Sync failed.");
    } finally {
      setWorkingId(null);
      setSyncingAll(false);
    }
  }

  async function onDisconnect(connectionId: number) {
    if (workingId || syncingAll) return;
    setWorkingId(connectionId);
    setMessage(null);
    try {
      const response = await fetch("/api/bank/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || (isPt ? "Falha ao desligar conta." : "Failed to disconnect."));
        return;
      }
      setMessage(isPt ? "Ligação removida." : "Connection removed.");
      router.refresh();
    } catch {
      setMessage(isPt ? "Falha ao desligar conta." : "Failed to disconnect.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="banking-grid">
      <article className="panel banking-security-panel">
        <p className="banking-kicker">{isPt ? "Segurança e privacidade" : "Security and privacy"}</p>
        <h3>{t.securityTitle}</h3>
        <p className="sub-copy">{t.securityText}</p>
        <ul className="banking-checks">
          {t.securityChecks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="panel banking-connect-panel">
        <div className="panel-head">
          <h3>{t.connectTitle}</h3>
          <button
            type="button"
            className="settings-pill"
            disabled={syncingAll || workingId !== null || !initialConnections.length}
            onClick={() => onSync()}
          >
            {syncingAll ? t.syncing : t.syncAll}
          </button>
        </div>
        <p className="sub-copy">{t.subtitle}</p>
        {!providerReady ? <p className="q-msg">{t.missingProvider}</p> : null}
        <form className="quick-form" onSubmit={onConnect}>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.country}</span>
              <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
            </label>
            <label className="q-field">
              <span>{t.institution}</span>
              <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} disabled={!providerReady || loadingInstitutions}>
                <option value="">{loadingInstitutions ? t.loadingBanks : t.chooseBank}</option>
                {institutions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" disabled={!providerReady || !institutionId || isConnecting}>
            {isConnecting ? t.syncing : t.connect}
          </button>
        </form>
        {message ? <p className="q-msg">{message}</p> : null}
      </article>

      <article className="panel banking-records-panel">
        <div className="bills-records-grid">
          <section className="bills-list-block">
            <div className="bills-list-head">
              <h4>{t.connections}</h4>
            </div>
            <ul className="bills-list">
              {initialConnections.length ? (
                initialConnections.map((item) => (
                  <li key={item.id}>
                    <div>
                      <b>{item.providerInstitutionId}</b>
                      <p>
                        {t.status}: {item.status} • {t.linkedOn}: {fmtDate(item.lastSyncedAt || item.consentExpiresAt, lang)}
                      </p>
                    </div>
                    <div className="bills-actions">
                      <button type="button" onClick={() => onSync(item.id)} disabled={workingId === item.id || syncingAll}>
                        {workingId === item.id ? t.syncing : t.syncNow}
                      </button>
                      <button type="button" onClick={() => onDisconnect(item.id)} disabled={workingId === item.id || syncingAll}>
                        {t.disconnect}
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="recurring-empty">{t.noConnections}</li>
              )}
            </ul>
          </section>

          <section className="bills-list-block">
            <div className="bills-list-head">
              <h4>{t.accounts}</h4>
            </div>
            <ul className="bills-list">
              {initialAccounts.length ? (
                initialAccounts.map((item) => (
                  <li key={item.id}>
                    <div>
                      <b>{item.accountName || item.ibanMasked || `#${item.id}`}</b>
                      <p>{item.ibanMasked || "—"}</p>
                    </div>
                    <strong>{fmtMoney(item.balance, lang, item.currency || currency)}</strong>
                  </li>
                ))
              ) : (
                <li className="recurring-empty">{t.noAccounts}</li>
              )}
            </ul>
          </section>
        </div>
      </article>

      <article className="panel banking-log-panel">
        <div className="panel-head">
          <h3>{t.lastSyncs}</h3>
        </div>
        <ul className="bills-list">
          {initialSyncLogs.length ? (
            initialSyncLogs.map((log) => (
              <li key={log.id}>
                <div>
                  <b>{log.status}</b>
                  <p>{fmtDate(log.createdAt, lang)}</p>
                </div>
                <strong>
                  +{log.importedCount}/-{log.skippedCount}
                </strong>
              </li>
            ))
          ) : (
            <li className="recurring-empty">{t.noLogs}</li>
          )}
        </ul>
      </article>
    </section>
  );
}
