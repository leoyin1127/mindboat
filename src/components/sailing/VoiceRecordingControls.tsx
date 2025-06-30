import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Settings,
    Shield,
    Eye,
    Info,
    Clock,
    Brain
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { VoiceService } from '../../services/VoiceService';
import { VoiceTranscriptService } from '../../services/VoiceTranscriptService';
import type { VoiceRecordingSettings } from '../../types';

interface VoiceRecordingControlsProps {
    voyageId: string;
    isVoyageActive: boolean;
    onRecordingToggle: (isRecording: boolean) => void;
}

export const VoiceRecordingControls: React.FC<VoiceRecordingControlsProps> = ({
    voyageId,
    isVoyageActive,
    onRecordingToggle
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<{ isRecording: boolean; transcriptStatus?: { segmentCounter?: number } } | null>(null);
    const [settings, setSettings] = useState<VoiceRecordingSettings>({
        enabled: false,
        continuous: true,
        saveTranscripts: true,
        autoAnalyze: true,
        privacyMode: false,
        retentionDays: 30
    });

    // Update recording status periodically
    useEffect(() => {
        const updateStatus = () => {
            const status = VoiceService.getContinuousRecordingStatus();
            setRecordingStatus(status);
            setIsRecording(status.isRecording);
        };

        if (isVoyageActive) {
            updateStatus();
            const interval = setInterval(updateStatus, 2000);
            return () => clearInterval(interval);
        }
    }, [isVoyageActive]);

    const handleToggleRecording = async () => {
        try {
            if (isRecording) {
                // Stop recording
                await VoiceService.stopContinuousRecording();
                setIsRecording(false);
                onRecordingToggle(false);
            } else {
                // Start recording with current settings
                const success = await VoiceService.startContinuousRecording(voyageId, settings);
                if (success) {
                    setIsRecording(true);
                    onRecordingToggle(true);
                } else {
                    console.error('Failed to start continuous recording');
                    alert('Failed to start voice recording. Please check your microphone permissions.');
                }
            }
        } catch (error) {
            console.error('Error toggling voice recording:', error);
            alert('Error with voice recording. Please try again.');
        }
    };

    const handleSettingsChange = (newSettings: Partial<VoiceRecordingSettings>) => {
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        VoiceTranscriptService.updateSettings(updatedSettings);
    };

    if (!isVoyageActive) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Recording Control Button */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                            {isRecording ? (
                                <Mic className="w-5 h-5 text-red-600 animate-pulse" />
                            ) : (
                                <MicOff className="w-5 h-5 text-gray-600" />
                            )}
                        </div>
                        <div>
                            <div className="font-medium">
                                {isRecording ? 'Recording Voice Journey' : 'Voice Recording'}
                            </div>
                            <div className="text-sm text-gray-600">
                                {isRecording
                                    ? `${recordingStatus?.transcriptStatus?.segmentCounter || 0} segments captured`
                                    : 'Capture your thoughts and progress'
                                }
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant="outline"
                            size="sm"
                            icon={Settings}
                        >
                            Settings
                        </Button>
                        <Button
                            onClick={handleToggleRecording}
                            className={`${isRecording
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            size="sm"
                            icon={isRecording ? MicOff : Mic}
                        >
                            {isRecording ? 'Stop' : 'Start'}
                        </Button>
                    </div>
                </div>

                {/* Recording Status */}
                {isRecording && recordingStatus && (
                    <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <div className="font-medium text-blue-600">
                                    {recordingStatus.transcriptStatus?.segmentCounter || 0}
                                </div>
                                <div className="text-gray-600">Segments</div>
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-green-600">
                                    Recording...
                                </div>
                                <div className="text-gray-600">Status</div>
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-purple-600">
                                    {settings.privacyMode ? 'Private' : 'Normal'}
                                </div>
                                <div className="text-gray-600">Mode</div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card className="p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Settings className="w-5 h-5 text-gray-600" />
                                <h3 className="font-semibold">Voice Recording Settings</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Enable Recording */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Mic className="w-4 h-4 text-gray-600" />
                                        <div>
                                            <div className="font-medium">Enable Recording</div>
                                            <div className="text-sm text-gray-600">
                                                Record your voice throughout the voyage
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enabled}
                                            onChange={(e) => handleSettingsChange({ enabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Privacy Mode */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Shield className="w-4 h-4 text-gray-600" />
                                        <div>
                                            <div className="font-medium">Privacy Mode</div>
                                            <div className="text-sm text-gray-600">
                                                Anonymize names, emails, and sensitive data
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.privacyMode}
                                            onChange={(e) => handleSettingsChange({ privacyMode: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Save Transcripts */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Eye className="w-4 h-4 text-gray-600" />
                                        <div>
                                            <div className="font-medium">Save Transcripts</div>
                                            <div className="text-sm text-gray-600">
                                                Store text transcripts for later review
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.saveTranscripts}
                                            onChange={(e) => handleSettingsChange({ saveTranscripts: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Auto Analysis */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Brain className="w-4 h-4 text-gray-600" />
                                        <div>
                                            <div className="font-medium">Auto Analysis</div>
                                            <div className="text-sm text-gray-600">
                                                Generate insights automatically after voyage
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.autoAnalyze}
                                            onChange={(e) => handleSettingsChange({ autoAnalyze: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Data Retention */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-gray-600" />
                                        <div>
                                            <div className="font-medium">Data Retention</div>
                                            <div className="text-sm text-gray-600">
                                                How long to keep voice data
                                            </div>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.retentionDays}
                                        onChange={(e) => handleSettingsChange({ retentionDays: parseInt(e.target.value) })}
                                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                                    >
                                        <option value={7}>7 days</option>
                                        <option value={30}>30 days</option>
                                        <option value={90}>90 days</option>
                                        <option value={365}>1 year</option>
                                    </select>
                                </div>

                                {/* Privacy Notice */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            <div className="font-medium mb-1">Privacy Notice</div>
                                            <div>
                                                Voice recordings are processed locally when possible.
                                                AI analysis uses Google Gemini and requires internet connection.
                                                You can delete your recordings at any time.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}; 