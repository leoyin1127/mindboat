export interface User {
  id: string;
  email: string;
  lighthouse_goal?: string;
  created_at: string;
  updated_at: string;
}

export interface Destination {
  id: string;
  user_id: string;
  original_task: string;
  destination_name: string;
  description: string;
  related_apps: string[];
  color_theme: string;
  created_at: string;
}

export interface Voyage {
  id: string;
  user_id: string;
  destination_id: string;
  destination?: Destination;
  start_time: string;
  end_time?: string;
  planned_duration?: number; // minutes
  actual_duration?: number; // minutes
  distraction_count: number;
  status: 'active' | 'completed' | 'abandoned';
  weather_mood: string;
  created_at: string;
  // Voice recording fields
  voice_recording_enabled?: boolean;
  total_transcript_duration?: number; // seconds
  transcript_confidence_avg?: number;
  // Millisecond precision fields
  planned_duration_ms?: number; // milliseconds
  actual_duration_ms?: number; // milliseconds
  start_time_precise_ms?: number; // milliseconds since epoch
  precision_level?: 'millisecond' | 'second' | 'minute';
}

export interface DistractionEvent {
  id: string;
  voyage_id: string;
  detected_at: string;
  duration_seconds?: number;
  type: 'tab_switch' | 'idle' | 'camera_distraction';
  user_response?: 'return_to_course' | 'exploring' | 'ignored';
}

export interface DailyReflection {
  id: string;
  user_id: string;
  date: string;
  reflection_text?: string;
  total_focus_time: number; // minutes
  voyage_count: number;
  generated_at: string;
}

export interface DistractionDetectionEvent {
  type: 'tab_switch' | 'window_switch' | 'new_tab_opened' | 'tab_closed' |
  'social_media' | 'entertainment' | 'shopping' | 'news_browsing' | 'irrelevant_browsing' |
  'camera_absence' | 'looking_away' | 'phone_usage' | 'eating_drinking' | 'conversation' |
  'idle' | 'extended_break' | 'task_switching' |
  'notification_popup' | 'external_interruption' |
  'camera_distraction' | 'blacklisted_content'; // Legacy types
  timestamp: number;
  duration?: number;
}

export interface PermissionState {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
}

// Voice Transcript Interfaces
export interface VoiceTranscriptSegment {
  id: string;
  voyage_id: string;
  segment_number: number;
  transcript_text: string;
  confidence_score: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  is_interim: boolean;
  is_user_speech: boolean;
  created_at: string;
}

export interface VoiceTranscriptData {
  voyage_id: string;
  recording_enabled: boolean;
  total_duration: number; // seconds
  avg_confidence: number;
  segments: VoiceTranscriptSegment[];
  full_text: string;
  word_count: number;
}

export interface VoiceAnalysisData {
  journey_summary?: {
    data: {
      key_achievements: string[];
      main_activities: string[];
      work_patterns: string[];
      challenges_discussed: string[];
      breakthrough_moments: string[];
      total_speaking_time: number;
      words_spoken: number;
    };
    confidence: number;
    generated_at: string;
  };
  work_patterns?: {
    data: {
      focus_periods: Array<{
        start_time: string;
        duration: number;
        activity_type: string;
        confidence: number;
      }>;
      break_patterns: Array<{
        time: string;
        duration: number;
        type: string;
      }>;
      peak_productivity_times: string[];
      communication_frequency: number;
    };
    confidence: number;
    generated_at: string;
  };
  achievements?: {
    data: {
      completed_tasks: string[];
      progress_made: string[];
      learnings: string[];
      decisions_made: string[];
      problems_solved: string[];
      skills_practiced: string[];
    };
    confidence: number;
    generated_at: string;
  };
  mood_analysis?: {
    data: {
      overall_mood: 'positive' | 'neutral' | 'negative' | 'mixed';
      energy_levels: Array<{
        time: string;
        level: 'high' | 'medium' | 'low';
        indicators: string[];
      }>;
      frustration_points: string[];
      excitement_moments: string[];
      stress_indicators: string[];
      satisfaction_level: number; // 1-10
    };
    confidence: number;
    generated_at: string;
  };
  productivity_insights?: {
    data: {
      most_productive_activities: string[];
      time_allocation: Record<string, number>;
      interruption_patterns: Array<{
        time: string;
        type: string;
        impact: 'low' | 'medium' | 'high';
      }>;
      suggestions: string[];
      efficiency_score: number; // 1-100
    };
    confidence: number;
    generated_at: string;
  };
}

export interface VoiceRecordingSettings {
  enabled: boolean;
  continuous: boolean;
  saveTranscripts: boolean;
  autoAnalyze: boolean;
  privacyMode: boolean; // Anonymize transcripts
  retentionDays: number; // How long to keep data
}