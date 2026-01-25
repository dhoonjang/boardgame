-- Forgod Game Database Schema
-- Run this in Supabase SQL Editor to create the required tables

-- Games table: stores all game sessions
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing active games
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at DESC);

-- Enable Row Level Security (optional, for multi-tenant scenarios)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (adjust for production)
CREATE POLICY "Allow all operations" ON games
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comment on table
COMMENT ON TABLE games IS 'Stores Forgod game sessions and their state';
COMMENT ON COLUMN games.state IS 'Full game state as JSON (players, board, monsters, etc.)';
COMMENT ON COLUMN games.status IS 'Game status: active, completed, or abandoned';
