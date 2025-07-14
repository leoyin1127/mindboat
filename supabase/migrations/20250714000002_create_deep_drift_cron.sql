-- Migration: Create cron job for deep drift monitoring
-- This will run the deep-drift-monitor function every minute to check for consecutive drifts

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to run deep drift monitoring every minute
-- Note: In production, you may want to adjust the frequency based on your needs
SELECT cron.schedule(
    'deep-drift-monitoring',           -- Job name
    '* * * * *',                       -- Run every minute (cron expression)
    $$
    SELECT
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/deep-drift-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'source', 'cron_job',
          'timestamp', now()
        )
      );
    $$
);

-- Add helpful comment
COMMENT ON EXTENSION pg_cron IS 'Cron job scheduler for deep drift monitoring';

-- Create a function to check cron job status (useful for debugging)
CREATE OR REPLACE FUNCTION get_deep_drift_cron_status()
RETURNS TABLE (
    jobid bigint,
    schedule text,
    command text,
    nodename text,
    nodeport integer,
    database text,
    username text,
    active boolean,
    jobname text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.jobid,
        c.schedule,
        c.command,
        c.nodename,
        c.nodeport,
        c.database,
        c.username,
        c.active,
        c.jobname
    FROM cron.job c
    WHERE c.jobname = 'deep-drift-monitoring';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_deep_drift_cron_status() TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION get_deep_drift_cron_status() IS 'Check the status of the deep drift monitoring cron job'; 