@@ .. @@
 CREATE TABLE IF NOT EXISTS sessions (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
-  device_id text NOT NULL,
+  user_id uuid NOT NULL REFERENCES auth.users(id),
   task_id text NOT NULL,
   start_time timestamptz DEFAULT now(),
   end_time timestamptz,
   status text NOT NULL DEFAULT 'sailing' CHECK (status IN ('sailing', 'drifting', 'completed')),
   session_data jsonb DEFAULT '{}',
   created_at timestamptz DEFAULT now(),
   updated_at timestamptz DEFAULT now()
 );
 
 ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
 
-CREATE POLICY "Users can access their own sessions"
+CREATE POLICY "Users can access their own sessions"
   ON sessions
   FOR ALL
-  USING (true); -- Since we're using device_id and not auth.uid()
+  USING (auth.uid() = user_id);
 
 -- Add indexes for performance
-CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
+CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
 CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);