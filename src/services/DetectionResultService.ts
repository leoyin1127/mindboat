/**
 * Detection Result Service
 * 
 * Handles storing and retrieving detection results from various detection systems
 * (combined analysis, tab switching, etc.) in Supabase.
 */

import { supabase } from '../lib/supabase';
import type { ScreenshotAnalysisResult } from './GeminiService';

export interface DetectionResult {
  id: string;
  voyage_id: string;
  user_id: string;
  detection_timestamp: string;
  detection_type: 'combined' | 'tab_switch' | 'both';
  
  // Combined detection fields
  combined_analysis_result?: ScreenshotAnalysisResult;
  combined_confidence_level?: number;
  combined_distraction_detected?: boolean;
  combined_distraction_type?: string;
  
  // Tab switch detection fields
  tab_switch_detected?: boolean;
  tab_switch_duration_ms?: number;
  tab_switch_visibility_state?: string;
  tab_switch_timestamp?: string;
  
  created_at: string;
}

export interface CombinedDetectionInput {
  voyageId: string;
  userId: string;
  analysisResult: ScreenshotAnalysisResult;
  confidenceLevel: number;
  distractionDetected: boolean;
  distractionType?: string;
}

export interface TabSwitchDetectionInput {
  voyageId: string;
  userId: string;
  detected: boolean;
  durationMs?: number;
  visibilityState: string;
  timestamp: Date;
}

export class DetectionResultService {
  /**
   * Store combined detection result (screenshot + camera analysis)
   */
  static async storeCombinedDetection(input: CombinedDetectionInput): Promise<DetectionResult | null> {
    try {
      const { data, error } = await supabase
        .from('detection_results')
        .insert({
          voyage_id: input.voyageId,
          user_id: input.userId,
          detection_type: 'combined',
          combined_analysis_result: input.analysisResult,
          combined_confidence_level: input.confidenceLevel,
          combined_distraction_detected: input.distractionDetected,
          combined_distraction_type: input.distractionType,
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to store combined detection result:', error);
        return null;
      }

      console.log('✅ Combined detection result stored:', {
        id: data.id,
        distraction: input.distractionDetected,
        type: input.distractionType,
        confidence: input.confidenceLevel
      });

      return data;
    } catch (error) {
      console.error('Error storing combined detection result:', error);
      return null;
    }
  }

  /**
   * Store tab switch detection result
   */
  static async storeTabSwitchDetection(input: TabSwitchDetectionInput): Promise<DetectionResult | null> {
    try {
      const { data, error } = await supabase
        .from('detection_results')
        .insert({
          voyage_id: input.voyageId,
          user_id: input.userId,
          detection_type: 'tab_switch',
          tab_switch_detected: input.detected,
          tab_switch_duration_ms: input.durationMs,
          tab_switch_visibility_state: input.visibilityState,
          tab_switch_timestamp: input.timestamp.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to store tab switch detection result:', error);
        return null;
      }

      console.log('✅ Tab switch detection result stored:', {
        id: data.id,
        detected: input.detected,
        duration: input.durationMs ? `${Math.round(input.durationMs / 1000)}s` : 'N/A',
        state: input.visibilityState
      });

      return data;
    } catch (error) {
      console.error('Error storing tab switch detection result:', error);
      return null;
    }
  }

  /**
   * Get all detection results for a voyage
   */
  static async getVoyageDetectionResults(voyageId: string): Promise<DetectionResult[]> {
    try {
      const { data, error } = await supabase
        .from('detection_results')
        .select('*')
        .eq('voyage_id', voyageId)
        .order('detection_timestamp', { ascending: false });

      if (error) {
        console.warn('Failed to get voyage detection results:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting voyage detection results:', error);
      return [];
    }
  }

  /**
   * Get detection summary for a voyage using the database function
   */
  static async getVoyageDetectionSummary(voyageId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_voyage_detection_summary', { voyage_id_param: voyageId });

      if (error) {
        console.warn('Failed to get voyage detection summary:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting voyage detection summary:', error);
      return null;
    }
  }

  /**
   * Get recent combined detection results for analysis
   */
  static async getRecentCombinedDetections(
    voyageId: string, 
    limitMinutes: number = 30
  ): Promise<DetectionResult[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - limitMinutes);

      const { data, error } = await supabase
        .from('detection_results')
        .select('*')
        .eq('voyage_id', voyageId)
        .eq('detection_type', 'combined')
        .gte('detection_timestamp', cutoffTime.toISOString())
        .order('detection_timestamp', { ascending: false });

      if (error) {
        console.warn('Failed to get recent combined detections:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent combined detections:', error);
      return [];
    }
  }

  /**
   * Get tab switch detection patterns for analysis
   */
  static async getTabSwitchPatterns(voyageId: string): Promise<{
    totalSwitches: number;
    averageDuration: number;
    switchFrequency: number; // switches per hour
  }> {
    try {
      const { data, error } = await supabase
        .from('detection_results')
        .select('tab_switch_duration_ms, detection_timestamp')
        .eq('voyage_id', voyageId)
        .eq('detection_type', 'tab_switch')
        .eq('tab_switch_detected', true)
        .order('detection_timestamp', { ascending: true });

      if (error || !data || data.length === 0) {
        return { totalSwitches: 0, averageDuration: 0, switchFrequency: 0 };
      }

      const totalSwitches = data.length;
      const durations = data
        .map(d => d.tab_switch_duration_ms)
        .filter(d => d && d > 0);
      const averageDuration = durations.length > 0 
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
        : 0;

      // Calculate frequency (switches per hour)
      const firstSwitch = new Date(data[0].detection_timestamp);
      const lastSwitch = new Date(data[data.length - 1].detection_timestamp);
      const timeSpanHours = (lastSwitch.getTime() - firstSwitch.getTime()) / (1000 * 60 * 60);
      const switchFrequency = timeSpanHours > 0 ? totalSwitches / timeSpanHours : 0;

      return {
        totalSwitches,
        averageDuration,
        switchFrequency
      };
    } catch (error) {
      console.error('Error getting tab switch patterns:', error);
      return { totalSwitches: 0, averageDuration: 0, switchFrequency: 0 };
    }
  }

  /**
   * Clean up old detection results (for privacy/storage management)
   */
  static async cleanupOldDetectionResults(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await supabase
        .from('detection_results')
        .delete()
        .lt('detection_timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.warn('Failed to cleanup old detection results:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old detection results`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old detection results:', error);
      return 0;
    }
  }
}