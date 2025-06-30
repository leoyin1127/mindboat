/*
  # Detection Results Storage

  1. New Tables
    - `detection_results`
      - `id` (uuid, primary key)
      - `voyage_id` (uuid, references voyages)
      - `user_id` (uuid, references users)
      - `detection_timestamp` (timestamptz)
      - `combined_analysis_result` (jsonb) - Full AI analysis JSON
      - `combined_confidence_level` (integer)
      - `combined_distraction_detected` (boolean)
      - `combined_distraction_type` (text)
      - `tab_switch_detected` (boolean)
      - `tab_switch_duration_ms` (bigint)
      - `tab_switch_visibility_state` (text)
      - `tab_switch_timestamp` (timestamptz)
      - `detection_type` (text) - 'combined', 'tab_switch', or 'both'

  2. Security
    - Enable RLS on `detection_results` table
    - Add policies for users to manage their own detection results

  3. Indexes
    - Index on voyage_id for fast querying
    - Index on detection_timestamp for time-based queries
    - Index on detection_type for filtering
*/

-- Create detection_results table
CREATE TABLE IF NOT EXISTS detection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id uuid NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  detection_timestamp timestamptz DEFAULT now(),
  
  -- Combined detection (screenshot + camera analysis)
  combined_analysis_result jsonb,
  combined_confidence_level integer,
  combined_distraction_detected boolean DEFAULT false,
  combined_distraction_type text,
  
  -- Tab switch detection
  tab_switch_detected boolean DEFAULT false,
  tab_switch_duration_ms bigint,
  tab_switch_visibility_state text,
  tab_switch_timestamp timestamptz,
  
  -- General metadata
  detection_type text NOT NULL CHECK (detection_type IN ('combined', 'tab_switch', 'both')),
  
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE detection_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own detection results"
  ON detection_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own detection results"
  ON detection_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own detection results"
  ON detection_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own detection results"
  ON detection_results
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_detection_results_voyage_id ON detection_results(voyage_id);
CREATE INDEX IF NOT EXISTS idx_detection_results_user_id ON detection_results(user_id);
CREATE INDEX IF NOT EXISTS idx_detection_results_timestamp ON detection_results(detection_timestamp);
CREATE INDEX IF NOT EXISTS idx_detection_results_type ON detection_results(detection_type);
CREATE INDEX IF NOT EXISTS idx_detection_results_voyage_timestamp ON detection_results(voyage_id, detection_timestamp);

-- Function to get detection results for a voyage
CREATE OR REPLACE FUNCTION get_voyage_detection_results(voyage_id_param uuid)
RETURNS json AS $$
DECLARE
  results json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', dr.id,
      'detection_timestamp', dr.detection_timestamp,
      'detection_type', dr.detection_type,
      'combined_analysis_result', dr.combined_analysis_result,
      'combined_confidence_level', dr.combined_confidence_level,
      'combined_distraction_detected', dr.combined_distraction_detected,
      'combined_distraction_type', dr.combined_distraction_type,
      'tab_switch_detected', dr.tab_switch_detected,
      'tab_switch_duration_ms', dr.tab_switch_duration_ms,
      'tab_switch_visibility_state', dr.tab_switch_visibility_state,
      'tab_switch_timestamp', dr.tab_switch_timestamp
    ) ORDER BY dr.detection_timestamp DESC
  ) INTO results
  FROM detection_results dr
  WHERE dr.voyage_id = voyage_id_param;
  
  RETURN COALESCE(results, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detection summary for a voyage
CREATE OR REPLACE FUNCTION get_voyage_detection_summary(voyage_id_param uuid)
RETURNS json AS $$
DECLARE
  summary json;
BEGIN
  WITH detection_stats AS (
    SELECT 
      COUNT(*) as total_detections,
      COUNT(*) FILTER (WHERE detection_type = 'combined') as combined_detections,
      COUNT(*) FILTER (WHERE detection_type = 'tab_switch') as tab_switch_detections,
      COUNT(*) FILTER (WHERE combined_distraction_detected = true) as combined_distractions,
      COUNT(*) FILTER (WHERE tab_switch_detected = true) as tab_switch_distractions,
      AVG(combined_confidence_level) as avg_confidence,
      MIN(detection_timestamp) as first_detection,
      MAX(detection_timestamp) as last_detection
    FROM detection_results
    WHERE voyage_id = voyage_id_param
  )
  SELECT json_build_object(
    'total_detections', ds.total_detections,
    'combined_detections', ds.combined_detections,
    'tab_switch_detections', ds.tab_switch_detections,
    'combined_distractions_detected', ds.combined_distractions,
    'tab_switch_distractions_detected', ds.tab_switch_distractions,
    'avg_confidence_level', ROUND(COALESCE(ds.avg_confidence, 0)::numeric, 1),
    'detection_period', json_build_object(
      'first_detection', ds.first_detection,
      'last_detection', ds.last_detection
    )
  ) INTO summary
  FROM detection_stats ds;
  
  RETURN COALESCE(summary, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_voyage_detection_results(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_voyage_detection_summary(uuid) TO authenticated;