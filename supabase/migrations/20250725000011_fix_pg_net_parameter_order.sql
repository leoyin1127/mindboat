-- Fix pg_net parameter order for deep drift monitoring cron job
-- The issue was that headers were being passed as query parameters instead of HTTP headers

-- Remove the current broken cron job
SELECT cron.unschedule('deep-drift-monitoring-final');

-- Create the working cron job with CORRECT pg_net parameter order
-- Signature: net.http_post(url, body, params, headers, timeout_milliseconds)
SELECT cron.schedule(
    'deep-drift-monitoring-working',
    '* * * * *',  -- Every minute
    $$
    SELECT net.http_post(
        'https://ivlfsixvfovqitkajyjc.supabase.co/functions/v1/deep-drift-monitor'::text,  -- url
        jsonb_build_object('source', 'cron_job', 'timestamp', now()::text),  -- body (jsonb)
        '{}'::jsonb,  -- params (empty - no query parameters)
        jsonb_build_object(
            'Content-Type', 'application/json',
            'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGZzaXh2Zm92cWl0a2FqeWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTUwNjksImV4cCI6MjA2Njc3MTA2OX0.P2E_NOAnUPkNwTNdhSYy9HK6hKPKhGL8IsSkYZgGBek'
        ),  -- headers (correct position with anon key)
        15000  -- timeout_milliseconds
    );
    $$
);