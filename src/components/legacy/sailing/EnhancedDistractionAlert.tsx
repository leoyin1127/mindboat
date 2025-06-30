/**
 * Enhanced Distraction Alert with Voice Interaction
 * 
 * Provides both visual and voice-based distraction alerts with
 * intelligent response handling and exploration mode support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Compass, Mic, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface EnhancedDistractionAlertProps {
  isVisible: boolean;
  onResponse: (response: 'return_to_course' | 'exploring') => void;
  distractionType: 'tab_switch' | 'idle' | 'camera_distraction' | 'camera_absence' | 'blacklisted_content' | 'irrelevant_content';
  duration?: number;
  enableVoice?: boolean;
  isVoyageActive?: boolean;
  isExploring?: boolean;
}

// Global state to track voice alerts to prevent duplicates across component re-mounts
const voiceAlertTracker = {
  activeAlerts: new Set<string>(),
  lastAlertTime: 0,

  shouldTriggerAlert(distractionType: string, timestamp: number): boolean {
    const alertKey = `${distractionType}-${Math.floor(timestamp / 5000)}`; // 5-second windows
    const timeSinceLastAlert = timestamp - this.lastAlertTime;

    // Prevent alerts if:
    // 1. Same alert type in the same 5-second window
    // 2. Any alert triggered in the last 3 seconds
    if (this.activeAlerts.has(alertKey) || timeSinceLastAlert < 3000) {
      console.log('🎤 [ALERT] 🚫 Skipping duplicate voice alert:', {
        alertKey,
        timeSinceLastAlert,
        activeAlerts: Array.from(this.activeAlerts)
      });
      return false;
    }

    // Clean up old alerts (older than 30 seconds)
    const cutoffTime = timestamp - 30000;
    this.activeAlerts.forEach(key => {
      const keyTime = parseInt(key.split('-').pop() || '0') * 5000;
      if (keyTime < cutoffTime) {
        this.activeAlerts.delete(key);
      }
    });

    this.activeAlerts.add(alertKey);
    this.lastAlertTime = timestamp;
    return true;
  },

  clearAlert(distractionType: string, timestamp: number): void {
    const alertKey = `${distractionType}-${Math.floor(timestamp / 5000)}`;
    this.activeAlerts.delete(alertKey);
  }
};

export const EnhancedDistractionAlert: React.FC<EnhancedDistractionAlertProps> = ({
  isVisible,
  onResponse,
  distractionType,
  duration,
  enableVoice = true,
  isVoyageActive = true,
  isExploring = false
}) => {
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [voiceAlertTriggered, setVoiceAlertTriggered] = useState(false);
  const [alertTimestamp, setAlertTimestamp] = useState<number>(0);

  // Use the voice interaction hook with persistent listening
  const {
    isVoiceEnabled,
    isListening,
    isSpeaking,
    isPersistentListening,
    voiceStatus,
    handleVoiceDistractionAlert,
    stopPersistentListening
  } = useVoiceInteraction({
    isVoyageActive,
    isExploring,
    onDistractionResponse: onResponse,
    onInspirationCaptured: () => { } // Not used in this context
  });

  // Reset state when alert becomes visible
  useEffect(() => {
    if (isVisible && alertTimestamp === 0) {
      // Only set timestamp once when alert first becomes visible
      const timestamp = Date.now();
      setAlertTimestamp(timestamp);

      console.log('🚨 [ALERT] 🎯 Distraction alert became visible:', {
        distractionType,
        enableVoice,
        voiceFeatures: voiceStatus.features,
        timestamp: new Date(timestamp).toISOString()
      });

      setVoiceAlertTriggered(false);
    } else if (!isVisible && alertTimestamp > 0) {
      // Clean up when alert is hidden
      voiceAlertTracker.clearAlert(distractionType, alertTimestamp);
      stopPersistentListening();
      setAlertTimestamp(0); // Reset for next time
    }
  }, [isVisible, distractionType, enableVoice, voiceStatus, stopPersistentListening, alertTimestamp]);

  const handleResponse = useCallback((response: 'return_to_course' | 'exploring') => {
    console.log('🚨 [ALERT] ✅ Response selected:', response);
    setSelectedResponse(response);

    // Stop persistent listening when user responds manually
    stopPersistentListening();

    // Clear the alert from tracker
    if (alertTimestamp > 0) {
      voiceAlertTracker.clearAlert(distractionType, alertTimestamp);
    }

    // Reset voice alert state immediately to prevent re-triggers
    setVoiceAlertTriggered(false);

    setTimeout(() => {
      onResponse(response);
      setSelectedResponse(null);
    }, 500);
  }, [onResponse, stopPersistentListening, distractionType, alertTimestamp]);

  // Trigger voice alert when distraction becomes visible (with duplicate prevention)
  useEffect(() => {
    if (!isVisible || !enableVoice || !isVoiceEnabled || isExploring || alertTimestamp === 0 || voiceAlertTriggered) {
      return;
    }

    // Check if we should trigger this alert
    if (!voiceAlertTracker.shouldTriggerAlert(distractionType, alertTimestamp)) {
      return;
    }

    console.log('🎤 [ALERT] 🚨 TRIGGERING ENHANCED VOICE ALERT:', {
      distractionType,
      alertTimestamp,
      voiceFeatures: voiceStatus.features,
      timestamp: new Date().toISOString()
    });

    const triggerVoiceAlert = async () => {
      try {
        // Double-check conditions before triggering
        if (!isVisible || isExploring || voiceAlertTriggered) {
          console.log('🎤 [ALERT] ❌ Voice alert cancelled - conditions changed');
          return;
        }

        setVoiceAlertTriggered(true);
        console.log('🎤 [ALERT] 🔊 Starting enhanced voice distraction alert...');

        // Use the enhanced voice interaction that includes persistent listening
        const success = await handleVoiceDistractionAlert(distractionType);

        if (success) {
          console.log('🎤 [ALERT] ✅ Enhanced voice alert initiated successfully');
        } else {
          console.log('🎤 [ALERT] ⚠️ Enhanced voice alert was not initiated');
          setVoiceAlertTriggered(false);
        }

      } catch (error) {
        console.error('🎤 [ALERT] ❌ Enhanced voice alert failed:', error);
        // Clear the alert from tracker on failure
        voiceAlertTracker.clearAlert(distractionType, alertTimestamp);
        setVoiceAlertTriggered(false);
      }
    };

    // Small delay to ensure UI is ready
    setTimeout(triggerVoiceAlert, 1000);
  }, [
    isVisible,
    enableVoice,
    isVoiceEnabled,
    distractionType,
    handleVoiceDistractionAlert,
    isExploring,
    alertTimestamp,
    voiceAlertTriggered
  ]);

  const getDistractionMessage = () => {
    switch (distractionType) {
      case 'tab_switch':
        return "I noticed you switched away from your focus area. The winds have shifted!";
      case 'camera_absence':
      case 'camera_distraction':
        return "The AI noticed you're not at your workstation. Time to return to your voyage!";
      case 'blacklisted_content':
        return "You've sailed into distracting waters. Let's navigate back to your destination!";
      case 'irrelevant_content':
        return "The current content doesn't seem related to your voyage goal. Shall we return to course?";
      case 'idle':
        return "You seem to be taking a break. The sea is calm and peaceful.";
      default:
        return "The captain seems to be off course!";
    }
  };

  const getDistractionIcon = () => {
    switch (distractionType) {
      case 'tab_switch':
      case 'blacklisted_content':
      case 'irrelevant_content':
        return <Compass className="w-16 h-16 text-yellow-500" />;
      case 'camera_absence':
      case 'camera_distraction':
        return <AlertTriangle className="w-16 h-16 text-orange-500" />;
      case 'idle':
        return <Volume2 className="w-16 h-16 text-blue-500" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Card className="max-w-md w-full p-8 text-center">
              <motion.div
                animate={{
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="mb-6"
              >
                {getDistractionIcon()}
              </motion.div>

              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                Course Correction Needed
              </h2>

              <p className="text-gray-600 mb-2">
                {getDistractionMessage()}
              </p>

              {duration && (
                <p className="text-sm text-gray-500 mb-6">
                  Away for {Math.round(duration / 1000)} seconds
                </p>
              )}

              {/* Enhanced Voice Interaction Status */}
              <AnimatePresence>
                {isSpeaking && (
                  <motion.div
                    key="speaking"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Volume2 className="w-5 h-5 text-blue-600" />
                      </motion.div>
                      <span className="text-blue-800 text-sm font-medium">🤖 AI is speaking...</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Listen for the voice prompt, then respond
                    </p>
                  </motion.div>
                )}

                {isPersistentListening && (
                  <motion.div
                    key="persistent-listening"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Mic className="w-5 h-5 text-green-600" />
                      </motion.div>
                      <span className="text-green-800 text-sm font-medium">🎤 Always listening for your voice...</span>
                    </div>
                    <p className="text-xs text-green-600">
                      Say "yes, please", "return to course", "I'm exploring", or similar phrases
                    </p>
                  </motion.div>
                )}

                {isListening && !isPersistentListening && (
                  <motion.div
                    key="temporary-listening"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Mic className="w-5 h-5 text-orange-600" />
                      </motion.div>
                      <span className="text-orange-800 text-sm font-medium">🎤 Listening for response...</span>
                    </div>
                    <p className="text-xs text-orange-600">
                      Speak now to respond to the distraction alert
                    </p>
                  </motion.div>
                )}

                {voiceAlertTriggered && !isSpeaking && !isListening && !isPersistentListening && isVoiceEnabled && (
                  <motion.div
                    key="voice-completed"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Mic className="w-5 h-5 text-purple-600" />
                      <span className="text-purple-800 text-sm">🎤 Voice alert completed - use buttons below</span>
                    </div>
                  </motion.div>
                )}

                {enableVoice && !isVoiceEnabled && (
                  <motion.div
                    key="voice-not-supported"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Volume2 className="w-5 h-5 text-red-600" />
                      <span className="text-red-800 text-sm">❌ Voice features not supported in this browser</span>
                    </div>
                  </motion.div>
                )}

                {enableVoice && isVoiceEnabled && !voiceStatus.features.elevenLabs && (
                  <motion.div
                    key="voice-no-api"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Volume2 className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-800 text-sm">⚠️ Voice recognition available, but AI voice needs API key</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manual Response Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleResponse('return_to_course')}
                  className={`w-full transition-all ${selectedResponse === 'return_to_course'
                    ? 'bg-green-600 scale-105'
                    : ''
                    }`}
                  size="lg"
                  icon={ArrowLeft}
                  disabled={selectedResponse !== null}
                >
                  Return to Course
                </Button>

                <Button
                  onClick={() => handleResponse('exploring')}
                  variant="outline"
                  className={`w-full transition-all ${selectedResponse === 'exploring'
                    ? 'border-blue-600 bg-blue-50 scale-105'
                    : ''
                    }`}
                  size="lg"
                  icon={Compass}
                  disabled={selectedResponse !== null}
                >
                  I'm Exploring
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-500">
                  Choose "I'm Exploring" to temporarily pause distraction detection
                </p>

                {isPersistentListening && (
                  <p className="text-xs text-green-600 font-medium">
                    🎤 Voice is always listening! Say your response anytime.
                  </p>
                )}

                {isVoiceEnabled && !isPersistentListening && (
                  <p className="text-xs text-blue-600">
                    🎤 Voice interaction: Speak in English after the AI prompt
                  </p>
                )}

                {!voiceStatus.features.elevenLabs && isVoiceEnabled && (
                  <p className="text-xs text-yellow-600">
                    💡 Add ElevenLabs API key to .env for AI voice responses
                  </p>
                )}

                {!isVoiceEnabled && (
                  <p className="text-xs text-red-600">
                    ❌ Voice features not supported in this browser
                  </p>
                )}
              </div>

              {/* Debug info in development */}
              {import.meta.env.DEV && (
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left">
                  <p><strong>🔧 Debug Info:</strong></p>
                  <p>Voice Enabled: {isVoiceEnabled ? '✅' : '❌'}</p>
                  <p>Speech Recognition: {voiceStatus.features.speechRecognition ? '✅' : '❌'}</p>
                  <p>ElevenLabs: {voiceStatus.features.elevenLabs ? '✅' : '❌'}</p>
                  <p>Alert Triggered: {voiceAlertTriggered ? '✅' : '❌'}</p>
                  <p>Speaking: {isSpeaking ? '✅' : '❌'}</p>
                  <p>Listening: {isListening ? '✅' : '❌'}</p>
                  <p>Persistent Listening: {isPersistentListening ? '✅' : '❌'}</p>
                  <p>Alert Timestamp: {alertTimestamp}</p>
                  <p>Active Alerts: {Array.from(voiceAlertTracker.activeAlerts).join(', ') || 'None'}</p>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};