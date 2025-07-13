import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, RefreshCw } from 'lucide-react';
import { designSystem } from '../styles/designSystem';
import { auth } from '../lib/auth';

interface WelcomePanelProps {
  isVisible: boolean;
  onVoiceSubmitSuccess?: () => void;
}

interface ErrorState {
  type: 'speech' | 'network' | 'processing' | 'authentication' | 'validation' | null;
  message: string;
  canRetry: boolean;
}

export const WelcomePanel: React.FC<WelcomePanelProps> = ({
  isVisible,
  onVoiceSubmitSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'voice'>('welcome');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<ErrorState>({ type: null, message: '', canRetry: false });
  const [retryCount, setRetryCount] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRIES = 3;
  const RECORDING_TIMEOUT = 120000; // 2 minutes

  const clearError = () => {
    setError({ type: null, message: '', canRetry: false });
  };

  const handleError = (type: ErrorState['type'], message: string, canRetry: boolean = true) => {
    setError({ type, message, canRetry });
    setIsRecording(false);
    setIsListening(false);
    setIsProcessing(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const getSpeechErrorMessage = (error: string): string => {
    switch (error) {
      case 'no-speech':
        return 'No speech detected. Please try speaking closer to your microphone.';
      case 'audio-capture':
        return 'Unable to access microphone. Please check your microphone permissions.';
      case 'not-allowed':
        return 'Microphone access denied. Please allow microphone access and try again.';
      case 'network':
        return 'Network error occurred. Please check your internet connection.';
      case 'service-not-allowed':
        return 'Speech recognition service is not available. Please try again later.';
      case 'bad-grammar':
        return 'Speech recognition grammar error. Please try speaking more clearly.';
      case 'language-not-supported':
        return 'Language not supported. Please make sure you\'re speaking in English.';
      default:
        return 'Speech recognition error occurred. Please try again.';
    }
  };

  useEffect(() => {
    // Clear error when component mounts or becomes visible
    if (isVisible) {
      clearError();
    }

    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            clearError(); // Clear any previous errors when speech is detected
          }
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionError) => {
          console.error('Speech recognition error:', event.error);
          const errorMessage = getSpeechErrorMessage(event.error);
          handleError('speech', errorMessage, true);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (isRecording) {
            setIsRecording(false);
            setHasRecorded(true);
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }
    } else {
      handleError('speech', 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.', false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isVisible, isRecording]);

  const handleNext = () => {
    clearError();
    setCurrentStep('voice');
  };

  const startRecording = async () => {
    if (!recognitionRef.current) {
      handleError('speech', 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.', false);
      return;
    }

    try {
      clearError();
      setIsRecording(true);
      setIsListening(true);
      setTranscript('');
      setRecordingTime(0);
      setRetryCount(0);

      // Start the timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Set recording timeout
      timeoutRef.current = setTimeout(() => {
        handleError('speech', 'Recording timed out. Please try again with a shorter message.', true);
      }, RECORDING_TIMEOUT);

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      handleError('speech', 'Unable to start speech recognition. Please try again.', true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
    setHasRecorded(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      handleError('validation', 'No speech detected. Please try recording again.', true);
      return;
    }

    setIsProcessing(true);
    clearError();

    try {
      console.log('🎤 Processing voice transcript...');

      // Get current user and their goal
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        handleError('authentication', 'User not authenticated. Please refresh the page and try again.', true);
        return;
      }

      const goalText = currentUser.guidingStar || 'No specific goal set';

      // Prepare the request payload
      const payload = {
        transcript: transcript.trim(),
        user_id: currentUser.id,
        goal_text: goalText
      };

      console.log('Sending to process-voice edge function...');
      console.log('User ID:', currentUser.id);
      console.log('Goal text:', goalText);
      console.log('Transcript:', transcript.trim());

      // Call the process-voice edge function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Voice processing failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status >= 500) {
          handleError('processing', `Server error: ${errorMessage}. Please try again.`, true);
        } else if (response.status === 401) {
          handleError('authentication', 'Authentication failed. Please refresh the page and try again.', true);
        } else {
          handleError('processing', errorMessage, true);
        }
        return;
      }

      const result = await response.json();
      console.log('✅ Voice processing successful:', result);
      console.log('Extracted tasks:', result.tasks);
      console.log('Transcript:', result.transcript);

      // Reset state after successful processing
      setHasRecorded(false);
      setRecordingTime(0);
      setTranscript('');
      setRetryCount(0);
      clearError();

      // Call the success callback to trigger JourneyPanel
      onVoiceSubmitSuccess?.();

    } catch (error) {
      console.error('❌ Voice processing error:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          handleError('network', 'Request timed out. Please try again with a shorter message.', true);
        } else if (error.message.includes('fetch')) {
          handleError('network', 'Network error. Please check your internet connection and try again.', true);
        } else {
          handleError('processing', `Processing error: ${error.message}`, true);
        }
      } else {
        handleError('processing', 'Unknown error occurred. Please try again.', true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      clearError();

      if (error.type === 'speech' || error.type === 'validation') {
        handleReRecord();
      } else {
        handleSubmit();
      }
    } else {
      handleError('processing', 'Maximum retry attempts reached. Please refresh the page and try again.', false);
    }
  };

  const handleReRecord = () => {
    setHasRecorded(false);
    setRecordingTime(0);
    setIsRecording(false);
    setTranscript('');
    setRetryCount(0);
    clearError();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 transform -translate-y-1/2 z-40 w-[480px]"
      style={{ left: '65%', transform: 'translateX(-50%) translateY(-50%)' }}>
      {/* Enhanced glass panel with Apple-inspired depth */}
      <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                      backdrop-blur-2xl border border-white/25 rounded-3xl p-10
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                      before:absolute before:inset-0 before:rounded-3xl 
                      before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                      before:pointer-events-none overflow-hidden transition-all duration-500">

        <div className="relative z-10">
          {currentStep === 'welcome' && (
            <div className="space-y-6">
              {/* Header - left aligned title, 32px */}
              <div className="mb-8">
                <h2 className="text-[32px] font-playfair font-normal text-white mb-6 leading-tight text-left">
                  Welcome aboard!
                </h2>
              </div>

              {/* Welcome content */}
              <div className={`space-y-4 ${designSystem.colors.text.secondary} ${designSystem.typography.fonts.body} leading-relaxed`}>
                <p>
                  The system uses sensors to check if you're doing something important right now.
                </p>
                <p>
                  When you're working toward your goal, different winds of intention will blow,
                  pushing your little boat forward and helping you get where you want to go.
                </p>
              </div>

              {/* Apple-style Next button - using Back button size (smaller) */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleNext}
                  className="px-8 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                             hover:from-white/20 hover:via-white/15 hover:to-white/12
                             text-white rounded-xl transition-all duration-300
                             border border-white/25 hover:border-white/35
                             font-inter font-medium text-base backdrop-blur-md
                             shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]
                             hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]
                             transform hover:scale-[1.02] active:scale-[0.98] min-w-[80px]"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 'voice' && (
            <div className="space-y-6">
              {/* Header - smaller title text */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-playfair font-normal text-white mb-4 leading-tight">
                  Tell the wind of intention,
                </h2>
                <p className={`${designSystem.colors.text.secondary} ${designSystem.typography.fonts.body}`}>
                  What important thing do you want to do today?
                </p>
              </div>

              {/* Centered recording button */}
              <div className="text-center space-y-6">
                {/* Enhanced recording button - centered */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || (error.type !== null && !error.canRetry)}
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 
                              backdrop-blur-md border shadow-lg relative overflow-hidden group mx-auto 
                              ${isProcessing || (error.type !== null && !error.canRetry) ? 'opacity-50 cursor-not-allowed' : ''}
                              ${isRecording
                      ? 'bg-red-400/20 border-red-300/30 shadow-red-400/20 animate-pulse'
                      : 'bg-gradient-to-br from-white/15 via-white/10 to-white/8 border-white/25 shadow-white/10 hover:from-white/20 hover:via-white/15 hover:to-white/12'
                    }`}
                >
                  {/* Button inner glow */}
                  <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${isRecording
                    ? 'bg-gradient-to-br from-red-300/20 to-red-500/20'
                    : 'bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100'
                    }`}></div>

                  {isRecording ? (
                    <Square className="w-8 h-8 text-white relative z-10" />
                  ) : (
                    <Mic className="w-8 h-8 text-white relative z-10" />
                  )}
                </button>

                {/* Recording status - smaller text */}
                {isRecording && (
                  <div className={`${designSystem.colors.text.secondary} font-mono text-base`}>
                    {isListening ? 'Listening...' : 'Recording:'} {formatTime(recordingTime)}
                  </div>
                )}

                {/* Processing status */}
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                    rounded-full animate-spin"></div>
                    <span className={`${designSystem.colors.text.secondary} font-mono text-base`}>
                      Processing voice...
                    </span>
                  </div>
                )}

                {/* Error display */}
                {error.type !== null && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-400/30 rounded-lg backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-grow">
                        <p className="text-red-200 text-sm font-medium mb-1">
                          {error.type === 'speech' ? 'Speech Recognition Error' :
                            error.type === 'network' ? 'Network Error' :
                              error.type === 'processing' ? 'Processing Error' :
                                error.type === 'authentication' ? 'Authentication Error' :
                                  error.type === 'validation' ? 'Validation Error' :
                                    'Error'}
                        </p>
                        <p className="text-red-300 text-sm">
                          {error.message}
                        </p>
                        {error.canRetry && retryCount < MAX_RETRIES && (
                          <button
                            onClick={handleRetry}
                            className="mt-3 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 
                                     text-red-200 text-sm rounded-lg transition-colors duration-200
                                     border border-red-400/30 hover:border-red-400/50
                                     flex items-center gap-2"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry ({MAX_RETRIES - retryCount} attempts left)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcript display */}
                {transcript && error.type === null && (
                  <div className="mt-4 p-4 bg-black/20 rounded-lg border border-white/20 backdrop-blur-sm">
                    <p className={`${designSystem.colors.text.secondary} text-sm mb-2`}>
                      Transcript:
                    </p>
                    <p className="text-white text-base">
                      {transcript}
                    </p>
                  </div>
                )}

                {/* Instructions */}
                <p className={`${designSystem.typography.sizes.sm} ${designSystem.colors.text.muted}`}>
                  {error.type !== null ? 'Please resolve the error above to continue' :
                    isProcessing ? 'Converting speech to tasks...' :
                      isRecording ? 'Speak now, click to stop when done' :
                        transcript ? 'Review your transcript and submit' :
                          'Click to start recording'}
                </p>

                {/* Submit and Re-record buttons - only show after recording */}
                {hasRecorded && !isRecording && !isProcessing && (
                  <div className="pt-4 space-y-3">
                    {/* Re-record link - smaller text above submit */}
                    <div className="text-center">
                      <button
                        onClick={handleReRecord}
                        className="text-white/70 hover:text-white text-sm font-inter underline transition-colors duration-200"
                      >
                        Re-record
                      </button>
                    </div>

                    {/* Submit button */}
                    <button
                      onClick={handleSubmit}
                      disabled={error.type !== null || !transcript.trim()}
                      className={`px-10 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                                 text-white rounded-xl transition-all duration-300
                                 border border-white/25 font-inter font-medium text-base backdrop-blur-md
                                 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]
                                 transform active:scale-[0.98]
                                 ${error.type !== null || !transcript.trim()
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:from-white/20 hover:via-white/15 hover:to-white/12 hover:border-white/35 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] hover:scale-[1.02]'
                        }`}
                    >
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};