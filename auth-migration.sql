-- Add user_id to tables
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE qbo_connections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploads
CREATE POLICY "Users see own uploads" ON uploads FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for transactions (via upload ownership)
CREATE POLICY "Users see own transactions" ON transactions FOR ALL
  USING (upload_id IN (SELECT id FROM uploads WHERE user_id = auth.uid()));

-- RLS Policies for qbo_connections
CREATE POLICY "Users see own QBO connections" ON qbo_connections FOR ALL USING (auth.uid() = user_id);
