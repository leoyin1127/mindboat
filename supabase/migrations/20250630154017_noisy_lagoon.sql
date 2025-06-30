/*
  # Add missing millisecond precision columns to voyages table

  1. New Columns
    - `planned_duration_ms` (bigint) - Planned duration in milliseconds for precise tracking
    - `actual_duration_ms` (bigint) - Actual duration in milliseconds for precise tracking  
    - `start_time_precise_ms` (bigint) - Precise start time in milliseconds since epoch
    - `precision_level` (text) - Indicates the precision level used ('millisecond', 'second', 'minute')

  2. Changes
    - Add bigint columns for millisecond-precise duration tracking
    - Add precision level indicator for backward compatibility
    - Set appropriate defaults and constraints
*/

-- Add missing columns to voyages table
DO $$
BEGIN
  -- Add planned_duration_ms column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'planned_duration_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN planned_duration_ms bigint;
  END IF;

  -- Add actual_duration_ms column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'actual_duration_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN actual_duration_ms bigint;
  END IF;

  -- Add start_time_precise_ms column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'start_time_precise_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN start_time_precise_ms bigint;
  END IF;

  -- Add precision_level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'precision_level'
  ) THEN
    ALTER TABLE voyages ADD COLUMN precision_level text DEFAULT 'minute' CHECK (precision_level IN ('millisecond', 'second', 'minute'));
  END IF;
END $$;

-- Create indexes for the new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_voyages_planned_duration_ms ON voyages(planned_duration_ms);
CREATE INDEX IF NOT EXISTS idx_voyages_actual_duration_ms ON voyages(actual_duration_ms);
CREATE INDEX IF NOT EXISTS idx_voyages_precision_level ON voyages(precision_level);

-- Update existing records to populate millisecond columns from minute columns
UPDATE voyages 
SET 
  planned_duration_ms = planned_duration * 60000,
  actual_duration_ms = actual_duration * 60000,
  start_time_precise_ms = EXTRACT(EPOCH FROM start_time) * 1000
WHERE 
  planned_duration_ms IS NULL 
  AND planned_duration IS NOT NULL;

UPDATE voyages 
SET 
  actual_duration_ms = actual_duration * 60000
WHERE 
  actual_duration_ms IS NULL 
  AND actual_duration IS NOT NULL;

UPDATE voyages 
SET 
  start_time_precise_ms = EXTRACT(EPOCH FROM start_time) * 1000
WHERE 
  start_time_precise_ms IS NULL;