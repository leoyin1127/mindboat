-- Initial Database Schema for Mindship MVP
-- Based on InitialDBDesign.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived');
CREATE TYPE session_state AS ENUM ('active', 'paused', 'ended');
CREATE TYPE media_type AS ENUM ('audio', 'screenshot', 'webcam');
CREATE TYPE drift_severity AS ENUM ('minor', 'moderate', 'severe');

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 1. USER MANAGEMENT
-- ===============================

-- Users table (simplified for anonymous auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_fingerprint TEXT UNIQUE NOT NULL, -- Browser fingerprint for anonymous auth
    ip_address INET,
    user_agent TEXT,
    display_name TEXT,
    guiding_star TEXT, -- Their north star goal
    preferences JSONB DEFAULT '{}',
    first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_fingerprint ON users(device_fingerprint);
CREATE INDEX idx_users_ip ON users(ip_address);
CREATE INDEX idx_users_last_seen ON users(last_seen_at DESC);
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===============================
-- 2. TASK MANAGEMENT
-- ===============================

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    source_thought_id UUID, -- Link to original voice thought
    priority INTEGER CHECK (priority BETWEEN 1 AND 3) DEFAULT 2,
    status task_status DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'completed';
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===============================
-- 3. VOICE THOUGHTS & MEDIA STORAGE
-- ===============================

-- Voice thoughts (wind of thoughts)
CREATE TABLE voice_thoughts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT, -- Supabase storage URL (nullable for Web Speech API)
    transcript TEXT,
    duration_seconds INTEGER,
    processed BOOLEAN DEFAULT false,
    extracted_tasks UUID[], -- Array of task IDs created from this thought
    metadata JSONB DEFAULT '{}', -- Language, confidence, etc.
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voice_thoughts_user ON voice_thoughts(user_id, created_at DESC);
CREATE INDEX idx_voice_thoughts_unprocessed ON voice_thoughts(processed) WHERE processed = false;

-- Media storage (unified for all media types)
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID,
    type media_type NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}', -- Resolution, format, etc.
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_files_session ON media_files(session_id, created_at);
CREATE INDEX idx_media_files_user_type ON media_files(user_id, type, created_at DESC);

-- ===============================
-- 4. SAILING SESSIONS
-- ===============================

-- Sailing sessions
CREATE TABLE sailing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    state session_state DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    total_focus_seconds INTEGER DEFAULT 0,
    total_drift_seconds INTEGER DEFAULT 0,
    drift_count INTEGER DEFAULT 0,
    summary JSONB, -- AI-generated summary
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_active ON sailing_sessions(user_id, state) WHERE state = 'active';
CREATE INDEX idx_sessions_user_date ON sailing_sessions(user_id, started_at DESC);
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sailing_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Session events (replaces multiple log tables)
CREATE TABLE session_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sailing_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'focus_check', 'drift_start', 'drift_end', 'voice_note', etc.
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_events_session ON session_events(session_id, created_at);
CREATE INDEX idx_session_events_type ON session_events(event_type, created_at DESC);

-- ===============================
-- 5. DRIFT DETECTION & AI INTERVENTION
-- ===============================

-- Drift events (simplified)
CREATE TABLE drift_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sailing_sessions(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    severity drift_severity DEFAULT 'minor',
    trigger_ai_intervention BOOLEAN DEFAULT false,
    intervention_result JSONB, -- AI response, user action, etc.
    screenshot_id UUID REFERENCES media_files(id)
);

CREATE INDEX idx_drift_events_session ON drift_events(session_id, started_at);

-- AI conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sailing_sessions(id) ON DELETE SET NULL,
    drift_event_id UUID REFERENCES drift_events(id) ON DELETE SET NULL,
    messages JSONB NOT NULL, -- Array of {role, content, timestamp}
    context JSONB DEFAULT '{}', -- Task info, drift duration, etc.
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);

-- ===============================
-- 6. PROGRESS TRACKING & VISUALIZATION
-- ===============================

-- Daily summaries (replaces complex materialized views)
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_focus_seconds INTEGER DEFAULT 0,
    total_drift_seconds INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    ai_interventions INTEGER DEFAULT 0,
    summary_data JSONB DEFAULT '{}', -- Additional metrics
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);

-- Inner world map data
CREATE TABLE world_map_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sailing_sessions(id) ON DELETE CASCADE,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    node_type TEXT NOT NULL, -- 'task_completed', 'milestone', 'drift_overcome'
    node_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_world_map_nodes_user ON world_map_nodes(user_id, created_at);

-- ===============================
-- 7. ANIMATION & UI STATE
-- ===============================

-- Animation triggers (for Spline integration)
CREATE TABLE animation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animation_name TEXT NOT NULL,
    trigger_data JSONB DEFAULT '{}',
    played BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_animation_queue_unplayed ON animation_queue(user_id, played) WHERE played = false;

-- ===============================
-- 8. SECURITY & RLS POLICIES
-- ===============================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sailing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for anonymous users
-- Note: We'll use a custom context instead of auth.uid() since we're doing anonymous auth

-- Users can only see their own data
CREATE POLICY users_policy ON users
    FOR ALL USING (id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY tasks_policy ON tasks
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY voice_thoughts_policy ON voice_thoughts
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY sessions_policy ON sailing_sessions
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY session_events_policy ON session_events
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sailing_sessions 
            WHERE user_id = current_setting('app.current_user_id', true)::uuid
        )
    );

