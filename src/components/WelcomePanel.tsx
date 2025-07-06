import React, { useState, useRef, useEffect } from 'react';
import { Compass, Mic, Square } from 'lucide-react';
import { designSystem, getButtonStyle, getPanelStyle } from '../styles/designSystem';

interface WelcomePanelProps {
  isVisible: boolean;
  onClose?: () => void;
  onVoiceSubmitSuccess?: () => void;
}

export const WelcomePanel: React.FC<WelcomePanelProps> = ({
  isVisible,
  onClose,
  onVoiceSubmitSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'voice'>('welcome');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleNext = () => {
    setCurrentStep('voice');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setHasRecorded(true);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    console.log('Voice input submitted');
    // Reset state after submission
    setHasRecorded(false);
    setRecordingTime(0);
    
    // Call the success callback to trigger JourneyPanel
    onVoiceSubmitSuccess?.();
  };

  const handleReRecord = () => {
    setHasRecorded(false);
    setRecordingTime(0);
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
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
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 
                              backdrop-blur-md border shadow-lg relative overflow-hidden group mx-auto ${
                    isRecording 
                      ? 'bg-red-400/20 border-red-300/30 shadow-red-400/20 animate-pulse' 
                      : 'bg-gradient-to-br from-white/15 via-white/10 to-white/8 border-white/25 shadow-white/10 hover:from-white/20 hover:via-white/15 hover:to-white/12'
                  }`}
                >
                  {/* Button inner glow */}
                  <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${
                    isRecording 
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
                    Recording: {formatTime(recordingTime)}
                  </div>
                )}
                
                {/* Instructions */}
                <p className={`${designSystem.typography.sizes.sm} ${designSystem.colors.text.muted}`}>
                  {isRecording ? 'Click to stop recording' : 'Click to start recording'}
                </p>

                {/* Submit and Re-record buttons - only show after recording */}
                {hasRecorded && !isRecording && (
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
                      className="px-10 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                                 hover:from-white/20 hover:via-white/15 hover:to-white/12
                                 text-white rounded-xl transition-all duration-300
                                 border border-white/25 hover:border-white/35
                                 font-inter font-medium text-base backdrop-blur-md
                                 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]
                                 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]
                                 transform hover:scale-[1.02] active:scale-[0.98]"
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