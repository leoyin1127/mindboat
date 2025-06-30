/*
  # Add High-Precision Timing Columns to Voyages Table

  1. New Columns
    - `planned_duration_ms` (bigint) - Planned duration in milliseconds for high precision
    - `actual_duration_ms` (bigint) - Actual duration in milliseconds for high precision  
    - `start_time_precise_ms` (bigint) - High precision start time in milliseconds since epoch
    - `precision_level` (text) - Indicates the precision level of the timing data

  2. Updates
    - Add check constraint for precision_level values
    - Add indexes for performance on new columns

  3. Notes
    - These columns enable sub-second precision timing for better voyage analytics
    - Existing data will continue to work with minute-level precision
    - New voyages can optionally use high-precision timing
*/

-- Add high-precision timing columns to voyages table
DO $$
BEGIN
  -- Add planned_duration_ms column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voyages' AND column_name = 'planned_duration_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN planned_duration_ms bigint;
  END IF;

  -- Add actual_duration_ms column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voyages' AND column_name = 'actual_duration_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN actual_duration_ms bigint;
  END IF;

  -- Add start_time_precise_ms column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voyages' AND column_name = 'start_time_precise_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN start_time_precise_ms bigint;
  END IF;

  -- Add precision_level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voyages' AND column_name = 'precision_level'
  ) THEN
    ALTER TABLE voyages ADD COLUMN precision_level text DEFAULT 'minute';
  END IF;
END $$;

-- Add check constraint for precision_level if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'voyages_precision_level_check'
  ) THEN
    ALTER TABLE voyages ADD CONSTRAINT voyages_precision_level_check 
    CHECK (precision_level IN ('millisecond', 'second', 'minute'));
  END IF;
END $$;

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_voyages_planned_duration_ms ON voyages(planned_duration_ms);
CREATE INDEX IF NOT EXISTS idx_voyages_actual_duration_ms ON voyages(actual_duration_ms);
CREATE INDEX IF NOT EXISTS idx_voyages_precision_level ON voyages(precision_level);

-- Create or replace the get_voyage_assessment_data_precise function
CREATE OR REPLACE FUNCTION get_voyage_assessment_data_precise(voyage_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  voyage_data jsonb;
  distraction_data jsonb;
  exploration_data jsonb;
BEGIN
  -- Get voyage data with destination
  SELECT jsonb_build_object(
    'voyage', row_to_json(v.*),
    'destination', row_to_json(d.*)
  ) INTO voyage_data
  FROM voyages v
  LEFT JOIN destinations d ON v.destination_id = d.id
  WHERE v.id = voyage_id_param;

  -- Get distraction events and summary
  WITH distraction_events AS (
    SELECT 
      id,
      type,
      detected_at,
      duration_seconds,
      user_response,
      position_x,
      position_y,
      context_url,
      is_resolved
    FROM distraction_events 
    WHERE voyage_id = voyage_id_param
    ORDER BY detected_at
  ),
  distraction_summary AS (
    SELECT 
      COUNT(*) as total_count,
      jsonb_object_agg(type, type_count) as by_type,
      COALESCE(SUM(duration_seconds), 0) as total_time,
      COALESCE(AVG(duration_seconds), 0) as avg_duration,
      COALESCE(
        COUNT(*) FILTER (WHERE user_response = 'return_to_course')::float / 
        NULLIF(COUNT(*), 0) * 100, 
        0
      ) as return_rate
    FROM (
      SELECT 
        type,
        duration_seconds,
        user_response,
        COUNT(*) OVER (PARTITION BY type) as type_count
      FROM distraction_events 
      WHERE voyage_id = voyage_id_param
    ) grouped
  )
  SELECT jsonb_build_object(
    'events', COALESCE(jsonb_agg(row_to_json(de.*)), '[]'::jsonb),
    'summary', row_to_json(ds.*)
  ) INTO distraction_data
  FROM distraction_events de
  CROSS JOIN distraction_summary ds;

  -- Get exploration notes
  SELECT COALESCE(jsonb_agg(row_to_json(en.*)), '[]'::jsonb) INTO exploration_data
  FROM exploration_notes en
  WHERE en.voyage_id = voyage_id_param
  ORDER BY en.created_at;

  -- Combine all data
  result := jsonb_build_object(
    'voyage', voyage_data,
    'distractions', distraction_data,
    'exploration_notes', exploration_data
  );

  RETURN result;
END;
$$;

-- Create or replace the calculate_voyage_statistics_precise function
CREATE OR REPLACE FUNCTION calculate_voyage_statistics_precise(voyage_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record voyages%ROWTYPE;
  distraction_stats record;
  focus_score integer;
  total_distraction_time integer;
  avg_distraction_duration real;
  return_to_course_rate real;
  most_common_distraction text;
BEGIN
  -- Get voyage record
  SELECT * INTO v_record FROM voyages WHERE id = voyage_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voyage not found: %', voyage_id_param;
  END IF;

  -- Calculate distraction statistics
  SELECT 
    COUNT(*) as distraction_count,
    COALESCE(SUM(duration_seconds), 0) as total_distraction_time,
    COALESCE(AVG(duration_seconds), 0) as avg_distraction_duration,
    COALESCE(
      COUNT(*) FILTER (WHERE user_response = 'return_to_course')::float / 
      NULLIF(COUNT(*), 0) * 100, 
      0
    ) as return_to_course_rate,
    MODE() WITHIN GROUP (ORDER BY type) as most_common_distraction
  INTO distraction_stats
  FROM distraction_events 
  WHERE voyage_id = voyage_id_param;

  -- Calculate focus quality score (0-100)
  -- Base score starts at 100, subtract points for distractions
  focus_score := 100;
  
  IF distraction_stats.distraction_count > 0 THEN
    -- Subtract points based on distraction frequency and duration
    focus_score := focus_score - LEAST(50, distraction_stats.distraction_count * 5);
    
    -- Subtract additional points for long distractions
    IF distraction_stats.avg_distraction_duration > 60 THEN
      focus_score := focus_score - LEAST(30, (distraction_stats.avg_distraction_duration - 60) / 10);
    END IF;
    
    -- Add back points for good return-to-course rate
    focus_score := focus_score + (distraction_stats.return_to_course_rate * 0.2);
  END IF;
  
  focus_score := GREATEST(0, LEAST(100, focus_score));

  -- Update voyage with calculated statistics
  UPDATE voyages SET
    distraction_count = distraction_stats.distraction_count,
    total_distraction_time = distraction_stats.total_distraction_time,
    avg_distraction_duration = distraction_stats.avg_distraction_duration,
    return_to_course_rate = distraction_stats.return_to_course_rate,
    most_common_distraction = distraction_stats.most_common_distraction,
    focus_quality_score = focus_score
  WHERE id = voyage_id_param;

END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_voyage_assessment_data_precise(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_voyage_statistics_precise(uuid) TO authenticated;