CREATE POLICY drift_events_policy ON drift_events
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sailing_sessions 
            WHERE user_id = current_setting('app.current_user_id', true)::uuid
        )
    );

CREATE POLICY ai_conversations_policy ON ai_conversations
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY daily_summaries_policy ON daily_summaries
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY world_map_nodes_policy ON world_map_nodes
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY animation_queue_policy ON animation_queue
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY media_files_policy ON media_files
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- ===============================
-- 8. STORAGE BUCKETS
-- ===============================

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio', 'audio', true);

-- Storage policies for audio bucket
CREATE POLICY "Users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can read audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio'
);

CREATE POLICY "Users can delete their own audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio' AND 
  auth.uid() IS NOT NULL
);

-- ===============================
-- 9. PERFORMANCE OPTIMIZATIONS
-- ===============================

-- Create function for efficient session statistics
CREATE OR REPLACE FUNCTION get_session_stats(session_uuid UUID)
RETURNS TABLE (
    focus_seconds INTEGER,
    drift_seconds INTEGER,
    drift_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN event_type = 'focus_period' THEN 
            (event_data->>'duration')::INTEGER ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN event_type = 'drift_period' THEN 
            (event_data->>'duration')::INTEGER ELSE 0 END), 0),
        COUNT(*) FILTER (WHERE event_type = 'drift_start')::INTEGER
    FROM session_events
    WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create view for active sessions monitoring
CREATE VIEW active_sessions_view AS
SELECT 
    s.*,
    u.device_fingerprint,
    u.display_name,
    t.title as task_title
FROM sailing_sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN tasks t ON s.task_id = t.id
WHERE s.state = 'active';

-- ===============================
-- 10. RPC FUNCTIONS FOR APPLICATION
-- ===============================

-- Function to set configuration for RLS context
CREATE OR REPLACE FUNCTION set_config(
    setting_name TEXT,
    setting_value TEXT
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create user by device fingerprint
CREATE OR REPLACE FUNCTION get_or_create_user(
    fingerprint TEXT,
    ip_addr INET DEFAULT NULL,
    user_agent_str TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Try to find existing user
    SELECT id INTO user_uuid
    FROM users
    WHERE device_fingerprint = fingerprint;
    
    -- If not found, create new user
    IF user_uuid IS NULL THEN
        INSERT INTO users (device_fingerprint, ip_address, user_agent, last_seen_at)
        VALUES (fingerprint, ip_addr, user_agent_str, CURRENT_TIMESTAMP)
        RETURNING id INTO user_uuid;
    ELSE
        -- Update last seen
        UPDATE users 
        SET last_seen_at = CURRENT_TIMESTAMP,
            ip_address = COALESCE(ip_addr, ip_address),
            user_agent = COALESCE(user_agent_str, user_agent)
        WHERE id = user_uuid;
    END IF;
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user goal (guiding star)
CREATE OR REPLACE FUNCTION set_user_goal(
    user_uuid UUID,
    goal_text TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET guiding_star = goal_text,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a sailing session
CREATE OR REPLACE FUNCTION start_sailing_session(
    user_uuid UUID,
    task_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_uuid UUID;
BEGIN
    -- End any existing active sessions for this user
    UPDATE sailing_sessions 
    SET state = 'ended',
        ended_at = CURRENT_TIMESTAMP
    WHERE user_id = user_uuid AND state = 'active';
    
    -- Create new session
    INSERT INTO sailing_sessions (user_id, task_id, state)
    VALUES (user_uuid, task_uuid, 'active')
    RETURNING id INTO session_uuid;
    
    -- Log session start event
    INSERT INTO session_events (session_id, event_type, event_data)
    VALUES (session_uuid, 'session_start', jsonb_build_object('task_id', task_uuid));
    
    RETURN session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a sailing session
CREATE OR REPLACE FUNCTION end_sailing_session(
    session_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    session_stats RECORD;
    session_data JSONB;
BEGIN
    -- Get session statistics
    SELECT * INTO session_stats FROM get_session_stats(session_uuid);
    
    -- Update session
    UPDATE sailing_sessions 
    SET state = 'ended',
        ended_at = CURRENT_TIMESTAMP,
        total_focus_seconds = session_stats.focus_seconds,
        total_drift_seconds = session_stats.drift_seconds,
        drift_count = session_stats.drift_count
    WHERE id = session_uuid;
    
    -- Log session end event
    INSERT INTO session_events (session_id, event_type, event_data)
    VALUES (session_uuid, 'session_end', jsonb_build_object(
        'focus_seconds', session_stats.focus_seconds,
        'drift_seconds', session_stats.drift_seconds,
        'drift_count', session_stats.drift_count
    ));
    
    -- Return session summary
    SELECT jsonb_build_object(
        'session_id', id,
        'duration_seconds', EXTRACT(EPOCH FROM (ended_at - started_at)),
        'focus_seconds', total_focus_seconds,
        'drift_seconds', total_drift_seconds,
        'drift_count', drift_count,
        'focus_percentage', CASE 
            WHEN total_focus_seconds + total_drift_seconds > 0 
            THEN (total_focus_seconds::float / (total_focus_seconds + total_drift_seconds) * 100)::int 
            ELSE 0 
        END
    ) INTO session_data
    FROM sailing_sessions
    WHERE id = session_uuid;
    
    RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- 9. SCHEMA VERSIONING
-- ===============================

-- Schema version tracking
CREATE TABLE schema_versions (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_versions (version, description) 
VALUES (1, 'Initial MVP schema with anonymous authentication');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 