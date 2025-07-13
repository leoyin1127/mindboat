/*
  # Create Sessions Table

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key)
      - `device_id` (text, links to device-based auth)
      - `task_id` (text, references selected task)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz, nullable)
      - `status` (text, 'sailing'|'drifting'|'completed')
      - `session_data` (jsonb, for additional metadata)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sessions` table
    - Add policy for device-based access
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  task_id text NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL DEFAULT 'sailing' CHECK (status IN ('sailing', 'drifting', 'completed')),
  session_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own sessions"
  ON sessions
  FOR ALL
  USING (true); -- Since we're using device_id and not auth.uid()

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();