-- Add min-d specific tables for enhanced functionality

-- Spline interaction events
CREATE TABLE IF NOT EXISTS spline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('welcome', 'journey', 'goals', 'sailing_summary')),
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced user preferences for min-d interface
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  interface_preferences JSONB DEFAULT '{
    "theme": "ocean",
    "voice_enabled": true,
    "spline_interactions": true,
    "distraction_sensitivity": "medium",
    "ambient_sounds": true
  }';

-- Voice recordings table
CREATE TABLE IF NOT EXISTS voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voyage_id UUID REFERENCES voyages(id) ON DELETE CASCADE,
  recording_type TEXT NOT NULL CHECK (recording_type IN ('intention', 'reflection', 'inspiration')),
  file_path TEXT,
  duration_seconds INTEGER,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced voyage data for min-d
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS
  visual_state TEXT DEFAULT 'sailing' CHECK (visual_state IN ('sailing', 'distracted', 'exploring', 'resting'));

ALTER TABLE voyages ADD COLUMN IF NOT EXISTS
  encouragement_message TEXT;

ALTER TABLE voyages ADD COLUMN IF NOT EXISTS
  spline_interaction_data JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spline_events_user_id ON spline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_spline_events_type ON spline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_voyage_id ON voice_recordings(voyage_id);

-- RLS Policies
ALTER TABLE spline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own spline events
CREATE POLICY "Users can manage own spline events" ON spline_events
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own voice recordings
CREATE POLICY "Users can manage own voice recordings" ON voice_recordings
  FOR ALL USING (auth.uid() = user_id);