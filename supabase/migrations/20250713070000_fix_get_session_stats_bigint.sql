-- Fix get_session_stats function to return proper integer types
-- The COUNT(*) operation returns bigint which causes type mismatch

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
            (event_data->>'duration')::INTEGER ELSE 0 END), 0)::INTEGER AS focus_seconds,
        COALESCE(SUM(CASE WHEN event_type = 'drift_period' THEN 
            (event_data->>'duration')::INTEGER ELSE 0 END), 0)::INTEGER AS drift_seconds,
        COALESCE(COUNT(*) FILTER (WHERE event_type = 'drift_start'), 0)::INTEGER AS drift_count
    FROM session_events
    WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also recreate the end_sailing_session function to ensure compatibility
CREATE OR REPLACE FUNCTION end_sailing_session(
    session_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    session_stats RECORD;
    session_data JSONB;
    duration_secs INTEGER;
    focus_pct INTEGER;
    session_exists BOOLEAN;
BEGIN
    -- Check if session exists
    SELECT EXISTS(SELECT 1 FROM sailing_sessions WHERE id = session_uuid) INTO session_exists;
    
    IF NOT session_exists THEN
        RETURN jsonb_build_object(
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

    -- Get session statistics with explicit integer types
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
        COALESCE(EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER, 0),
        CASE 
            WHEN (COALESCE(total_focus_seconds, 0) + COALESCE(total_drift_seconds, 0)) > 0 
            THEN ((COALESCE(total_focus_seconds, 0)::FLOAT / (COALESCE(total_focus_seconds, 0) + COALESCE(total_drift_seconds, 0))) * 100)::INTEGER 
            ELSE 0 
        END
    INTO duration_secs, focus_pct
    FROM sailing_sessions
    WHERE id = session_uuid;
    
    -- Return session summary with guaranteed integer types
    SELECT jsonb_build_object(
        'session_id', session_uuid,
        'duration_seconds', COALESCE(duration_secs, 0),
        'focus_seconds', COALESCE(session_stats.focus_seconds, 0),
        'drift_seconds', COALESCE(session_stats.drift_seconds, 0),
        'drift_count', COALESCE(session_stats.drift_count, 0),
        'focus_percentage', COALESCE(focus_pct, 0),
        'ended_at', CURRENT_TIMESTAMP,
        'status', 'completed'
    ) INTO session_data;
    
    RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 