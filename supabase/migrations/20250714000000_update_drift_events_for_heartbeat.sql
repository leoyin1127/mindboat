-- Migration: Update drift_events table for distraction detection heartbeat logging
-- This replaces the old drift_events structure with a per-minute focus log

-- Backup existing data if needed (optional)
-- CREATE TABLE drift_events_backup AS SELECT * FROM drift_events;

-- Drop and recreate the drift_events table with new schema
DROP TABLE IF EXISTS drift_events;

CREATE TABLE drift_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sailing_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- For RLS and indexing
    
    -- Core focus data from Dify
    is_drifting BOOLEAN NOT NULL,
    drift_reason TEXT,
    actual_task TEXT,
    user_mood TEXT,
    mood_reason TEXT,
    
    -- For the deep drift intervention logic
    intervention_triggered BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create optimized indexes for performance
CREATE INDEX idx_drift_events_session_time ON drift_events(session_id, created_at DESC);
CREATE INDEX idx_drift_events_drifting_sessions ON drift_events(session_id, is_drifting, created_at DESC) WHERE is_drifting = true;
CREATE INDEX idx_drift_events_intervention ON drift_events(session_id, intervention_triggered, created_at DESC) WHERE intervention_triggered = false;

-- Enable RLS for security
ALTER TABLE drift_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage drift events" ON drift_events
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anonymous users can manage drift events" ON drift_events
FOR ALL USING (true); -- For now, allow all access for anonymous auth

-- Add helpful comment
COMMENT ON TABLE drift_events IS 'Per-minute focus monitoring log for distraction detection system';
COMMENT ON COLUMN drift_events.is_drifting IS 'Whether user was detected as drifting during this heartbeat';
COMMENT ON COLUMN drift_events.drift_reason IS 'Dify explanation for the focus assessment';
COMMENT ON COLUMN drift_events.actual_task IS 'What Dify detected the user was actually doing';
COMMENT ON COLUMN drift_events.user_mood IS 'Optional mood assessment from Dify';
COMMENT ON COLUMN drift_events.mood_reason IS 'Optional explanation for mood assessment';
COMMENT ON COLUMN drift_events.intervention_triggered IS 'Whether this record triggered an AI intervention'; 