-- Migration: Remove temporary storage bucket for heartbeat images as it's no longer needed.
-- This change is part of moving to a direct image-to-API workflow.

-- Drop policies associated with the bucket first to avoid dependency errors.
-- Using 'IF EXISTS' makes the script resilient.
DROP POLICY IF EXISTS "Public read access for heartbeat temp media" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload heartbeat temp media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage heartbeat temp media" ON storage.objects;

-- Finally, delete the bucket itself.
DELETE FROM storage.buckets WHERE id = 'heartbeat-temp-media'; 