-- Fix RLS policy for frontend_events table to work with anonymous authentication
-- The current policy blocks realtime subscriptions for anonymous users

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS frontend_events_user_policy ON frontend_events;
DROP POLICY IF EXISTS frontend_events_anonymous_policy ON frontend_events;
DROP POLICY IF EXISTS frontend_events_authenticated_policy ON frontend_events;

-- Create a new policy that allows anonymous users to access all events
-- This is acceptable for frontend_events since it's used for UI state management
CREATE POLICY frontend_events_anonymous_policy ON frontend_events
FOR ALL TO anon
USING (true);

-- Also allow authenticated users to access all events
CREATE POLICY frontend_events_authenticated_policy ON frontend_events
FOR ALL TO authenticated
USING (true);

-- Add helpful comments
COMMENT ON POLICY frontend_events_anonymous_policy ON frontend_events IS 'Allow anonymous users to access frontend events for UI state management';
COMMENT ON POLICY frontend_events_authenticated_policy ON frontend_events IS 'Allow authenticated users to access frontend events for UI state management';

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'frontend_events';