-- Fix frontend_events table structure to include user_id and proper timestamps
-- This migration addresses the issue where welcome modal appears for all users
-- because events are not tied to specific users

-- Step 1: Add missing columns to frontend_events table
ALTER TABLE frontend_events 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Add foreign key constraint to users table
DO $$ 
BEGIN
    -- Check if the constraint doesn't exist and add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'frontend_events_user_id_fkey' 
        AND table_name = 'frontend_events'
    ) THEN
        ALTER TABLE frontend_events 
        ADD CONSTRAINT frontend_events_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Drop the old primary key constraint on event_data (if it exists)
-- We need to handle this carefully since it might not exist
DO $$ 
BEGIN
    -- Check if the old primary key exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'frontend_events_pkey' 
        AND table_name = 'frontend_events'
    ) THEN
        ALTER TABLE frontend_events DROP CONSTRAINT frontend_events_pkey;
    END IF;
END $$;

-- Step 4: Add new primary key on id column
DO $$ 
BEGIN
    -- Check if the primary key doesn't exist and add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'frontend_events_pkey' 
        AND table_name = 'frontend_events'
    ) THEN
        ALTER TABLE frontend_events 
        ADD CONSTRAINT frontend_events_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_frontend_events_user_id ON frontend_events(user_id);
CREATE INDEX IF NOT EXISTS idx_frontend_events_created_at ON frontend_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frontend_events_user_created ON frontend_events(user_id, created_at DESC);

-- Step 6: Enable RLS for user-specific access
ALTER TABLE frontend_events ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policy to ensure users only see their own events
-- Drop existing policy if it exists
DROP POLICY IF EXISTS frontend_events_user_policy ON frontend_events;

-- Create new policy
CREATE POLICY frontend_events_user_policy ON frontend_events
FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Step 8: Grant necessary permissions
GRANT ALL ON frontend_events TO anon, authenticated, service_role;

-- Step 9: Update existing records to have proper structure
-- Set created_at for existing records based on timestamp in event_data
UPDATE frontend_events 
SET created_at = COALESCE(
    (event_data->>'timestamp')::timestamptz,
    CURRENT_TIMESTAMP
)
WHERE created_at IS NULL;

-- Step 10: Add comment for documentation
COMMENT ON TABLE frontend_events IS 'Frontend events for real-time UI updates, now with proper user association and timestamps';
COMMENT ON COLUMN frontend_events.user_id IS 'Associates events with specific users to prevent cross-user modal triggers';
COMMENT ON COLUMN frontend_events.created_at IS 'Timestamp for event ordering and filtering';