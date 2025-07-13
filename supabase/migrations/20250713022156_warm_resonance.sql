/*
  # Update voyages table for sailing sessions

  This migration adds necessary columns and indexes to support the sailing session system.
  
  ## Changes
  - Add session-related columns to voyages table
  - Add indexes for better performance
  - Ensure voyages table can handle the session workflow
*/

-- Add session-related columns if they don't exist
DO $$
BEGIN
  -- Add session tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'session_data'
  ) THEN
    ALTER TABLE voyages ADD COLUMN session_data jsonb DEFAULT '{}';
  END IF;

  -- Add permissions tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'permissions_granted'
  ) THEN
    ALTER TABLE voyages ADD COLUMN permissions_granted jsonb DEFAULT '{}';
  END IF;

  -- Ensure visual_state has the right constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'voyages_visual_state_check'
    AND check_clause LIKE '%sailing%'
    AND check_clause LIKE '%drifting%'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE voyages DROP CONSTRAINT IF EXISTS voyages_visual_state_check;
    
    -- Add updated constraint
    ALTER TABLE voyages ADD CONSTRAINT voyages_visual_state_check 
    CHECK (visual_state = ANY (ARRAY['sailing'::text, 'drifting'::text, 'exploring'::text, 'resting'::text]));
  END IF;

END $$;

-- Add indexes for session performance
CREATE INDEX IF NOT EXISTS idx_voyages_user_status_start_time 
ON voyages(user_id, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_voyages_visual_state 
ON voyages(visual_state);

CREATE INDEX IF NOT EXISTS idx_voyages_session_data 
ON voyages USING gin(session_data);