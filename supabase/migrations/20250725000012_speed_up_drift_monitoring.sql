-- Speed up deep drift monitoring to trigger interventions faster
-- Change from every minute to every 15 seconds

-- Remove the current cron job
SELECT cron.unschedule('deep-drift-monitoring-working');

-- Create a faster cron job that runs every 15 seconds
-- Using 4 jobs offset by 15 seconds each to achieve 15-second intervals
SELECT cron.schedule(
    'deep-drift-monitoring-15s-1',
    '* * * * *',  -- Every minute at :00
    $$
    SELECT net.http_post(
        'https://ivlfsixvfovqitkajyjc.supabase.co/functions/v1/deep-drift-monitor'::text,
        jsonb_build_object('source', 'cron_job', 'timestamp', now()::text),
        '{}'::jsonb,
        jsonb_build_object(
            'Content-Type', 'application/json',
            'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGZzaXh2Zm92cWl0a2FqeWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTUwNjksImV4cCI6MjA2Njc3MTA2OX0.P2E_NOAnUPkNwTNdhSYy9HK6hKPKhGL8IsSkYZgGBek'
        ),
        15000
    );
    $$
);

-- Schedule additional jobs with pg_sleep delays to run at :15, :30, :45
SELECT cron.schedule(
    'deep-drift-monitoring-15s-2',
    '* * * * *',
    $$
    SELECT pg_sleep(15);
    SELECT net.http_post(
        'https://ivlfsixvfovqitkajyjc.supabase.co/functions/v1/deep-drift-monitor'::text,
        jsonb_build_object('source', 'cron_job', 'timestamp', now()::text),
        '{}'::jsonb,
        jsonb_build_object(
            'Content-Type', 'application/json',
            'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGZzaXh2Zm92cWl0a2FqeWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTUwNjksImV4cCI6MjA2Njc3MTA2OX0.P2E_NOAnUPkNwTNdhSYy9HK6hKPKhGL8IsSkYZgGBek'
        ),
        15000
    );
    $$
);

SELECT cron.schedule(
    'deep-drift-monitoring-15s-3',
    '* * * * *',
    $$
    SELECT pg_sleep(30);
    SELECT net.http_post(
        'https://ivlfsixvfovqitkajyjc.supabase.co/functions/v1/deep-drift-monitor'::text,
        jsonb_build_object('source', 'cron_job', 'timestamp', now()::text),
        '{}'::jsonb,
        jsonb_build_object(
            'Content-Type', 'application/json',
            'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGZzaXh2Zm92cWl0a2FqeWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTUwNjksImV4cCI6MjA2Njc3MTA2OX0.P2E_NOAnUPkNwTNdhSYy9HK6hKPKhGL8IsSkYZgGBek'
        ),
        15000
    );
    $$
);

SELECT cron.schedule(
    'deep-drift-monitoring-15s-4',
    '* * * * *',
    $$
    SELECT pg_sleep(45);
    SELECT net.http_post(
        'https://ivlfsixvfovqitkajyjc.supabase.co/functions/v1/deep-drift-monitor'::text,
        jsonb_build_object('source', 'cron_job', 'timestamp', now()::text),
        '{}'::jsonb,
        jsonb_build_object(
            'Content-Type', 'application/json',
            'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGZzaXh2Zm92cWl0a2FqeWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTUwNjksImV4cCI6MjA2Njc3MTA2OX0.P2E_NOAnUPkNwTNdhSYy9HK6hKPKhGL8IsSkYZgGBek'
        ),
        15000
    );
    $$
);