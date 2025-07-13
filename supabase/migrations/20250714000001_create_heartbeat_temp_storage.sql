-- Migration: Create temporary storage bucket for heartbeat images
-- This bucket will store screenshots and camera snapshots temporarily for Dify analysis

-- Create the temporary storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'heartbeat-temp-media',
    'heartbeat-temp-media',
    true, -- Public bucket for Dify URL access
    5242880, -- 5MB limit per file
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage policy for service role access
CREATE POLICY "Service role can manage heartbeat temp media" ON storage.objects
FOR ALL USING (
    bucket_id = 'heartbeat-temp-media' AND 
    auth.role() = 'service_role'
);

-- Create storage policy for anonymous users (for uploads)
CREATE POLICY "Anonymous users can upload heartbeat temp media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'heartbeat-temp-media'
);

-- Create storage policy for public read access (for Dify)
CREATE POLICY "Public read access for heartbeat temp media" ON storage.objects
FOR SELECT USING (bucket_id = 'heartbeat-temp-media');

-- Add helpful comment
COMMENT ON TABLE storage.buckets IS 'Temporary storage for heartbeat monitoring images - files auto-deleted after 10 minutes'; 