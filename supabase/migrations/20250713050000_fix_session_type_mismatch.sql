-- Fix type mismatch in end_sailing_session function
-- EXTRACT(EPOCH FROM ...) returns double precision, need to cast to integer

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
    
    -- Return session summary with proper integer casting
    SELECT jsonb_build_object(
        'session_id', id,
        'duration_seconds', EXTRACT(EPOCH FROM (ended_at - started_at))::integer,
        'focus_seconds', total_focus_seconds,
        'drift_seconds', total_drift_seconds,
        'drift_count', drift_count,
        'focus_percentage', CASE 
            WHEN total_focus_seconds + total_drift_seconds > 0 
            THEN (total_focus_seconds::float / (total_focus_seconds + total_drift_seconds) * 100)::integer 
            ELSE 0 
        END
    ) INTO session_data
    FROM sailing_sessions
    WHERE id = session_uuid;
    
    RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 