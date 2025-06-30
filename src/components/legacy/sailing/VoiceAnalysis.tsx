import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MessageSquare,
    Trophy,
    Brain,
    Heart,
    TrendingUp,
    Clock,
    Volume2,
    Eye,
    EyeOff,
    Trash2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { VoiceTranscriptService } from '../../services/VoiceTranscriptService';
import type { VoiceTranscriptData, VoiceAnalysisData } from '../../types';

interface VoiceAnalysisProps {
    voyageId: string;
    isVisible: boolean;
}

export const VoiceAnalysis: React.FC<VoiceAnalysisProps> = ({
    voyageId,
    isVisible
}) => {
    const [transcriptData, setTranscriptData] = useState<VoiceTranscriptData | null>(null);
    const [analysisData, setAnalysisData] = useState<VoiceAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTranscript, setShowTranscript] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadVoiceData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Load transcript data
                const transcript = await VoiceTranscriptService.getVoyageTranscript(voyageId);
                setTranscriptData(transcript);

                // Load analysis data
                const analysis = await VoiceTranscriptService.getVoyageAnalysis(voyageId);
                setAnalysisData(analysis);

                // If no analysis exists but we have transcript data, try to generate analysis
                if (!analysis && transcript && transcript.word_count > 50) {
                    console.log('🎤 [VOICE ANALYSIS] No existing analysis, generating...');
                    const newAnalysis = await VoiceTranscriptService.analyzeVoyageTranscript(voyageId);
                    if (newAnalysis) {
                        setAnalysisData(newAnalysis);
                    }
                }
            } catch (err) {
                console.error('🎤 [VOICE ANALYSIS] Failed to load voice data:', err);
                setError('Failed to load voice analysis data');
            } finally {
                setIsLoading(false);
            }
        };

        if (isVisible) {
            loadVoiceData();
        }
    }, [voyageId, isVisible]);

    const handleDeleteTranscripts = async () => {
        if (!window.confirm('Are you sure you want to delete all voice recordings for this voyage? This action cannot be undone.')) {
            return;
        }

        try {
            await VoiceTranscriptService.deleteVoyageTranscripts(voyageId);
            setTranscriptData(null);
            setAnalysisData(null);
        } catch (err) {
            console.error('Failed to delete transcripts:', err);
            setError('Failed to delete voice recordings');
        }
    };

    if (!transcriptData || !transcriptData.recording_enabled) {
        return (
            <Card className="p-6 bg-gray-50">
                <div className="text-center">
                    <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No Voice Recording
                    </h3>
                    <p className="text-gray-500">
                        Voice recording was not enabled for this voyage.
                    </p>
                </div>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Analyzing your voice journey...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 bg-red-50 border-red-200">
                <div className="text-center">
                    <p className="text-red-600">{error}</p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="mt-4"
                    >
                        Retry
                    </Button>
                </div>
            </Card>
        );
    }

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatConfidence = (confidence: number) => {
        return `${Math.round(confidence * 100)}%`;
    };

    return (
        <div className="space-y-6">
            {/* Voice Recording Summary */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Mic className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Voice Journey Summary</h3>
                            <p className="text-gray-600">Your spoken thoughts and progress</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setShowTranscript(!showTranscript)}
                            variant="outline"
                            size="sm"
                            icon={showTranscript ? EyeOff : Eye}
                        >
                            {showTranscript ? 'Hide' : 'Show'} Transcript
                        </Button>
                        <Button
                            onClick={handleDeleteTranscripts}
                            variant="outline"
                            size="sm"
                            icon={Trash2}
                            className="text-red-600 hover:text-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-blue-700">
                            {formatDuration(transcriptData.total_duration)}
                        </div>
                        <div className="text-sm text-blue-600">Speaking Time</div>
                    </div>

                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-green-700">
                            {transcriptData.word_count.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-600">Words Spoken</div>
                    </div>

                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <Volume2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-purple-700">
                            {formatConfidence(transcriptData.avg_confidence)}
                        </div>
                        <div className="text-sm text-purple-600">Avg Confidence</div>
                    </div>

                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <Brain className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-orange-700">
                            {transcriptData.segments.length}
                        </div>
                        <div className="text-sm text-orange-600">Speech Segments</div>
                    </div>
                </div>

                {/* Transcript Text */}
                <AnimatePresence>
                    {showTranscript && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t pt-4"
                        >
                            <h4 className="font-semibold mb-3 flex items-center">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Full Transcript
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {transcriptData.full_text || 'No transcript available.'}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* AI Analysis Results */}
            {analysisData && (
                <div className="space-y-4">
                    {/* Journey Summary */}
                    {analysisData.journey_summary && (
                        <Card className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Brain className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Journey Summary</h3>
                                    <p className="text-gray-600">Key insights from your spoken thoughts</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2 text-green-700">🎯 Key Achievements</h4>
                                    <ul className="space-y-1">
                                        {analysisData.journey_summary.data.key_achievements.map((achievement, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {achievement}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-blue-700">⚡ Breakthrough Moments</h4>
                                    <ul className="space-y-1">
                                        {analysisData.journey_summary.data.breakthrough_moments.map((moment, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {moment}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-purple-700">🏃 Main Activities</h4>
                                    <ul className="space-y-1">
                                        {analysisData.journey_summary.data.main_activities.map((activity, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {activity}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-orange-700">🚧 Challenges Discussed</h4>
                                    <ul className="space-y-1">
                                        {analysisData.journey_summary.data.challenges_discussed.map((challenge, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {challenge}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Achievements */}
                    {analysisData.achievements && (
                        <Card className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Trophy className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Accomplishments</h3>
                                    <p className="text-gray-600">What you achieved during this voyage</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2 text-green-700">✅ Completed Tasks</h4>
                                    <ul className="space-y-1">
                                        {analysisData.achievements.data.completed_tasks.map((task, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {task}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-blue-700">📚 New Learnings</h4>
                                    <ul className="space-y-1">
                                        {analysisData.achievements.data.learnings.map((learning, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {learning}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-purple-700">🔧 Problems Solved</h4>
                                    <ul className="space-y-1">
                                        {analysisData.achievements.data.problems_solved.map((problem, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {problem}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-orange-700">💡 Decisions Made</h4>
                                    <ul className="space-y-1">
                                        {analysisData.achievements.data.decisions_made.map((decision, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {decision}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Mood Analysis */}
                    {analysisData.mood_analysis && (
                        <Card className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-pink-100 rounded-lg">
                                    <Heart className="w-6 h-6 text-pink-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Mood & Energy Analysis</h3>
                                    <p className="text-gray-600">Your emotional journey throughout the session</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Overall Mood</h4>
                                    <div className="flex items-center space-x-2">
                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${analysisData.mood_analysis.data.overall_mood === 'positive' ? 'bg-green-100 text-green-700' :
                                            analysisData.mood_analysis.data.overall_mood === 'negative' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {analysisData.mood_analysis.data.overall_mood}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Satisfaction: {analysisData.mood_analysis.data.satisfaction_level}/10
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Energy Levels</h4>
                                    <div className="space-y-1">
                                        {analysisData.mood_analysis.data.energy_levels.map((level, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="capitalize">{level.time}:</span>
                                                <span className={`px-2 py-1 rounded text-xs ${level.level === 'high' ? 'bg-green-100 text-green-700' :
                                                    level.level === 'low' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {level.level}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {analysisData.mood_analysis.data.excitement_moments.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2 text-green-700">🎉 Excitement Moments</h4>
                                    <ul className="space-y-1">
                                        {analysisData.mood_analysis.data.excitement_moments.map((moment, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">• {moment}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Productivity Insights */}
                    {analysisData.productivity_insights && (
                        <Card className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Productivity Insights</h3>
                                    <p className="text-gray-600">Patterns and suggestions for improvement</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Efficiency Score</h4>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${analysisData.productivity_insights.data.efficiency_score}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-lg font-bold text-indigo-700">
                                            {analysisData.productivity_insights.data.efficiency_score}/100
                                        </span>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold mb-2 text-green-700">🏆 Most Productive Activities</h4>
                                        <ul className="space-y-1">
                                            {analysisData.productivity_insights.data.most_productive_activities.map((activity, idx) => (
                                                <li key={idx} className="text-gray-700 text-sm">• {activity}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2 text-blue-700">💡 Suggestions</h4>
                                        <ul className="space-y-1">
                                            {analysisData.productivity_insights.data.suggestions.map((suggestion, idx) => (
                                                <li key={idx} className="text-gray-700 text-sm">• {suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* No Analysis Available */}
            {!analysisData && transcriptData && transcriptData.word_count < 50 && (
                <Card className="p-6 bg-yellow-50 border-yellow-200">
                    <div className="text-center">
                        <Brain className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-yellow-700 mb-2">
                            Insufficient Data for Analysis
                        </h3>
                        <p className="text-yellow-600">
                            Not enough spoken content was captured to generate meaningful insights.
                            Try speaking more during your next voyage to get detailed analysis.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}; 