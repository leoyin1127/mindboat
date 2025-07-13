-- Fix voice_thoughts table to make audio_url nullable
-- This allows Web Speech API usage without requiring audio file uploads

ALTER TABLE voice_thoughts 
ALTER COLUMN audio_url DROP NOT NULL;
