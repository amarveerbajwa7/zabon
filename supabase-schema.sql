-- ZABON Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- QBO Connections
-- Stores OAuth tokens per QuickBooks company (realm)
-- ============================================================
CREATE TABLE IF NOT EXISTS qbo_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  realm_id        TEXT NOT NULL UNIQUE,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  token_type      TEXT NOT NULL DEFAULT 'bearer',
  expires_at      TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbo_connections_realm_id ON qbo_connections(realm_id);

-- ============================================================
-- Uploads
-- Tracks each file upload session
-- ============================================================
CREATE TABLE IF NOT EXISTS uploads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename    TEXT NOT NULL,
  row_count   INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'parsed'
              CHECK (status IN ('parsed', 'categorizing', 'categorized', 'partial_pushed', 'pushed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Transactions
-- Individual line items from uploaded statements
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id           UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  description         TEXT NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  raw                 TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,

  -- AI categorization
  suggested_category  TEXT,
  ai_confidence       TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
  ai_reasoning        TEXT,

  -- Accountant review
  final_category      TEXT,
  reviewer_note       TEXT,

  -- Workflow status
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending',
                        'categorized',
                        'approved',
                        'rejected',
                        'pushed',
                        'push_failed'
                      )),

  -- QBO sync
  qbo_id              TEXT,
  push_error          TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_upload_id ON transactions(upload_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- ============================================================
-- Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qbo_connections_updated_at
  BEFORE UPDATE ON qbo_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (optional — enable when adding auth)
-- ============================================================
-- ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Useful views
-- ============================================================
CREATE OR REPLACE VIEW upload_summary AS
SELECT
  u.id,
  u.filename,
  u.row_count,
  u.status,
  u.created_at,
  COUNT(t.id) FILTER (WHERE t.status = 'pending') AS pending_count,
  COUNT(t.id) FILTER (WHERE t.status = 'categorized') AS categorized_count,
  COUNT(t.id) FILTER (WHERE t.status = 'approved') AS approved_count,
  COUNT(t.id) FILTER (WHERE t.status = 'pushed') AS pushed_count,
  COUNT(t.id) FILTER (WHERE t.status = 'push_failed') AS failed_count,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) AS total_expenses,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit'), 0) AS total_credits
FROM uploads u
LEFT JOIN transactions t ON t.upload_id = u.id
GROUP BY u.id, u.filename, u.row_count, u.status, u.created_at;
