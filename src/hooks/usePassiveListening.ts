import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePassiveListeningProps {
  currentSessionId: string | null;
  isSessionActive: boolean;
}

interface UsePassiveListeningReturn {
  isPassiveListening: boolean;
  isSpeechDetected: boolean;
  passiveTranscript: string;
  startPassiveListening: (sessionId?: string) => void;
  stopPassiveListening: () => void;
}

export const usePassiveListening = ({
  currentSessionId,
  isSessionActive
}: UsePassiveListeningProps): UsePassiveListeningReturn => {
  const [isPassiveListening, setIsPassiveListening] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [passiveTranscript, setPassiveTranscript] = useState<string>('');
  
  const passiveRecognitionRef = useRef<SpeechRecognition | null>(null);
  const speechDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const isPassiveListeningRef = useRef<boolean>(false);
  const shouldContinueListeningRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    isPassiveListeningRef.current = isPassiveListening;
  }, [isPassiveListening]);

  const logPassiveSpeech = useCallback(async (transcript: string) => {
    const activeSessionId = activeSessionIdRef.current || currentSessionId;
    
    if (!activeSessionId || !transcript.trim()) {
      console.warn('⚠️ Cannot log speech - missing session ID or transcript');
      console.warn('🔍 Debug info:', { 
        activeSessionIdRef: activeSessionIdRef.current, 
        currentSessionId, 
        transcriptLength: transcript.length 
      });
      return;
    }

    try {
      console.log('💾 Storing speech to database:', transcript.substring(0, 50) + '...');
      console.log('🔍 Session ID:', activeSessionId);
      console.log('🔍 Transcript length:', transcript.length);
      
      const payload = {
        session_id: activeSessionId,
        transcript: transcript.trim(),
        timestamp: new Date().toISOString(),
        interim: false
      };
      
      console.log('📤 Sending payload:', payload);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-passive-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Speech stored successfully in SailingLog table:', result.event_id);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to store speech:', response.status, response.statusText);
        console.error('❌ Error details:', errorText);
        
        // Try to parse error as JSON for better debugging
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Parsed error:', errorJson);
        } catch (parseError) {
          console.error('❌ Raw error text:', errorText);
        }
      }
    } catch (error) {
      console.error('❌ Network error storing speech:', error);
    }
  }, [currentSessionId]);

  const initializePassiveListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Passive speech recognition started');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the UI with current speech (interim + final)
      if (finalTranscript.trim() || interimTranscript.trim()) {
        setPassiveTranscript(prev => prev + finalTranscript);
        console.log('🎤 Speech detected:', 
          finalTranscript.trim() ? `Final: "${finalTranscript.trim()}"` : `Interim: "${interimTranscript.trim()}"`);
        
        // Indicate speech is being detected
        setIsSpeechDetected(true);
        
        // Clear the previous timeout and set a new one
        if (speechDetectionTimeoutRef.current) {
          clearTimeout(speechDetectionTimeoutRef.current);
        }
        
        speechDetectionTimeoutRef.current = setTimeout(() => {
          setIsSpeechDetected(false);
        }, 2000); // Reset after 2 seconds of no speech
      }

      // Only log and store final transcripts to database
      if (finalTranscript.trim()) {
        logPassiveSpeech(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      const errorType = event.error;
      
      // Handle different error types appropriately
      if (errorType === 'no-speech') {
        // This is normal - just means no speech was detected for a while
        console.log('🔇 No speech detected, continuing to listen...');
        return; // Don't restart, let onend handle it
      }
      
      if (errorType === 'audio-capture') {
        console.warn('⚠️ Audio capture error - microphone might be in use');
        return; // Don't restart immediately
      }
      
      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        console.error('❌ Speech recognition not allowed:', errorType);
        setIsPassiveListening(false);
        return; // Don't restart
      }
      
      if (errorType === 'network') {
        console.warn('🌐 Network error in speech recognition, will retry...');
      } else {
        console.warn('⚠️ Passive speech recognition error:', errorType);
      }
      
      // For recoverable errors, restart after a short delay
      setTimeout(() => {
        if (shouldContinueListeningRef.current && activeSessionIdRef.current && passiveRecognitionRef.current) {
          try {
            recognition.start();
            console.log('🔄 Restarted passive recognition after error:', errorType);
          } catch (error) {
            console.warn('Failed to restart passive recognition:', error);
          }
        }
      }, 2000); // Longer delay for error recovery
    };

    recognition.onend = () => {
      console.log('🔄 Speech recognition ended, checking if should restart...');
      console.log('🔍 Current state:', {
        shouldContinueListening: shouldContinueListeningRef.current,
        activeSessionId: activeSessionIdRef.current,
        isSessionActive: isSessionActiveRef.current,
        isPassiveListening: isPassiveListeningRef.current,
        hasRecognitionRef: !!passiveRecognitionRef.current
      });
      
      // Only restart if we should continue listening and have an active session
      if (shouldContinueListeningRef.current && activeSessionIdRef.current && passiveRecognitionRef.current) {
        setTimeout(() => {
          try {
            if (shouldContinueListeningRef.current && activeSessionIdRef.current && passiveRecognitionRef.current) {
              recognition.start();
              console.log('✅ Passive recognition restarted after end');
            }
          } catch (error) {
            console.warn('Failed to restart passive recognition after end:', error);
            // If restart fails, try again after a longer delay
            setTimeout(() => {
              if (shouldContinueListeningRef.current && activeSessionIdRef.current && passiveRecognitionRef.current) {
                try {
                  recognition.start();
                  console.log('✅ Passive recognition restarted after retry');
                } catch (retryError) {
                  console.error('Failed to restart passive recognition after retry:', retryError);
                  setIsPassiveListening(false);
                  isPassiveListeningRef.current = false;
                  shouldContinueListeningRef.current = false;
                }
              }
            }, 5000);
          }
        }, 500); // Small delay to prevent rapid restarts
      } else {
        console.log('👋 Not restarting passive recognition - session inactive or listening disabled');
        console.log('🔍 Detailed state:', {
          shouldContinueListening: shouldContinueListeningRef.current,
          activeSessionId: activeSessionIdRef.current,
          isSessionActiveRef: isSessionActiveRef.current,
          isPassiveListeningRef: isPassiveListeningRef.current,
          passiveRecognitionRef: !!passiveRecognitionRef.current
        });
      }
    };

    passiveRecognitionRef.current = recognition;
  }, [isSessionActive, isPassiveListening, logPassiveSpeech]);

  const startPassiveListening = useCallback((sessionId?: string) => {
    const activeSessionId = sessionId || currentSessionId;
    
    if (!activeSessionId) {
      console.warn('Cannot start passive listening: no active session');
      return;
    }

    // Store the session ID and states for later use
    activeSessionIdRef.current = activeSessionId;
    isSessionActiveRef.current = isSessionActive;
    isPassiveListeningRef.current = true;
    shouldContinueListeningRef.current = true;

    if (isPassiveListening) {
      console.log('Passive listening already active');
      return;
    }

    // Initialize recognition if not already done
    if (!passiveRecognitionRef.current) {
      initializePassiveListening();
    }

    if (passiveRecognitionRef.current) {
      try {
        passiveRecognitionRef.current.start();
        setIsPassiveListening(true);
        setPassiveTranscript('');
        console.log('✅ Passive listening started for session:', activeSessionId);
      } catch (error) {
        console.error('Failed to start passive listening:', error);
      }
    }
  }, [currentSessionId, isPassiveListening, initializePassiveListening]);

  const stopPassiveListening = useCallback(() => {
    console.log('🛑 Stopping passive listening...');
    
    if (passiveRecognitionRef.current) {
      try {
        passiveRecognitionRef.current.stop();
        passiveRecognitionRef.current = null;
      } catch (error) {
        console.warn('Error stopping passive recognition:', error);
      }
    }
    
    // Clear speech detection timeout
    if (speechDetectionTimeoutRef.current) {
      clearTimeout(speechDetectionTimeoutRef.current);
      speechDetectionTimeoutRef.current = null;
    }
    
    // Clear stored session ID and refs
    activeSessionIdRef.current = null;
    isSessionActiveRef.current = false;
    isPassiveListeningRef.current = false;
    shouldContinueListeningRef.current = false;
    
    setIsPassiveListening(false);
    setIsSpeechDetected(false);
    setPassiveTranscript('');
    console.log('⏹️ Passive listening stopped');
  }, []);

  return {
    isPassiveListening,
    isSpeechDetected,
    passiveTranscript,
    startPassiveListening,
    stopPassiveListening
  };
};