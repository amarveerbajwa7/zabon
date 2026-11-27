CREATE TABLE IF NOT EXISTS categorization_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern TEXT NOT NULL,  -- normalized merchant name (lowercase, stripped)
  category TEXT NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 1,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, merchant_pattern)
);

CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON categorization_rules(user_id);

CREATE TRIGGER update_categorization_rules_updated_at
  BEFORE UPDATE ON categorization_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON categorization_rules TO anon, authenticated, service_role;

-- RPC used by saveRule() to atomically increment match_count
CREATE OR REPLACE FUNCTION increment_rule_match_count(
  p_user_id UUID,
  p_merchant_pattern TEXT
) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE categorization_rules
  SET match_count = match_count + 1
  WHERE user_id = p_user_id
    AND merchant_pattern = p_merchant_pattern;
$$;
