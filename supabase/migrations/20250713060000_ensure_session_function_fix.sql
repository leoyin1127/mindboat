-- Ensure end_sailing_session function returns proper integer types
-- This migration ensures compatibility with remote database

CREATE OR REPLACE FUNCTION end_sailing_session(
    session_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    session_stats RECORD;
    session_data JSONB;
    duration_secs INTEGER;
    focus_pct INTEGER;
BEGIN
    -- Get session statistics
    SELECT * INTO session_stats FROM get_session_stats(session_uuid);
    
    -- Update session with proper integer values
    UPDATE sailing_sessions 
    SET state = 'ended',
        ended_at = CURRENT_TIMESTAMP,
        total_focus_seconds = COALESCE(session_stats.focus_seconds, 0),
        total_drift_seconds = COALESCE(session_stats.drift_seconds, 0),
        drift_count = COALESCE(session_stats.drift_count, 0)
    WHERE id = session_uuid;
    
    -- Log session end event
    INSERT INTO session_events (session_id, event_type, event_data)
    VALUES (session_uuid, 'session_end', jsonb_build_object(
        'focus_seconds', COALESCE(session_stats.focus_seconds, 0),
        'drift_seconds', COALESCE(session_stats.drift_seconds, 0),
        'drift_count', COALESCE(session_stats.drift_count, 0)
    ));
    
    -- Calculate duration and focus percentage with explicit integer casting
    SELECT 
        EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER,
        CASE 
            WHEN (total_focus_seconds + total_drift_seconds) > 0 
            THEN ((total_focus_seconds::FLOAT / (total_focus_seconds + total_drift_seconds)) * 100)::INTEGER 
            ELSE 0 
        END
    INTO duration_secs, focus_pct
    FROM sailing_sessions
    WHERE id = session_uuid;
    
    -- Return session summary with guaranteed integer types
    SELECT jsonb_build_object(
        'session_id', id,
        'duration_seconds', COALESCE(duration_secs, 0),
        'focus_seconds', COALESCE(total_focus_seconds, 0),
        'drift_seconds', COALESCE(total_drift_seconds, 0),
        'drift_count', COALESCE(drift_count, 0),
        'focus_percentage', COALESCE(focus_pct, 0),
        'ended_at', ended_at,
        'status', 'completed'
    ) INTO session_data
    FROM sailing_sessions
    WHERE id = session_uuid;
    
    -- Ensure we return valid data even if session not found
    IF session_data IS NULL THEN
        session_data := jsonb_build_object(
            'session_id', session_uuid,
            'duration_seconds', 0,
            'focus_seconds', 0,
            'drift_seconds', 0,
            'drift_count', 0,
            'focus_percentage', 0,
            'status', 'error',
            'message', 'Session not found'
        );
    END IF;
    
    RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 