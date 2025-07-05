/**
 * Voice Interaction Hook
 * 
 * Manages voice-based interactions for distraction alerts,
 * exploration mode, and inspiration capture.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceService } from '../services/VoiceService';
import { useNotificationStore } from '../stores/notificationStore';

interface UseVoiceInteractionProps {
  isVoyageActive: boolean;
  isExploring: boolean;
  onDistractionResponse?: (response: 'return_to_course' | 'exploring') => void;
  onInspirationCaptured?: (content: string, type: 'voice' | 'text') => void;
  onVoiceSpeakingChange?: (isSpeaking: boolean) => void;
}

export const useVoiceInteraction = ({
  isVoyageActive,
  isExploring,
  onDistractionResponse,
  onInspirationCaptured,
  onVoiceSpeakingChange
}: UseVoiceInteractionProps) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(VoiceService.getStatus());
  const [isPersistentListening, setIsPersistentListening] = useState(false);

  const { showError, showSuccess } = useNotificationStore();
  const initializationAttempted = useRef(false);
  const persistentListeningInterval = useRef<NodeJS.Timeout>();
  const isProcessingResponse = useRef(false);

  // Initialize voice service
  useEffect(() => {
    const initializeVoice = async () => {
      if (initializationAttempted.current) return;
      initializationAttempted.current = true;

      console.log('🎤 [VOICE] Initializing voice service...');

      try {
        const initialized = await VoiceService.initialize();
        const status = VoiceService.getStatus();

        console.log('🎤 [VOICE] Initialization result:', {
          initialized,
          status,
          speechRecognition: status.features.speechRecognition,
          elevenLabs: status.features.elevenLabs,
          fullFeatures: status.features.fullFeatures
        });

        setIsVoiceEnabled(initialized && status.features.speechRecognition);
        setVoiceStatus(status);

        if (initialized && status.features.fullFeatures) {
          console.log('🎤 [VOICE] ✅ Full voice features available');
        } else if (status.features.speechRecognition) {
          console.log('🎤 [VOICE] ⚠️ Speech recognition only - ElevenLabs API key needed for AI voice');
        } else {
          console.log('🎤 [VOICE] ❌ Voice features not available');
        }
      } catch (error) {
        console.error('🎤 [VOICE] Initialization failed:', error);
        showError('Voice feature initialization failed', 'Voice Assistant');
      }
    };

    if (isVoyageActive) {
      initializeVoice();
    }
  }, [isVoyageActive, showError, showSuccess]);

  // Use refs to track persistent listening state to avoid closure issues
  const isPersistentListeningRef = useRef(false);
  const shouldContinueListening = useRef(false);

  // Persistent voice listening for distraction responses
  const startPersistentListening = useCallback(async () => {
    if (!isVoiceEnabled || !onDistractionResponse || isPersistentListeningRef.current || isProcessingResponse.current) {
      console.log('🎤 [VOICE] Cannot start persistent listening:', {
        voiceEnabled: isVoiceEnabled,
        hasCallback: !!onDistractionResponse,
        alreadyListening: isPersistentListeningRef.current,
        processing: isProcessingResponse.current
      });
      return;
    }

    console.log('🎤 [VOICE] 🔄 Starting persistent voice listening for distraction responses...');
    isPersistentListeningRef.current = true;
    shouldContinueListening.current = true;
    setIsPersistentListening(true);

    const listenCycle = async () => {
      // Use refs to avoid closure issues
      if (!shouldContinueListening.current || isProcessingResponse.current) {
        console.log('🎤 [VOICE] 🛑 Listen cycle stopped:', {
          shouldContinue: shouldContinueListening.current,
          processing: isProcessingResponse.current
        });
        return;
      }

      try {
        setIsListening(true);
        console.log('🎤 [VOICE] 👂 Listening for voice response...');

        // Listen for voice input with a reasonable timeout
        const result = await VoiceService.listen(8000); // 8 second cycles

        if (result.transcript && result.transcript.trim().length > 0) {
          console.log('🎤 [VOICE] 📝 Voice input received:', result.transcript);

          // Analyze the response
          const analysis = VoiceService.analyzeDistractionResponse(result.transcript);
          console.log('🎤 [VOICE] 🧠 Analysis result:', analysis);

          // If we got a clear response, process it
          if (analysis.confidence > 0.7 && (analysis.type === 'return_to_course' || analysis.type === 'exploring')) {
            isProcessingResponse.current = true;
            shouldContinueListening.current = false;
            isPersistentListeningRef.current = false;
            setIsPersistentListening(false);
            setIsListening(false);

            console.log('🎤 [VOICE] ✅ Clear voice response detected:', analysis.type);

            // Provide audio feedback if available
            if (voiceStatus.features.elevenLabs) {
              try {
                const { ElevenLabsService } = await import('../services/ElevenLabsService');

                // Notify that voice is about to speak (mute 3D audio)
                onVoiceSpeakingChange?.(true);
                setIsSpeaking(true);

                if (analysis.type === 'exploring') {
                  await ElevenLabsService.speakExplorationConfirmation();
                } else {
                  await ElevenLabsService.speakReturnConfirmation();
                }

                // Notify that voice has finished speaking (restore 3D audio)
                onVoiceSpeakingChange?.(false);
                setIsSpeaking(false);
              } catch (error) {
                console.warn('🎤 [VOICE] Failed to speak confirmation:', (error as Error).message);
                onVoiceSpeakingChange?.(false);
                setIsSpeaking(false);
              }
            }

            // Execute the response
            onDistractionResponse(analysis.type);
            return;
          }
        }

        setIsListening(false);

        // Continue listening if we should still be listening
        if (shouldContinueListening.current && !isProcessingResponse.current) {
          console.log('🎤 [VOICE] 🔄 Scheduling next listen cycle...');
          // Short delay before next listen cycle
          persistentListeningInterval.current = setTimeout(listenCycle, 1000);
        }

      } catch (error) {
        // Handle errors gracefully - speech recognition timeouts are normal
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('timeout') || errorMessage.includes('no-speech')) {
          console.log('🎤 [VOICE] 🔄 Listen cycle timeout, continuing...');
        } else {
          console.warn('🎤 [VOICE] ⚠️ Listen cycle error:', errorMessage);
        }

        setIsListening(false);

        // Continue listening if we should still be listening
        if (shouldContinueListening.current && !isProcessingResponse.current) {
          console.log('🎤 [VOICE] 🔄 Scheduling next listen cycle after error...');
          persistentListeningInterval.current = setTimeout(listenCycle, 1500);
        }
      }
    };

    // Start the first listen cycle
    setTimeout(listenCycle, 500);
  }, [isVoiceEnabled, onDistractionResponse, voiceStatus.features.elevenLabs]);

  // Stop persistent listening
  const stopPersistentListening = useCallback(() => {
    console.log('🎤 [VOICE] 🛑 Stopping persistent voice listening...');
    shouldContinueListening.current = false;
    isPersistentListeningRef.current = false;
    setIsPersistentListening(false);
    setIsListening(false);
    isProcessingResponse.current = false;

    if (persistentListeningInterval.current) {
      clearTimeout(persistentListeningInterval.current);
      persistentListeningInterval.current = undefined;
    }

    VoiceService.stopListening();
  }, []);

  // Handle distraction alert with enhanced voice interaction
  const handleVoiceDistractionAlert = useCallback(async (distractionType: string) => {
    console.log('🎤 [VOICE] 🚨 DISTRACTION ALERT TRIGGERED:', {
      distractionType,
      isVoiceEnabled,
      hasCallback: !!onDistractionResponse,
      voiceStatus: voiceStatus.features,
      isExploring
    });

    if (!isVoiceEnabled || !onDistractionResponse || isExploring) {
      console.log('🎤 [VOICE] ❌ Voice alert skipped:', {
        voiceEnabled: isVoiceEnabled,
        hasCallback: !!onDistractionResponse,
        isExploring
      });
      return false;
    }

    // Check if user is already in exploring mode or has already responded
    if (isProcessingResponse.current) {
      console.log('🎤 [VOICE] ❌ Voice alert skipped - response already being processed');
      return false;
    }

    try {
      // Reset processing state
      isProcessingResponse.current = false;

      setIsSpeaking(true);
      console.log('🎤 [VOICE] 🔊 Speaking initial distraction alert...');

      // Speak the initial alert if ElevenLabs is available
      if (voiceStatus.features.elevenLabs) {
        try {
          const { ElevenLabsService } = await import('../services/ElevenLabsService');
          await ElevenLabsService.speakDistractionAlert(distractionType);
          console.log('🎤 [VOICE] ✅ Initial alert spoken');
        } catch (error) {
          console.warn('🎤 [VOICE] ⚠️ Failed to speak initial alert:', (error as Error).message);
        }
      }

      setIsSpeaking(false);

      // Check again if user has responded while we were speaking
      if (isProcessingResponse.current || isExploring) {
        console.log('🎤 [VOICE] ❌ Aborting voice alert - user responded during speech or is exploring');
        return false;
      }

      // Start persistent listening for responses only if user hasn't responded yet
      console.log('🎤 [VOICE] 🔄 Starting persistent listening after initial alert...');
      await startPersistentListening();

      return true;

    } catch (error) {
      console.error('🎤 [VOICE] ❌ Voice distraction alert failed:', error);
      setIsSpeaking(false);
      return false;
    }
  }, [isVoiceEnabled, onDistractionResponse, voiceStatus, isExploring, startPersistentListening]);

  // Capture voice inspiration
  const captureVoiceInspiration = useCallback(async () => {
    if (!isVoiceEnabled || !onInspirationCaptured) return null;

    try {
      setIsListening(true);
      console.log('🎤 [VOICE] Starting voice inspiration capture...');

      const inspiration = await VoiceService.captureVoiceInspiration();

      if (inspiration) {
        onInspirationCaptured(inspiration, 'voice');
        showSuccess('Voice inspiration recorded', 'Sailing Log');
        console.log('🎤 [VOICE] ✅ Voice inspiration captured:', inspiration);
        return inspiration;
      }

      console.log('🎤 [VOICE] No inspiration captured');
      return null;
    } catch (error) {
      console.error('🎤 [VOICE] Voice inspiration capture failed:', error);
      showError('Voice recording failed, please try again', 'Recording Error');
      return null;
    } finally {
      setIsListening(false);
    }
  }, [isVoiceEnabled, onInspirationCaptured, showError, showSuccess]);

  // Announce voyage completion
  const announceVoyageCompletion = useCallback(async (destinationName: string, duration: string) => {
    if (!isVoiceEnabled) return;

    try {
      setIsSpeaking(true);
      console.log('🎤 [VOICE] Announcing voyage completion...');
      await VoiceService.announceVoyageCompletion(destinationName, duration);
      console.log('🎤 [VOICE] ✅ Voyage completion announced');
    } catch (error) {
      console.error('🎤 [VOICE] Voyage completion announcement failed:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isVoiceEnabled]);

  // Stop all voice activities
  const stopVoiceActivities = useCallback(() => {
    stopPersistentListening();
    VoiceService.stopListening();
    setIsListening(false);
    setIsSpeaking(false);
    console.log('🎤 [VOICE] All voice activities stopped');
  }, [stopPersistentListening]);

  // Update voice status periodically (reduced frequency to prevent excessive updates)
  useEffect(() => {
    if (!isVoyageActive) return;

    const interval = setInterval(() => {
      const newStatus = VoiceService.getStatus();

      // Only update if status actually changed
      if (newStatus.initialized !== voiceStatus.initialized ||
        newStatus.listening !== voiceStatus.listening ||
        newStatus.features.speechRecognition !== voiceStatus.features.speechRecognition ||
        newStatus.features.elevenLabs !== voiceStatus.features.elevenLabs) {
        setVoiceStatus(newStatus);
        setIsVoiceEnabled(newStatus.initialized && newStatus.features.speechRecognition);
      }
    }, 5000); // Reduced from 2000ms to 5000ms

    return () => clearInterval(interval);
  }, [isVoyageActive, voiceStatus]);

  // Cleanup on unmount or voyage end
  useEffect(() => {
    if (!isVoyageActive) {
      stopVoiceActivities();
    }
  }, [isVoyageActive, stopVoiceActivities]);

  // Cleanup persistent listening on unmount
  useEffect(() => {
    return () => {
      if (persistentListeningInterval.current) {
        clearTimeout(persistentListeningInterval.current);
      }
    };
  }, []);

  // Debug logging for voice state changes
  useEffect(() => {
    console.log('🎤 [VOICE] State update:', {
      isVoiceEnabled,
      isListening,
      isSpeaking,
      isPersistentListening,
      isVoyageActive,
      isExploring,
      features: voiceStatus.features
    });
  }, [isVoiceEnabled, isListening, isSpeaking, isPersistentListening, isVoyageActive, isExploring, voiceStatus]);

  return {
    isVoiceEnabled,
    isListening,
    isSpeaking,
    isPersistentListening,
    voiceStatus,
    handleVoiceDistractionAlert,
    startPersistentListening,
    stopPersistentListening,
    captureVoiceInspiration,
    announceVoyageCompletion,
    stopVoiceActivities
  };
};