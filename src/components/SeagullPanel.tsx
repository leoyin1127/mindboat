import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { designSystem } from '../styles/designSystem';

interface SeagullPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  message?: string;
}

export const SeagullPanel: React.FC<SeagullPanelProps> = ({
  isVisible,
  onClose,
  message = "Captain, it seems we've veered off course. Let me check on our current situation."
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-start voice interaction when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      startVoiceInteraction();
    } else {
      stopVoiceInteraction();
    }

    return () => {
      stopVoiceInteraction();
    };
  }, [isVisible]);

  const startVoiceInteraction = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Set up audio analysis for visual feedback
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up MediaRecorder for continuous recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Send audio chunk to backend for real-time processing
          sendAudioChunk(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Final audio blob when recording stops
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        sendFinalAudio(audioBlob);
      };

      // Start recording with time slices for continuous streaming
      mediaRecorder.start(1000); // Send data every 1 second
      setIsRecording(true);
      setConnectionStatus('connected');

      // Start audio level monitoring
      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting voice interaction:', error);
      setConnectionStatus('error');
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('Microphone access denied');
      }
    }
  };

  const stopVoiceInteraction = () => {
    // Stop recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setAudioLevel(0);
    setConnectionStatus('connecting');
  };

  const handleStopConversation = () => {
    // Stop voice interaction first
    stopVoiceInteraction();
    
    // Then close the panel
    onClose?.();
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
      
      setAudioLevel(normalizedLevel);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const sendAudioChunk = async (audioData: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioData, 'audio-chunk.webm');
      formData.append('timestamp', new Date().toISOString());
      formData.append('type', 'chunk');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        console.error('Failed to send audio chunk:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  };

  const sendFinalAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'final-audio.webm');
      formData.append('timestamp', new Date().toISOString());
      formData.append('type', 'final');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        console.error('Failed to send final audio:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending final audio:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[600px]">
      {/* Compact glass panel */}
      <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                      backdrop-blur-2xl border border-white/25 rounded-2xl px-4 py-3
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                      before:absolute before:inset-0 before:rounded-2xl 
                      before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                      before:pointer-events-none overflow-hidden">
        
        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent 
                        rounded-2xl pointer-events-none"></div>
        
        {/* Main content - horizontal layout */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          {/* Left: Seagull Avatar with status indicator */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 
                            shadow-lg relative">
              <img
                src="/截屏2025-06-30 09.27.12 copy.png"
                alt="Seagull Captain"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback seagull image
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/158251/bird-seagull-animal-nature-158251.jpeg?auto=compress&cs=tinysrgb&w=80';
                }}
              />
              
              {/* Voice activity indicator */}
              {isRecording && (
                <div className="absolute inset-0 rounded-full border border-green-400/60 
                                animate-pulse bg-green-400/10"></div>
              )}
            </div>
            
            {/* Connection status indicator - small dot on avatar */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white/30 
                            flex items-center justify-center">
              {connectionStatus === 'connected' && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              {connectionStatus === 'connecting' && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
              {connectionStatus === 'error' && (
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Center: Message text */}
          <div className="flex-1 min-w-0">
            <p className="text-white/90 font-inter text-sm leading-relaxed italic truncate">
              "{message}"
            </p>
          </div>

          {/* Right: Audio visualizer and close button */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Compact audio level bars - only 4 bars */}
            <div className="flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    audioLevel * 4 > i 
                      ? 'bg-green-400 h-4' 
                      : 'bg-white/20 h-1'
                  }`}
                />
              ))}
            </div>

            {/* Close conversation button - glass style with X icon */}
            <button
              onClick={handleStopConversation}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 
                         backdrop-blur-md border border-white/25 shadow-lg relative overflow-hidden group
                         bg-gradient-to-br from-white/15 via-white/10 to-white/8
                         hover:from-white/20 hover:via-white/15 hover:to-white/12 
                         hover:border-white/35"
              title="Close conversation"
            >
              {/* Button inner glow */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-white/5 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Close X icon */}
              <X className="w-4 h-4 text-white/80 hover:text-white relative z-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};