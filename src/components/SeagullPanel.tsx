import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Mic, MicOff } from 'lucide-react';

interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioUrl?: string;
}

interface SeagullPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  message?: string;
  conversationContext?: {
    type?: string;
    sessionId?: string;
    consecutiveDrifts?: number;
    conversationId?: string;
    messageId?: string;
    userId?: string;
    isDriftIntervention?: boolean;
  } | null;
}

export const SeagullPanel: React.FC<SeagullPanelProps> = ({
  isVisible,
  onClose,
  message = "Captain, it seems we've veered off course. Let me check on our current situation.",
  conversationContext
}) => {
  // Existing state
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  
  // New conversation state management
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [currentTurnNumber, setCurrentTurnNumber] = useState(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isWaitingForUser, setIsWaitingForUser] = useState(false);
  const [autoRestartEnabled, setAutoRestartEnabled] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const conversationTimeoutRef = useRef<number | null>(null);


  // Auto-start voice interaction when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      // Add initial AI message as first turn
      const initialTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      setConversationTurns([initialTurn]);
      setCurrentTurnNumber(1);
      setIsWaitingForUser(true);
      
      // Start voice interaction
      startVoiceInteraction();
    } else {
      // Cleanup conversation state
      setConversationId(null);
      setConversationTurns([]);
      setCurrentTurnNumber(0);
      setIsPlayingTTS(false);
      setIsWaitingForUser(false);
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }
      
      stopVoiceInteraction();
    }

    return () => {
      // Cleanup on unmount
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }
      
      stopVoiceInteraction();
    };
  }, [isVisible, message]);

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

    // Close audio context only if it's not already closed
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
    console.log('🛑 Manually stopping conversation');
    setAutoRestartEnabled(false);
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // Stop voice interaction
    stopVoiceInteraction();

    // Clear timeouts
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
    }

    // Close the panel
    onClose?.();
  };
  
  const toggleAutoRestart = () => {
    setAutoRestartEnabled(prev => !prev);
    console.log('🔄 Auto-restart:', !autoRestartEnabled ? 'enabled' : 'disabled');
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
      } else {
        const result = await response.json();
        console.log('Audio chunk acknowledged:', result);
      }
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  };

  // Start conversation timeout
  const startConversationTimeout = () => {
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
    }
    
    // Auto-close conversation after 45 seconds of inactivity
    conversationTimeoutRef.current = window.setTimeout(() => {
      console.log('⏰ Conversation timeout - closing SeagullPanel');
      handleStopConversation();
    }, 45000);
  };

  // Reset conversation timeout
  const resetConversationTimeout = () => {
    startConversationTimeout();
  };

  // Auto-restart voice interaction after TTS completes
  const handleTTSComplete = () => {
    console.log('🔄 TTS completed, checking for auto-restart...');
    setIsPlayingTTS(false);
    
    if (autoRestartEnabled && isVisible) {
      // Wait a moment then restart listening
      setTimeout(() => {
        console.log('🎤 Auto-restarting voice listening for continued conversation');
        setIsWaitingForUser(true);
        startVoiceInteraction();
        resetConversationTimeout();
      }, 1500); // 1.5 second delay after TTS ends
    }
  };

  const sendFinalAudio = async (audioBlob: Blob) => {
    try {
      setIsWaitingForUser(false);
      
      // Create user turn from audio
      const userTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '[Voice message]', // Will be replaced with transcription if available
        timestamp: new Date().toISOString()
      };
      
      // Add user turn to conversation
      setConversationTurns(prev => [...prev, userTurn]);
      
      console.log('📦 Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type,
        hasValidSize: audioBlob.size > 0
      });
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'final-audio.webm');
      formData.append('timestamp', new Date().toISOString());
      formData.append('type', 'final');
      
      // Include conversation context
      const effectiveConversationId = conversationId || conversationContext?.conversationId || '';
      formData.append('conversation_id', effectiveConversationId);
      formData.append('turn_number', currentTurnNumber.toString());
      formData.append('conversation_history', JSON.stringify(conversationTurns));
      
      // Include drift intervention context if available
      if (conversationContext?.isDriftIntervention) {
        formData.append('intervention_context', JSON.stringify({
          sessionId: conversationContext.sessionId,
          consecutiveDrifts: conversationContext.consecutiveDrifts,
          userId: conversationContext.userId,
          type: 'drift_intervention'
        }));
      }
      
      // Add appropriate query based on context
      let queryText = 'Continue our conversation';
      if (currentTurnNumber === 1) {
        queryText = conversationContext?.isDriftIntervention 
          ? `I've been distracted and need help getting back on track after ${conversationContext.consecutiveDrifts || 5} minutes of drifting`
          : 'I need help staying focused on my current task';
      }
      
      formData.append('query', queryText);

      console.log(`🗣️ Sending turn ${currentTurnNumber} of conversation (ID: ${conversationId || 'new'})`);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        console.error('Failed to send final audio:', response.statusText);
        return;
      }

      // Parse the AI response with TTS audio
      const result = await response.json();
      console.log('✅ Voice interaction response:', result);

      if (result.success && result.aiResponse) {
        // Update conversation ID if received (prioritize from context for drift interventions)
        const newConversationId = result.conversationId || conversationContext?.conversationId;
        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
          console.log('💬 Conversation ID established:', newConversationId, conversationContext?.isDriftIntervention ? '(drift intervention)' : '(new conversation)');
        }
        
        // Update user turn with transcription if available
        if (result.transcription) {
          setConversationTurns(prev => 
            prev.map(turn => 
              turn.id === userTurn.id 
                ? { ...turn, content: result.transcription }
                : turn
            )
          );
        }
        
        // Create AI response turn
        const aiTurn: ConversationTurn = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.aiResponse.text,
          timestamp: new Date().toISOString(),
          audioUrl: result.aiResponse.audioUrl
        };
        
        // Add AI turn to conversation
        setConversationTurns(prev => [...prev, aiTurn]);
        setCurrentTurnNumber(prev => prev + 1);
        
        console.log('🤖 AI Response:', result.aiResponse.text);

        // Play TTS audio if available
        if (result.aiResponse.audioUrl && result.aiResponse.ttsSuccess) {
          try {
            setIsPlayingTTS(true);
            const audio = new Audio(result.aiResponse.audioUrl);
            currentAudioRef.current = audio;
            
            // Set up auto-restart when audio completes
            audio.onended = handleTTSComplete;
            audio.onerror = () => {
              console.error('Error playing TTS audio');
              setIsPlayingTTS(false);
              handleTTSComplete(); // Still trigger restart on error
            };
            
            audio.play();
            console.log('🔊 Playing TTS audio response');
          } catch (audioError) {
            console.error('Error playing TTS audio:', audioError);
            setIsPlayingTTS(false);
            handleTTSComplete(); // Trigger restart even on error
          }
        } else {
          console.warn('No TTS audio available');
          if (result.aiResponse.ttsError) {
            console.error('TTS conversion failed:', result.aiResponse.ttsError);
          }
          // Still trigger restart even without audio
          handleTTSComplete();
        }
      }
    } catch (error) {
      console.error('Error sending final audio:', error);
      setIsPlayingTTS(false);
      // Try to restart conversation even on error
      if (autoRestartEnabled && isVisible) {
        setTimeout(() => {
          startVoiceInteraction();
        }, 2000);
      }
    }
  };

  // Determine current conversation state message
  const getConversationStateMessage = () => {
    if (isPlayingTTS) return 'Speaking...';
    if (isRecording) return 'Listening...';
    if (isWaitingForUser) return 'Ready to listen';
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (connectionStatus === 'error') return 'Connection error';
    return 'Ready';
  };

  const getConversationStateColor = () => {
    if (isPlayingTTS) return 'text-blue-300';
    if (isRecording) return 'text-green-300';
    if (isWaitingForUser) return 'text-yellow-300';
    if (connectionStatus === 'error') return 'text-red-300';
    return 'text-white/70';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[700px]">
      {/* Enhanced glass panel with conversation features */}
      <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                      backdrop-blur-2xl border border-white/25 rounded-2xl px-4 py-4
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                      before:absolute before:inset-0 before:rounded-2xl 
                      before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                      before:pointer-events-none overflow-hidden">

        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent 
                        rounded-2xl pointer-events-none"></div>

        {/* Conversation header */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
          {/* Conversation info */}
          <div className="flex items-center gap-2 text-xs font-inter">
            <MessageCircle className="w-3 h-3 text-blue-300" />
            <span className="text-white/60">Turn {currentTurnNumber}</span>
            {conversationId && (
              <span className="text-white/40">• ID: {conversationId.slice(0, 8)}...</span>
            )}
          </div>
          
          {/* Auto-restart toggle */}
          <button
            onClick={toggleAutoRestart}
            className={`px-2 py-1 rounded-lg text-xs font-inter transition-all duration-200 
                       border ${
                         autoRestartEnabled 
                           ? 'bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30' 
                           : 'bg-gray-500/20 border-gray-400/40 text-gray-300 hover:bg-gray-500/30'
                       }`}
            title={autoRestartEnabled ? 'Auto-restart enabled' : 'Auto-restart disabled'}
          >
            🔄 {autoRestartEnabled ? 'Auto' : 'Manual'}
          </button>
        </div>

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

          {/* Center: Message and conversation state */}
          <div className="flex-1 min-w-0">
            {/* Current message */}
            <p className="text-white/90 font-inter text-sm leading-relaxed italic truncate mb-1">
              "{conversationTurns.length > 0 ? conversationTurns[conversationTurns.length - 1].content : message}"
            </p>
            
            {/* Conversation state */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-xs font-inter ${getConversationStateColor()}`}>
                {isRecording && <Mic className="w-3 h-3" />}
                {isPlayingTTS && <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />}
                {isWaitingForUser && <MicOff className="w-3 h-3" />}
                <span>{getConversationStateMessage()}</span>
              </div>
              
              {conversationTurns.length > 1 && (
                <span className="text-white/40 text-xs">
                  • {conversationTurns.length - 1} exchanges
                </span>
              )}
            </div>
          </div>

          {/* Right: Audio visualizer and controls */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Enhanced audio level bars with conversation state */}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => {
                let barColor = 'bg-white/20';
                let barHeight = 'h-1';
                
                if (isRecording && audioLevel * 5 > i) {
                  barColor = 'bg-green-400';
                  barHeight = 'h-4';
                } else if (isPlayingTTS) {
                  barColor = 'bg-blue-400';
                  barHeight = Math.random() > 0.5 ? 'h-3' : 'h-2'; // Simulate audio playback
                } else if (isWaitingForUser && i < 2) {
                  barColor = 'bg-yellow-400/60';
                  barHeight = 'h-2';
                }
                
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${barColor} ${barHeight}`}
                  />
                );
              })}
            </div>

            {/* Close conversation button - enhanced with state */}
            <button
              onClick={handleStopConversation}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 
                         backdrop-blur-md border border-white/25 shadow-lg relative overflow-hidden group
                         bg-gradient-to-br from-white/15 via-white/10 to-white/8
                         hover:from-red-500/20 hover:via-red-400/15 hover:to-red-300/10 
                         hover:border-red-400/35"
              title={`End conversation (${conversationTurns.length - 1} exchanges)`}
            >
              {/* Button inner glow */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-white/5 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Close X icon */}
              <X className="w-4 h-4 text-white/80 group-hover:text-red-300 relative z-10 transition-colors duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};