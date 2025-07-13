-- Add RLS policies for anonymous authentication
-- Tables have RLS enabled but no policies, blocking all access

-- Allow service role (edge functions) full access to all tables
-- This enables edge functions to insert/update data

-- Users table policies
CREATE POLICY "Service role can manage users" ON users
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anonymous users can manage their own data" ON users
FOR ALL USING (true); -- For now, allow all access for anonymous auth

-- Tasks table policies  
CREATE POLICY "Service role can manage tasks" ON tasks
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anonymous users can manage tasks" ON tasks
FOR ALL USING (true); -- For now, allow all access for anonymous auth

-- Voice thoughts table policies
CREATE POLICY "Service role can manage voice thoughts" ON voice_thoughts
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anonymous users can manage voice thoughts" ON voice_thoughts
FOR ALL USING (true); -- For now, allow all access for anonymous auth

-- Sailing sessions table policies
CREATE POLICY "Service role can manage sessions" ON sailing_sessions
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anonymous users can manage sessions" ON sailing_sessions
FOR ALL USING (true); -- For now, allow all access for anonymous auth
