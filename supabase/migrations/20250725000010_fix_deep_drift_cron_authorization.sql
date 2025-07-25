-- Fix deep drift monitoring cron job authorization
-- This fixes the 401 "Missing authorization header" issue by using proper header format

-- Remove any existing deep drift monitoring cron jobs (ignore errors if they don't exist)
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('deep-drift-monitoring');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        PERFORM cron.unschedule('deep-drift-monitoring-fixed');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        PERFORM cron.unschedule('deep-drift-monitoring-working');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        PERFORM cron.unschedule('deep-drift-monitoring-final');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- Create the working cron job with proper Edge Function authentication
SELECT cron.schedule(
    'deep-drift-monitoring-final',
    '* * * * *',  -- Every minute
    $$
    SELECT net.http_post(
        'https://ivlfsixvfovqitkajyjc.supabase.co/functions/v1/deep-drift-monitor',
        '{}',  -- Simple empty JSON body
        jsonb_build_object(
            'Content-Type', 'application/json',
            'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Aml2bGZzaXh2Zm92cWl0a2FqeWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk5MjU3MywiZXhwIjoyMDY0NTY4NTczfQ.ceCYfJfCMBJwh67v-2EWnAzXjFX9iiPt0k8aLfH7YVc'
        ),
        jsonb_build_object('source', 'cron_job', 'timestamp', now()::text),
        15000  -- 15 second timeout
    );
    $$
);

-- Drop existing functions if they exist (to avoid return type conflicts)
DROP FUNCTION IF EXISTS get_deep_drift_cron_status();
DROP FUNCTION IF EXISTS get_recent_drift_monitor_responses();

-- Create a function to check the status of the deep drift monitoring cron job
CREATE OR REPLACE FUNCTION get_deep_drift_cron_status()
RETURNS TABLE (
    jobid bigint,
    schedule text,
    command text,
    active boolean,
    jobname text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.jobid,
        c.schedule,
        c.command,
        c.active,
        c.jobname
    FROM cron.job c
    WHERE c.jobname = 'deep-drift-monitoring-final';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_deep_drift_cron_status() TO service_role;

-- Create a function to check recent HTTP responses from the cron job
CREATE OR REPLACE FUNCTION get_recent_drift_monitor_responses()
RETURNS TABLE (
    id bigint,
    status_code integer,
    content text,
    created timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.status_code,
        r.content,
        r.created
    FROM net._http_response r
    ORDER BY r.created DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_recent_drift_monitor_responses() TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION get_deep_drift_cron_status() IS 'Check the status of the deep drift monitoring cron job';
COMMENT ON FUNCTION get_recent_drift_monitor_responses() IS 'Check recent HTTP responses from deep drift monitoring calls';