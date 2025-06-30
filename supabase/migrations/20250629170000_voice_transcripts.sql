/*
  # Voice Transcript System for Continuous Journey Recording

  1. New Tables
    - `voice_transcripts` - Stores continuous voice recording transcripts
    - `voice_analysis` - Stores AI analysis of transcripts for journey insights
  
  2. Purpose
    - Enable continuous voice recording during voyages
    - Store transcripts with timestamps for full journey reconstruction
    - Analyze transcripts to generate insights about user's work patterns
  
  3. Privacy & Security
    - All voice data is encrypted and user-controlled
    - Users can enable/disable recording per voyage
    - Transcripts can be deleted individually or in bulk
    - RLS policies ensure data isolation
*/

-- Create voice transcripts table for continuous recording
CREATE TABLE IF NOT EXISTS voice_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id uuid NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
  segment_number integer NOT NULL,
  transcript_text text NOT NULL,
  confidence_score real DEFAULT 0.0,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_seconds integer NOT NULL,
  is_interim boolean DEFAULT false,
  is_user_speech boolean DEFAULT true, -- false for system sounds, environment noise
  created_at timestamptz DEFAULT now(),
  
  -- Ensure segments are ordered properly per voyage
  UNIQUE(voyage_id, segment_number)
);

-- Create voice analysis table for storing AI insights
CREATE TABLE IF NOT EXISTS voice_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id uuid NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('journey_summary', 'work_patterns', 'achievements', 'mood_analysis', 'productivity_insights')),
  analysis_data jsonb NOT NULL,
  confidence_score real DEFAULT 0.0,
  generated_at timestamptz DEFAULT now(),
  
  -- Allow multiple analysis types per voyage
  UNIQUE(voyage_id, analysis_type)
);

-- Add voice recording settings to voyages table
DO $$
BEGIN
  -- Add voice_recording_enabled if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'voice_recording_enabled'
  ) THEN
    ALTER TABLE voyages ADD COLUMN voice_recording_enabled boolean DEFAULT false;
  END IF;

  -- Add total_transcript_duration if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'total_transcript_duration'
  ) THEN
    ALTER TABLE voyages ADD COLUMN total_transcript_duration integer DEFAULT 0;
  END IF;

  -- Add transcript_confidence_avg if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'transcript_confidence_avg'
  ) THEN
    ALTER TABLE voyages ADD COLUMN transcript_confidence_avg real DEFAULT 0.0;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_transcripts
DROP POLICY IF EXISTS "Users can manage voice transcripts for own voyages" ON voice_transcripts;
CREATE POLICY "Users can manage voice transcripts for own voyages"
  ON voice_transcripts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM voyages 
      WHERE voyages.id = voice_transcripts.voyage_id 
      AND voyages.user_id = auth.uid()
    )
  );

-- RLS Policies for voice_analysis
DROP POLICY IF EXISTS "Users can manage voice analysis for own voyages" ON voice_analysis;
CREATE POLICY "Users can manage voice analysis for own voyages"
  ON voice_analysis FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM voyages 
      WHERE voyages.id = voice_analysis.voyage_id 
      AND voyages.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_voyage_id ON voice_transcripts(voyage_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_start_time ON voice_transcripts(start_time);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_voyage_segment ON voice_transcripts(voyage_id, segment_number);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_is_user_speech ON voice_transcripts(is_user_speech);

CREATE INDEX IF NOT EXISTS idx_voice_analysis_voyage_id ON voice_analysis(voyage_id);
CREATE INDEX IF NOT EXISTS idx_voice_analysis_type ON voice_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_voice_analysis_generated_at ON voice_analysis(generated_at);

-- Function to get complete voice transcript for a voyage
CREATE OR REPLACE FUNCTION get_voyage_voice_transcript(voyage_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if voyage exists and belongs to current user
  IF NOT EXISTS (
    SELECT 1 FROM voyages 
    WHERE id = voyage_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Voyage not found or access denied';
  END IF;

  -- Get complete transcript with segments
  SELECT json_build_object(
    'voyage_id', voyage_id_param,
    'recording_enabled', COALESCE(v.voice_recording_enabled, false),
    'total_duration', COALESCE(v.total_transcript_duration, 0),
    'avg_confidence', COALESCE(v.transcript_confidence_avg, 0.0),
    'segments', COALESCE(segments.transcript_segments, '[]'::json),
    'full_text', COALESCE(segments.full_transcript, ''),
    'word_count', COALESCE(segments.word_count, 0)
  )
  INTO result
  FROM voyages v
  LEFT JOIN (
    SELECT 
      voyage_id,
      json_agg(
        json_build_object(
          'id', id,
          'segment_number', segment_number,
          'transcript_text', transcript_text,
          'confidence_score', confidence_score,
          'start_time', start_time,
          'end_time', end_time,
          'duration_seconds', duration_seconds,
          'is_user_speech', is_user_speech
        )
        ORDER BY segment_number
      ) as transcript_segments,
      string_agg(
        CASE WHEN is_user_speech THEN transcript_text ELSE '' END, 
        ' ' 
        ORDER BY segment_number
      ) as full_transcript,
      array_length(
        string_to_array(
          string_agg(
            CASE WHEN is_user_speech THEN transcript_text ELSE '' END, 
            ' ' 
            ORDER BY segment_number
          ), 
          ' '
        ), 
        1
      ) as word_count
    FROM voice_transcripts 
    WHERE voyage_id = voyage_id_param
    GROUP BY voyage_id
  ) segments ON v.id = segments.voyage_id
  WHERE v.id = voyage_id_param;

  RETURN result;
END;
$$;

-- Function to get voice analysis for a voyage
CREATE OR REPLACE FUNCTION get_voyage_voice_analysis(voyage_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if voyage exists and belongs to current user
  IF NOT EXISTS (
    SELECT 1 FROM voyages 
    WHERE id = voyage_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Voyage not found or access denied';
  END IF;

  -- Get all analysis data
  SELECT COALESCE(
    json_object_agg(
      analysis_type,
      json_build_object(
        'data', analysis_data,
        'confidence', confidence_score,
        'generated_at', generated_at
      )
    ),
    '{}'::json
  )
  INTO result
  FROM voice_analysis
  WHERE voyage_id = voyage_id_param;

  RETURN result;
END;
$$;

-- Function to clean up old voice data (privacy compliance)
CREATE OR REPLACE FUNCTION cleanup_voice_data(days_old integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete voice transcripts older than specified days for completed voyages
  WITH deleted_transcripts AS (
    DELETE FROM voice_transcripts 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND EXISTS (
      SELECT 1 FROM voyages 
      WHERE voyages.id = voice_transcripts.voyage_id 
      AND voyages.status = 'completed'
      AND voyages.end_time < NOW() - INTERVAL '1 day' * days_old
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_transcripts;

  -- Delete corresponding analysis data
  DELETE FROM voice_analysis 
  WHERE generated_at < NOW() - INTERVAL '1 day' * days_old
  AND EXISTS (
    SELECT 1 FROM voyages 
    WHERE voyages.id = voice_analysis.voyage_id 
    AND voyages.status = 'completed'
    AND voyages.end_time < NOW() - INTERVAL '1 day' * days_old
  );

  RETURN deleted_count;
END;
$$; 