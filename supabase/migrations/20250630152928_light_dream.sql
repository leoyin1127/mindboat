/*
  # High Precision Timing and Enhanced Distraction Types - Fixed Migration

  1. Schema Changes
    - Add `actual_duration_ms` (bigint) for millisecond precision timing
    - Add `planned_duration_ms` (bigint) for millisecond precision planning
    - Keep existing columns for backward compatibility
    - Fix enhanced distraction type constraints

  2. Enhanced Distraction Types
    - More granular distraction categorization
    - Better analysis and reporting capabilities

  3. Functions
    - Update statistics calculation to use high precision
    - Maintain backward compatibility with existing data
*/

-- Add high precision timing columns to voyages table
DO $$
BEGIN
  -- Add actual_duration_ms for millisecond precision
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'actual_duration_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN actual_duration_ms bigint;
  END IF;

  -- Add planned_duration_ms for millisecond precision  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'planned_duration_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN planned_duration_ms bigint;
  END IF;

  -- Add start_time_precise for high precision start timing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voyages' AND column_name = 'start_time_precise_ms'
  ) THEN
    ALTER TABLE voyages ADD COLUMN start_time_precise_ms bigint;
  END IF;
END $$;

-- Clean up existing data to conform to new constraint
-- Convert any invalid distraction types to 'tab_switch'
UPDATE distraction_events 
SET type = 'tab_switch' 
WHERE type NOT IN (
  -- Tab/Window Management
  'tab_switch', 'window_switch', 'new_tab_opened', 'tab_closed',
  -- Content-Based Distractions  
  'social_media', 'entertainment', 'shopping', 'news_browsing', 'irrelevant_browsing',
  -- Physical/Camera Distractions
  'camera_absence', 'looking_away', 'phone_usage', 'eating_drinking', 'conversation',
  -- Activity-Based
  'idle', 'extended_break', 'task_switching',
  -- Environmental
  'notification_popup', 'external_interruption',
  -- Legacy types for backward compatibility
  'camera_distraction', 'blacklisted_content'
);

-- Update distraction_events type constraint to include enhanced types
ALTER TABLE distraction_events DROP CONSTRAINT IF EXISTS distraction_events_type_check;
ALTER TABLE distraction_events DROP CONSTRAINT IF EXISTS enhanced_distraction_types_check;

-- Add comprehensive distraction type constraint
ALTER TABLE distraction_events ADD CONSTRAINT enhanced_distraction_types_check 
  CHECK (type IN (
    -- Tab/Window Management
    'tab_switch',           -- User switched to different tab
    'window_switch',        -- User switched to different application
    'new_tab_opened',       -- User opened a new tab
    'tab_closed',           -- User closed current tab
    
    -- Content-Based Distractions  
    'social_media',         -- Detected social media usage
    'entertainment',        -- Video streaming, gaming, etc.
    'shopping',            -- Online shopping sites
    'news_browsing',       -- News websites
    'irrelevant_browsing', -- General off-topic browsing
    
    -- Physical/Camera Distractions
    'camera_absence',       -- User not visible in camera
    'looking_away',        -- User looking away from screen
    'phone_usage',         -- User using mobile device
    'eating_drinking',     -- User eating or drinking
    'conversation',        -- User talking to someone
    
    -- Activity-Based
    'idle',                -- No activity detected
    'extended_break',      -- Long break period
    'task_switching',      -- Switching between work tasks
    
    -- Environmental
    'notification_popup',   -- Notification interrupted focus
    'external_interruption', -- External interruption detected
    
    -- Legacy types for backward compatibility
    'camera_distraction',
    'blacklisted_content'
  ));

-- Function to get precise duration from voyage
CREATE OR REPLACE FUNCTION get_voyage_precise_duration(voyage_id_param uuid)
RETURNS bigint AS $$
DECLARE
  precise_duration bigint;
  fallback_duration bigint;
