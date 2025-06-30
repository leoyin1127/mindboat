import React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, AlertTriangle, MapPin, ArrowRight, Loader2, TrendingUp, Target, Mic } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { VoiceAnalysis } from './VoiceAnalysis';
import { formatPreciseDuration } from '../../utils/precisionTimer';
import { supabase } from '../../lib/supabase';
import type { Destination } from '../../types';

interface VoyageCompleteProps {
  voyageId: string;
  onContinue: () => void;
}

interface VoyageAssessmentData {
  voyage: {
    voyage: {
      id: string;
      actual_duration: number;
      distraction_count: number;
      planned_duration: number;
      focus_quality_score: number;
      total_distraction_time: number;
      avg_distraction_duration: number;
      return_to_course_rate: number;
      most_common_distraction: string;
      status: string;
      created_at: string;
    };
    destination: Destination;
  };
  distractions: {
    events: Array<{
      id: string;
      type: string;
      detected_at: string;
      duration_seconds: number;
      user_response: string;
      position_x: number;
      position_y: number;
      context_url: string;
      is_resolved: boolean;
    }>;
    summary: {
      total_count: number;
      by_type: Record<string, number>;
      total_time: number;
      avg_duration: number;
      return_rate: number;
    };
  };
  exploration_notes: Array<{
    id: string;
    content: string;
    type: 'text' | 'voice';
    created_at: string;
  }>;
}

