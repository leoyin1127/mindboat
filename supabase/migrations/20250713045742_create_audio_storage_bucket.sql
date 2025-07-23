-- Create audio storage bucket for voice recordings
-- This is required for voice_thoughts functionality

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio bucket
-- Note: Using public bucket for anonymous auth

-- Allow anyone to upload audio files to the public bucket
CREATE POLICY "Anyone can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'audio');

-- Allow anyone to read audio files from the public bucket
CREATE POLICY "Anyone can read audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'audio');

-- Allow anyone to delete audio files from the public bucket
CREATE POLICY "Anyone can delete audio files" ON storage.objects
FOR DELETE USING (bucket_id = 'audio');
