CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_user_date (user_id, transaction_date),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_day TINYINT UNSIGNED NOT NULL,
  frequency ENUM('monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly',
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  auto_pay TINYINT(1) NOT NULL DEFAULT 0,
  next_due DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bills_user (user_id),
  CONSTRAINT fk_bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  service VARCHAR(120) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  billing_cycle ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  category VARCHAR(80) NOT NULL,
  status ENUM('active', 'paused', 'cancelled') NOT NULL DEFAULT 'active',
  renewal_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_subscriptions_user (user_id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(140) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  saved_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  deadline DATE NULL,
  status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user (user_id),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS debts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(140) NOT NULL,
  total_owed DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(6,3) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_debts_user (user_id),
  CONSTRAINT fk_debts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(140) NOT NULL,
  asset_type VARCHAR(80) NOT NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  as_of_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assets_user (user_id),
  CONSTRAINT fk_assets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  budget_month CHAR(7) NOT NULL,
  category VARCHAR(80) NOT NULL,
  budget_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_monthly_budget (user_id, budget_month, category),
  KEY idx_monthly_budget_user_month (user_id, budget_month),
  CONSTRAINT fk_monthly_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