BEGIN
  -- Try to get high precision duration first
  SELECT actual_duration_ms INTO precise_duration
  FROM voyages 
  WHERE id = voyage_id_param;
  
  -- If precise duration is not available, calculate from actual_duration (minutes)
  IF precise_duration IS NULL THEN
    SELECT COALESCE(actual_duration, 0) * 60000 INTO fallback_duration
    FROM voyages 
    WHERE id = voyage_id_param;
    
    RETURN COALESCE(fallback_duration, 0);
  END IF;
  
  RETURN COALESCE(precise_duration, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced statistics calculation with high precision
CREATE OR REPLACE FUNCTION calculate_voyage_statistics_precise(voyage_id_param uuid)
RETURNS void AS $$
DECLARE
  v_total_distraction_time integer := 0;
  v_distraction_count integer := 0;
  v_avg_duration real := 0;
  v_return_count integer := 0;
  v_most_common_type text;
  v_focus_score integer;
  v_voyage_duration_ms bigint;
BEGIN
  -- Get precise voyage duration in milliseconds
  SELECT get_voyage_precise_duration(voyage_id_param) INTO v_voyage_duration_ms;

  -- Count total distraction events and calculate effective durations
  WITH effective_durations AS (
    SELECT 
      CASE 
        WHEN duration_seconds IS NOT NULL AND duration_seconds > 0 THEN duration_seconds
        WHEN is_resolved = false THEN 30
        ELSE 0
      END as effective_duration,
      user_response,
      type
    FROM distraction_events 
    WHERE voyage_id = voyage_id_param
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(effective_duration), 0),
    COALESCE(AVG(effective_duration), 0),
    COUNT(*) FILTER (WHERE user_response = 'return_to_course')
  INTO v_distraction_count, v_total_distraction_time, v_avg_duration, v_return_count
  FROM effective_durations;

  -- Find most common distraction type
  SELECT type INTO v_most_common_type
  FROM distraction_events 
  WHERE voyage_id = voyage_id_param
  GROUP BY type 
  ORDER BY COUNT(*) DESC 
  LIMIT 1;

  -- Calculate focus quality score using precise duration
  IF v_voyage_duration_ms > 0 THEN
    -- Convert voyage duration to seconds for comparison
    v_focus_score := 100 
      - LEAST(50, v_distraction_count * 5)  -- Max 50 points for frequency
      - LEAST(50, ROUND((v_total_distraction_time::real / (v_voyage_duration_ms::real / 1000)) * 100)); -- Max 50 points for time lost
    
    -- Ensure score is between 0 and 100
    v_focus_score := GREATEST(0, LEAST(100, v_focus_score));
  ELSE
    v_focus_score := 100;
  END IF;

  -- Update voyage with calculated statistics
  UPDATE voyages SET
    distraction_count = v_distraction_count,
    total_distraction_time = v_total_distraction_time,
    focus_quality_score = v_focus_score,
    avg_distraction_duration = v_avg_duration,
    return_to_course_rate = CASE 
      WHEN v_distraction_count > 0 THEN (v_return_count::real / v_distraction_count * 100)
      ELSE 100
    END,
    most_common_distraction = v_most_common_type
  WHERE id = voyage_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced assessment data function with precision timing
CREATE OR REPLACE FUNCTION get_voyage_assessment_data_precise(voyage_id_param uuid)
RETURNS json AS $$
DECLARE
  voyage_data json;
  distraction_data json;
  exploration_data json;
  assessment_data json;
  precise_duration bigint;
  planned_duration_precise bigint;
BEGIN
  -- Get precise durations
  SELECT 
    get_voyage_precise_duration(voyage_id_param),
    COALESCE(planned_duration_ms, planned_duration * 60000, 0)
  INTO precise_duration, planned_duration_precise;

  -- Get main voyage data with destination and precise timing
  SELECT json_build_object(
    'voyage', json_build_object(
      'id', v.id,
      'user_id', v.user_id,
      'destination_id', v.destination_id,
      'start_time', v.start_time,
      'end_time', v.end_time,
      'planned_duration', v.planned_duration,
      'actual_duration', v.actual_duration,
      'planned_duration_ms', planned_duration_precise,
      'actual_duration_ms', precise_duration,
      'distraction_count', v.distraction_count,
      'status', v.status,
      'weather_mood', v.weather_mood,
      'created_at', v.created_at,
      'total_distraction_time', v.total_distraction_time,
      'focus_quality_score', v.focus_quality_score,
      'avg_distraction_duration', v.avg_distraction_duration,
      'return_to_course_rate', v.return_to_course_rate,
      'most_common_distraction', v.most_common_distraction
    ),
    'destination', row_to_json(d.*)
  ) INTO voyage_data
  FROM voyages v
  LEFT JOIN destinations d ON v.destination_id = d.id
  WHERE v.id = voyage_id_param;

  -- Get distraction events summary with enhanced types
  WITH distraction_events_with_duration AS (
    SELECT 
      *,
      CASE 
        WHEN duration_seconds IS NOT NULL AND duration_seconds > 0 THEN duration_seconds
        WHEN is_resolved = false THEN 30
        ELSE 0
      END as effective_duration
    FROM distraction_events 
    WHERE voyage_id = voyage_id_param
  ),
  distraction_summary AS (
    SELECT 
      COUNT(*) as total_count,
      COALESCE(SUM(effective_duration), 0) as total_time,
      CASE 
        WHEN COUNT(*) > 0 THEN AVG(effective_duration)
        ELSE 0 
      END as avg_duration,
      COALESCE(
        (COUNT(*) FILTER (WHERE user_response = 'return_to_course')::real / NULLIF(COUNT(*), 0) * 100),
        0
      ) as return_rate
    FROM distraction_events_with_duration
  ),
  distraction_types AS (
    SELECT COALESCE(json_object_agg(type, count), '{}'::json) as by_type
    FROM (
      SELECT type, COUNT(*) as count
      FROM distraction_events_with_duration
      GROUP BY type
    ) t
  )
  SELECT json_build_object(
    'events', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', de.id,
          'type', de.type,
          'detected_at', de.detected_at,
          'duration_seconds', de.effective_duration,
          'user_response', de.user_response,
          'position_x', de.position_x,
          'position_y', de.position_y,
          'context_url', de.context_url,
          'is_resolved', de.is_resolved
        ) ORDER BY de.detected_at
      ) FROM distraction_events_with_duration de),
      '[]'::json
    ),
    'summary', json_build_object(
      'total_count', ds.total_count,
      'by_type', dt.by_type,
      'total_time', ds.total_time,
      'avg_duration', ROUND(ds.avg_duration::numeric, 1),
      'return_rate', ROUND(ds.return_rate::numeric, 1)
    )
  ) INTO distraction_data
  FROM distraction_summary ds
  CROSS JOIN distraction_types dt;

  -- Get exploration notes
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', en.id,
        'content', en.content,
        'type', en.type,
        'created_at', en.created_at
      ) ORDER BY en.created_at
    ),
    '[]'::json
  ) INTO exploration_data
  FROM exploration_notes en
  WHERE en.voyage_id = voyage_id_param;

  -- Combine all data
  SELECT json_build_object(
    'voyage', voyage_data,
    'distractions', distraction_data,
    'exploration_notes', exploration_data
  ) INTO assessment_data;

  RETURN assessment_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_voyages_actual_duration_ms ON voyages(actual_duration_ms);
CREATE INDEX IF NOT EXISTS idx_voyages_planned_duration_ms ON voyages(planned_duration_ms);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_voyage_precise_duration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_voyage_statistics_precise(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_voyage_assessment_data_precise(uuid) TO authenticated;