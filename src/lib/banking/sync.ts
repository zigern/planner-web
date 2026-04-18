import { createHash } from "node:crypto";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { encryptSecret } from "@/lib/security/encryption";
import { getAccountBalances, getAccountDetails, getAccountTransactions, getRequisition } from "./gocardless";

type SyncOptions = {
  userId: number;
  connectionId: number;
  dateFrom: string;
  dateTo: string;
};

type ConnectionRow = RowDataPacket & {
  id: number;
  provider_requisition_id: string;
  status: string;
};

type BankAccountRow = RowDataPacket & {
  id: number;
};

type ExistingBankTxRow = RowDataPacket & {
  id: number;
  local_transaction_id: number | null;
};

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function maskIban(iban: string | undefined) {
  if (!iban) return null;
  const clean = iban.replace(/\s+/g, "");
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

function detectDirection(amount: number): "in" | "out" {
  return amount >= 0 ? "in" : "out";
}

function toDateOnly(value: unknown) {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function parseAmount(tx: Record<string, unknown>) {
  const amountNode = tx.transactionAmount as { amount?: string; currency?: string } | undefined;
  const amount = Number(amountNode?.amount || 0);
  const currency = String(amountNode?.currency || "EUR");
  return { amount, currency };
}

function txDescription(tx: Record<string, unknown>) {
  const candidates = [
    tx.remittanceInformationUnstructured,
    tx.remittanceInformationUnstructuredArray,
    tx.creditorName,
    tx.debtorName,
    tx.additionalInformation,
    tx.bankTransactionCode
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim().slice(0, 255);
    if (Array.isArray(candidate) && candidate.length && typeof candidate[0] === "string") {
      return String(candidate[0]).trim().slice(0, 255);
    }
  }

  return "Bank transaction";
}

function txProviderId(tx: Record<string, unknown>) {
  const direct =
    (typeof tx.transactionId === "string" && tx.transactionId) ||
    (typeof tx.internalTransactionId === "string" && tx.internalTransactionId) ||
    (typeof tx.entryReference === "string" && tx.entryReference) ||
    "";
  if (direct) return direct;
  return stableHash(JSON.stringify(tx));
}

function txCategory(type: "income" | "expense", description: string) {
  if (type === "income") return "Business";
  const lower = description.toLowerCase();
  if (lower.includes("uber") || lower.includes("bolt") || lower.includes("fuel")) return "Transportation";
  if (lower.includes("netflix") || lower.includes("spotify") || lower.includes("subscription")) return "Bills";
  if (lower.includes("farm") || lower.includes("market") || lower.includes("restaurant")) return "Food";
  if (lower.includes("pharmacy") || lower.includes("hospital")) return "Health";
  return "Other";
}

export async function syncBankConnection(db: Pool, options: SyncOptions) {
  const [rows] = await db.query<ConnectionRow[]>(
    `SELECT id, provider_requisition_id, status
     FROM bank_connections
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [options.connectionId, options.userId]
  );
  const connection = rows[0];
  if (!connection) {
    throw new Error("Bank connection not found.");
  }
  if (connection.status === "revoked") {
    throw new Error("Bank connection is revoked.");
  }

  const requisition = await getRequisition(connection.provider_requisition_id);
  const accountIds = requisition.accounts || [];
  let imported = 0;
  let skipped = 0;

  await db.query(
    `UPDATE bank_connections
     SET status = 'syncing', last_error = NULL
     WHERE id = ? AND user_id = ?`,
    [options.connectionId, options.userId]
  );

  for (const providerAccountId of accountIds) {
    const details = await getAccountDetails(providerAccountId);
    const balances = await getAccountBalances(providerAccountId);

    const hashedAccount = stableHash(providerAccountId);
    const encryptedAccountId = encryptSecret(providerAccountId);
    const iban = details.account?.iban || null;
    const ibanEncrypted = iban ? encryptSecret(iban) : null;
    const accountName = details.account?.name || details.account?.ownerName || null;
    const balanceEntry = (balances.balances || []).find((item) => item.balanceAmount?.amount) || null;
    const balanceAmount = balanceEntry ? Number(balanceEntry.balanceAmount?.amount || 0) : null;
    const balanceCurrency = balanceEntry?.balanceAmount?.currency || details.account?.currency || "EUR";
    const balanceDate = toDateOnly(balanceEntry?.referenceDate);

    await db.query(
      `INSERT INTO bank_accounts (
        user_id, connection_id, provider_account_hash, provider_account_id_enc,
        iban_enc, iban_masked, account_name, currency, balance, balance_date, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        connection_id = VALUES(connection_id),
        provider_account_id_enc = VALUES(provider_account_id_enc),
        iban_enc = VALUES(iban_enc),
        iban_masked = VALUES(iban_masked),
        account_name = VALUES(account_name),
        currency = VALUES(currency),
        balance = VALUES(balance),
        balance_date = VALUES(balance_date),
        last_synced_at = NOW()`,
      [
        options.userId,
        options.connectionId,
        hashedAccount,
        encryptedAccountId,
        ibanEncrypted,
        maskIban(iban || undefined),
        accountName,
        balanceCurrency,
        balanceAmount,
        balanceDate
      ]
    );

    const [accountRows] = await db.query<BankAccountRow[]>(
      `SELECT id FROM bank_accounts
       WHERE user_id = ? AND provider_account_hash = ?
       LIMIT 1`,
      [options.userId, hashedAccount]
    );
    const account = accountRows[0];
    if (!account) continue;

    const txResponse = await getAccountTransactions(providerAccountId, options.dateFrom, options.dateTo);
    const booked = txResponse.transactions?.booked || [];
    for (const tx of booked) {
      const txId = txProviderId(tx);
      const txHash = stableHash(`${providerAccountId}:${txId}`);
      const bookingDate = toDateOnly(tx.bookingDate || tx.valueDate) || options.dateTo;
      const valueDate = toDateOnly(tx.valueDate);
      const { amount, currency } = parseAmount(tx);
      const direction = detectDirection(amount);
      const description = txDescription(tx);

      const [existing] = await db.query<ExistingBankTxRow[]>(
        `SELECT id, local_transaction_id
         FROM bank_transactions
         WHERE user_id = ? AND provider_transaction_hash = ?
         LIMIT 1`,
        [options.userId, txHash]
      );
      if (existing[0]) {
        skipped += 1;
        continue;
      }

      const [insertBankTx] = await db.query<ResultSetHeader>(
        `INSERT INTO bank_transactions (
          user_id, connection_id, bank_account_id, provider_transaction_hash, provider_transaction_id_enc,
          transaction_date, value_date, direction, amount, currency, description, raw_payload_enc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          options.userId,
          options.connectionId,
          account.id,
          txHash,
          encryptSecret(txId),
          bookingDate,
          valueDate,
          direction,
          Math.abs(amount),
          currency,
          description,
          encryptSecret(JSON.stringify(tx))
        ]
      );

      const localType = direction === "in" ? "income" : "expense";
      const localAmount = Math.abs(amount);
      const localCategory = txCategory(localType, description);
      const [localInsert] = await db.query<ResultSetHeader>(
        `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          options.userId,
          localType,
          localAmount,
          localCategory,
          `[bank-sync] ${description}`.slice(0, 255),
          bookingDate
        ]
      );

      await db.query(
        `UPDATE bank_transactions
         SET local_transaction_id = ?
         WHERE id = ?`,
        [localInsert.insertId, insertBankTx.insertId]
      );
      imported += 1;
    }
  }

  await db.query(
    `UPDATE bank_connections
     SET status = 'connected', last_synced_at = NOW(), last_error = NULL
     WHERE id = ? AND user_id = ?`,
    [options.connectionId, options.userId]
  );

  return { imported, skipped, accounts: accountIds.length };
}