export const VoyageComplete: React.FC<VoyageCompleteProps> = ({
  voyageId,
  onContinue
}) => {
  const [assessmentData, setAssessmentData] = useState<VoyageAssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVoiceAnalysis, setShowVoiceAnalysis] = useState(false);

  useEffect(() => {
    const fetchAssessmentData = async (retryCount = 0) => {
      const maxRetries = 3;
      const retryDelay = 1000;

      try {
        setIsLoading(true);
        setError(null);

        console.log(`Fetching assessment data for voyage ${voyageId} (attempt ${retryCount + 1})`);

        // First, ensure voyage statistics are calculated
        try {
          const { error: statsError } = await supabase
            .rpc('calculate_voyage_statistics_precise', { voyage_id_param: voyageId });

          if (statsError) {
            console.warn('Failed to calculate voyage statistics:', statsError);
          } else {
            console.log('✅ Statistics calculation completed');
          }
        } catch (statsError) {
          console.warn('Error calling calculate_voyage_statistics_precise:', statsError);
        }

        // Wait a moment for database consistency
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Fetch assessment data
        const { data, error: fetchError } = await supabase
          .rpc('get_voyage_assessment_data_precise', { voyage_id_param: voyageId });

        if (fetchError) {
          console.error('Assessment data fetch error:', fetchError);
          throw fetchError;
        }

        if (!data) {
          console.error('No assessment data returned');
          throw new Error('No assessment data found');
        }

        console.log('✅ Raw assessment data received:', data);

        // Validate and normalize data structure
        if (!data.voyage || !data.distractions) {
          console.warn('⚠️ Incomplete assessment data structure:', data);

          if (retryCount < maxRetries) {
            console.log(`Retrying assessment data fetch (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => fetchAssessmentData(retryCount + 1), retryDelay * (retryCount + 1));
            return;
          }

          throw new Error('Incomplete assessment data received');
        }

        // Handle nested voyage structure
        let normalizedData = data;
        if (data.voyage && !data.voyage.voyage) {
          // If voyage data is not nested properly, wrap it
          normalizedData = {
            ...data,
            voyage: {
              voyage: data.voyage,
              destination: data.voyage.destination || null
            }
          };
        }

        console.log('✅ Normalized assessment data:', normalizedData);
        setAssessmentData(normalizedData);

      } catch (err) {
        console.error('Failed to fetch voyage assessment data:', err);

        // Retry logic for network/temporary issues
        if (retryCount < maxRetries &&
          (err instanceof Error &&
            (err.message.includes('network') ||
              err.message.includes('timeout') ||
              err.message.includes('connection')))) {

          console.log(`Retrying due to network issue (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => fetchAssessmentData(retryCount + 1), retryDelay * (retryCount + 1));
          return;
        }

        // Try to get basic voyage data as fallback
        if (retryCount === 0) {
          console.log('Attempting fallback data fetch...');
          try {
            const { data: basicVoyage, error: basicError } = await supabase
              .from('voyages')
              .select(`
                *,
                destination:destinations(*)
              `)
              .eq('id', voyageId)
              .single();

            if (!basicError && basicVoyage) {
              console.log('✅ Using basic voyage data as fallback:', basicVoyage);
              setAssessmentData({
                voyage: {
                  voyage: basicVoyage,
                  destination: basicVoyage.destination
                },
                distractions: {
                  events: [],
                  summary: {
                    total_count: basicVoyage.distraction_count || 0,
                    by_type: {},
                    total_time: basicVoyage.total_distraction_time || 0,
                    avg_duration: basicVoyage.avg_distraction_duration || 0,
                    return_rate: basicVoyage.return_to_course_rate || 0
                  }
                },
                exploration_notes: []
              });
              return;
            }
          } catch (fallbackError) {
            console.error('Fallback data fetch also failed:', fallbackError);
          }
        }

        setError(err instanceof Error ? err.message : 'Failed to load voyage data');
      } finally {
        setIsLoading(false);
      }
    };

    if (voyageId) {
      fetchAssessmentData();
    }
  }, [voyageId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold mb-2">Analyzing Your Voyage</h2>
          <p className="text-gray-600">Calculating your focus statistics...</p>
        </Card>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Voyage Data</h2>
          <p className="text-gray-600 mb-4">{error || 'Unknown error occurred'}</p>
          <Button onClick={onContinue} variant="outline">Continue Anyway</Button>
        </Card>
      </div>
    );
  }

  const { voyage: voyageData, distractions, exploration_notes } = assessmentData;
  const voyage = voyageData.voyage;
  const destination = voyageData.destination;
  const hasExplorationNotes = exploration_notes && exploration_notes.length > 0;

  const formatPreciseDurationFromMs = (milliseconds: number) => {
    // Use high-precision formatting directly from milliseconds
    return formatPreciseDuration(milliseconds);
  };

  const formatDuration = (durationValue: any) => {
    // Check if we have high precision data (milliseconds)
    if (typeof durationValue === 'object' && durationValue.ms !== undefined) {
      return formatPreciseDurationFromMs(durationValue.ms);
    }

    // If it's already in milliseconds (number > 1000 suggests milliseconds)
    if (typeof durationValue === 'number' && durationValue > 1000) {
      return formatPreciseDurationFromMs(durationValue);
    }

    // Fallback: assume it's minutes and convert
    const minutes = typeof durationValue === 'number' ? durationValue : 0;
    const milliseconds = minutes * 60 * 1000;
    return formatPreciseDuration(milliseconds);
  };

  const getActualDuration = () => {
    // Prefer high precision duration if available
    if (voyage.actual_duration_ms) {
      return voyage.actual_duration_ms;
    }
    // Fallback to regular duration in minutes converted to milliseconds
    return (voyage.actual_duration || 0) * 60 * 1000;
  };

  const getPlannedDuration = () => {
    // Prefer high precision duration if available
    if (voyage.planned_duration_ms) {
      return voyage.planned_duration_ms;
    }
    // Fallback to regular duration in minutes converted to milliseconds
    return (voyage.planned_duration || 0) * 60 * 1000;
  };
  const getPerformanceMessage = () => {
    const focusScore = voyage.focus_quality_score || 0;
    const distractionCount = voyage.distraction_count || 0;

    if (focusScore >= 95) {
      return "Perfect focused sailing! Your concentration is as steady as a lighthouse beam.";
    } else if (focusScore >= 85) {
      return "Excellent focus performance! You navigated with great skill and determination.";
    } else if (focusScore >= 75) {
      return "Great sailing! A few course corrections, but your overall direction was true.";
    } else if (focusScore >= 60) {
      return "Good voyage! Focus is a skill that improves with practice and intention.";
    } else if (distractionCount > 0) {
      return "A challenging voyage, but every sailing experience teaches us something valuable.";
    } else {
      return "Every voyage is an opportunity for growth. The seas teach patience and persistence.";
    }
  };

  const getPerformanceColor = () => {
    const focusScore = voyage.focus_quality_score || 0;

    if (focusScore >= 85) return 'text-green-600';
    if (focusScore >= 75) return 'text-blue-600';
    if (focusScore >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-4"
          >
            <Trophy className="w-24 h-24 text-yellow-400" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">Voyage Complete!</h1>
          <p className="text-xl text-green-200">
            You have successfully reached {destination.destination_name}
          </p>
        </motion.div>

        {/* Voyage Summary */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          {/* Main Stats */}
          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatDuration(getActualDuration())}
                  </p>
                  <p className="text-xs text-gray-500">High Precision</p>
                </div>
                <p className="text-sm text-gray-600">Actual Duration</p>
              </div>

              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {voyage.distraction_count}
                </p>
                <p className="text-sm text-gray-600">Distractions</p>
              </div>

              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {voyage.focus_quality_score || 0}%
                </p>
                <p className="text-sm text-gray-600">Focus Quality</p>
              </div>

              <div className="text-center">
                <Target className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {voyage.return_to_course_rate ? Math.round(voyage.return_to_course_rate) : 0}%
                </p>
                <p className="text-sm text-gray-600">Return Rate</p>
              </div>
            </div>
          </Card>

          {/* Performance Message */}
          <Card className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-3">Voyage Assessment</h3>
            <p className={`text-lg font-medium ${getPerformanceColor()}`}>
              {getPerformanceMessage()}
            </p>
          </Card>

          {/* Detailed Statistics */}
          {distractions.summary.total_count > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Distraction Analysis</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total distraction time:</span>
                      <span className="font-medium">{formatSeconds(distractions.summary.total_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average duration:</span>
                      <span className="font-medium">{formatSeconds(Math.round(distractions.summary.avg_duration))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Most common type:</span>
                      <span className="font-medium capitalize">{voyage.most_common_distraction?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3">By Type</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(distractions.summary.by_type || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{type.replace('_', ' ')}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Exploration Notes */}
          {hasExplorationNotes && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Compass className="w-6 h-6 mr-2 text-purple-500" />
                Exploration Discoveries
              </h3>
              <p className="text-gray-600 mb-4">
                Notes and inspirations captured during your exploration:
              </p>

              <div className="space-y-3">
                {exploration_notes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {note.type === 'voice' ? (
                          <Mic className="w-4 h-4 text-purple-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800 text-sm">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.type === 'voice' ? 'Voice note' : 'Text note'} • {new Date(note.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <p className="text-sm text-purple-700">
                  💡 <strong>Seagull's Note:</strong> Your explorations often lead to the most valuable discoveries. These moments of curiosity are treasures for your future voyages!
                </p>
              </div>
            </Card>
          )}

          {/* Destination Info */}
          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div
                className="w-4 h-16 rounded-full"
                style={{ backgroundColor: destination.color_theme }}
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {destination.destination_name}
                </h3>
                <p className="text-gray-600 mb-3">{destination.description}</p>
                <p className="text-sm text-gray-500">
                  Original task: {destination.original_task}
                </p>
              </div>
            </div>
          </Card>

          {/* Planned vs Actual */}
          {voyage.planned_duration && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Planned vs Actual (High Precision)</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Planned Duration:</span>
                  <span className="font-medium">{formatDuration(getPlannedDuration())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Duration:</span>
                  <span className="font-medium">{formatDuration(getActualDuration())}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Completion:</span>
                  <span className={`font-medium ${getActualDuration() >= getPlannedDuration()
                    ? 'text-green-600'
                    : 'text-orange-600'
                    }`}>
                    {getPlannedDuration() ? Math.round((getActualDuration() / getPlannedDuration()) * 100) : 100}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  <p>⏱️ Using high-precision timing for accurate measurements</p>
                  <p>Precision: ±0.01 seconds (sub-millisecond when available)</p>
                  {voyage.actual_duration_ms && (
                    <p className="text-green-600">✅ High precision data available</p>
                  )}
                  {!voyage.actual_duration_ms && (
                    <p className="text-yellow-600">⚠️ Fallback to minute precision (legacy data)</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Voice Analysis Toggle Button */}
          <div className="text-center pt-4">
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => setShowVoiceAnalysis(!showVoiceAnalysis)}
                variant="outline"
                size="lg"
                icon={Mic}
              >
                {showVoiceAnalysis ? 'Hide' : 'View'} Voice Analysis
              </Button>
              <Button
                onClick={onContinue}
                size="lg"
                icon={ArrowRight}
                className="px-8"
              >
                View Voyage Map
              </Button>
            </div>
          </div>

          {/* Voice Analysis Section */}
          {showVoiceAnalysis && (
            <div className="mt-8">
              <VoiceAnalysis
                voyageId={voyageId}
                isVisible={showVoiceAnalysis}
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};