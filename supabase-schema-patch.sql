-- Migration: Change ai_confidence from text to numeric (0-100)
-- Run this in the Supabase SQL editor before deploying the new code.

ALTER TABLE transactions
  DROP COLUMN IF EXISTS ai_confidence,
  ADD COLUMN ai_confidence NUMERIC(5,2);

-- Optional: add an index on upload status for DocumentList queries
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads (created_at DESC);
