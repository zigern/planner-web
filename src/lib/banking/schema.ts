import type { Pool } from "mysql2/promise";

export async function ensureBankingTables(db: Pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_connections (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(32) NOT NULL DEFAULT 'gocardless',
      provider_requisition_id VARCHAR(64) NOT NULL,
      provider_institution_id VARCHAR(64) NOT NULL,
      provider_reference VARCHAR(64) NOT NULL,
      status ENUM('pending', 'linked', 'connected', 'syncing', 'revoked', 'error') NOT NULL DEFAULT 'pending',
      consent_expires_at DATETIME NULL,
      last_synced_at DATETIME NULL,
      last_error VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_provider_requisition (provider, provider_requisition_id),
      KEY idx_bank_connections_user (user_id),
      CONSTRAINT fk_bank_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_connection_secrets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      connection_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      requisition_payload_enc LONGTEXT NULL,
      accounts_payload_enc LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_bank_connection_secret (connection_id),
      KEY idx_bank_connection_secrets_user (user_id),
      CONSTRAINT fk_bank_connection_secrets_connection FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
      CONSTRAINT fk_bank_connection_secrets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      connection_id BIGINT UNSIGNED NOT NULL,
      provider_account_hash CHAR(64) NOT NULL,
      provider_account_id_enc TEXT NOT NULL,
      iban_enc TEXT NULL,
      iban_masked VARCHAR(34) NULL,
      account_name VARCHAR(140) NULL,
      currency VARCHAR(12) NULL,
      balance DECIMAL(14,2) NULL,
      balance_date DATE NULL,
      last_synced_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_bank_account_hash (user_id, provider_account_hash),
      KEY idx_bank_accounts_connection (connection_id),
      CONSTRAINT fk_bank_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_bank_accounts_connection FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      connection_id BIGINT UNSIGNED NOT NULL,
      bank_account_id BIGINT UNSIGNED NOT NULL,
      provider_transaction_hash CHAR(64) NOT NULL,
      provider_transaction_id_enc TEXT NULL,
      transaction_date DATE NOT NULL,
      value_date DATE NULL,
      direction ENUM('in', 'out') NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      currency VARCHAR(12) NOT NULL,
      description VARCHAR(255) NOT NULL,
      raw_payload_enc LONGTEXT NULL,
      local_transaction_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_bank_tx_hash (user_id, provider_transaction_hash),
      KEY idx_bank_tx_account_date (bank_account_id, transaction_date),
      KEY idx_bank_tx_local (local_transaction_id),
      CONSTRAINT fk_bank_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_bank_tx_connection FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
      CONSTRAINT fk_bank_tx_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
      CONSTRAINT fk_bank_tx_local FOREIGN KEY (local_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_sync_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      connection_id BIGINT UNSIGNED NULL,
      status ENUM('running', 'success', 'partial', 'error') NOT NULL,
      message VARCHAR(255) NULL,
      started_at DATETIME NOT NULL,
      finished_at DATETIME NULL,
      imported_count INT UNSIGNED NOT NULL DEFAULT 0,
      skipped_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_bank_sync_logs_user (user_id, created_at),
      KEY idx_bank_sync_logs_connection (connection_id),
      CONSTRAINT fk_bank_sync_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_bank_sync_logs_connection FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
