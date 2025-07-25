-- Migration: Add heartbeat-images storage bucket and cleanup system
-- Date: 2025-01-14
-- Purpose: Setup temporary storage for session heartbeat images

-- Step 1: Create the heartbeat-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('heartbeat-images', 'heartbeat-images', true, 5242880, '{"image/png", "image/jpeg"}')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Configure bucket access policies (RLS)
-- Allow Dify and other services to read images via public URL
CREATE POLICY "Public read access for heartbeat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'heartbeat-images');

-- Allow users to upload their own session images
CREATE POLICY "Authenticated users can upload heartbeat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'heartbeat-images');

-- Allow service role to manage heartbeat images (for cleanup and admin tasks)
CREATE POLICY "Service role can manage heartbeat images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'heartbeat-images');

-- Step 3: Implement automatic file cleanup
-- Create the cleanup function
CREATE OR REPLACE FUNCTION delete_old_heartbeat_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial for granting necessary permissions
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'heartbeat-images'
  AND created_at < (NOW() - INTERVAL '1 day');
  
  -- Log cleanup activity
  RAISE NOTICE 'Cleaned up heartbeat images older than 24 hours';
END;
$$;

-- Schedule the function to run daily at midnight UTC
-- Note: This requires pg_cron extension to be enabled
SELECT cron.schedule(
  'daily-heartbeat-cleanup',
  '0 0 * * *', -- Cron syntax for every day at midnight
  'SELECT delete_old_heartbeat_images()'
);

-- Step 4: Grant necessary permissions for cleanup function
-- Grant usage on storage schema to the function
GRANT USAGE ON SCHEMA storage TO postgres;
GRANT ALL ON storage.objects TO postgres;
GRANT ALL ON storage.buckets TO postgres; 