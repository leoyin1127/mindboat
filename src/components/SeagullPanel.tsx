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
  isSessionActive?: boolean;
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
  message = "Hello Captain! How can I assist you today?",
  isSessionActive = true,
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
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [autoRestartEnabled, setAutoRestartEnabled] = useState(true);
  const [isConversationEnded, setIsConversationEnded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const conversationTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isStoppingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const currentTurnNumberRef = useRef<number>(0);
  const initialMessageRef = useRef<string>(message);

  // Update ref whenever turn number changes
  useEffect(() => {
    currentTurnNumberRef.current = currentTurnNumber;
  }, [currentTurnNumber]);

  // Auto-start voice interaction when panel becomes visible
  useEffect(() => {
    if (isVisible && !isMountedRef.current) {
      // This is a new panel opening
      isMountedRef.current = true;
      
      // Reset conversation ended flag and stopping flag for new conversation
      setIsConversationEnded(false);
      isStoppingRef.current = false;
      
      // Generate or use existing conversation ID
      let effectiveConversationId = conversationContext?.conversationId || conversationId;
      if (!effectiveConversationId) {
        // Generate new conversation ID for this session
        effectiveConversationId = crypto.randomUUID();
        setConversationId(effectiveConversationId);
        conversationIdRef.current = effectiveConversationId;
        console.log('🆔 Generated new conversation ID:', effectiveConversationId);
      } else {
        setConversationId(effectiveConversationId);
        conversationIdRef.current = effectiveConversationId;
        console.log('🔄 Using existing conversation ID:', effectiveConversationId);
      }
      
      // Add initial AI message as first turn
      // Store the current message for this conversation
      initialMessageRef.current = message;
      
      const initialTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      setConversationTurns([initialTurn]);
      setCurrentTurnNumber(0); // Start at 0 since this is the initial AI message
      currentTurnNumberRef.current = 0; // Sync ref immediately
      setIsWaitingForUser(true);
      
      // Start voice interaction
      startVoiceInteraction();
    } else if (!isVisible && isMountedRef.current) {
      // Panel is closing
      isMountedRef.current = false;
      
      // Cleanup conversation state
      setConversationId(null);
      conversationIdRef.current = null;
      setConversationTurns([]);
      setCurrentTurnNumber(0);
      currentTurnNumberRef.current = 0; // Reset ref as well
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
      // Mark as unmounted and stopping immediately
      isMountedRef.current = false;
      isStoppingRef.current = true;
      
      // Abort all ongoing requests immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear timeout immediately
      if (conversationTimeoutRef.current) {
        window.clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }
      
      // Cleanup audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      // Clear MediaRecorder event handlers before stopping
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.onerror = null;
      }
      
      stopVoiceInteraction();
    };
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps
  // Only depend on isVisible to prevent cleanup on message changes

  const startVoiceInteraction = async (preserveConversation = false) => {
    // Don't start if conversation has been ended or stopping
    if (isConversationEnded || isStoppingRef.current) {
      console.log('🚫 Conversation ended or stopping - not starting voice interaction');
      return;
    }
    
    // Reset stopping flag and create new abort controller
    isStoppingRef.current = false;
    abortControllerRef.current = new AbortController();
    
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
          // Only process chunks if component is still mounted and not stopping
          if (isMountedRef.current && !isConversationEnded && !isStoppingRef.current) {
            audioChunks.push(event.data);

            // Send audio chunk to backend for real-time processing
            sendAudioChunk(event.data);
          } else {
            console.log('🚫 Ignoring audio chunk - component unmounted, conversation ended, or stopping');
          }
        }
      };

      mediaRecorder.onstop = () => {
        // Check if conversation has been ended - don't process final audio
        if (isConversationEnded) {
          console.log('🚫 Conversation ended - skipping final audio processing');
          return;
        }
        
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
      
      // Start conversation timeout
      startConversationTimeout();
      
      console.log('🎤 Voice interaction started successfully');

    } catch (error) {
      console.error('Error starting voice interaction:', error);
      setConnectionStatus('error');

      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('Microphone access denied');
      }
    }
  };

  const stopVoiceInteraction = () => {
    console.log('🛑 Stopping voice interaction - cleaning up all resources');
    
    // Set stopping flag immediately
    isStoppingRef.current = true;
    
    // Stop recording immediately
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        // Remove all event listeners before stopping
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.onerror = null;
        
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn('Error stopping MediaRecorder:', e);
        }
      }
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);

    // Abort all ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context only if it's not already closed
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 Stopped media track:', track.kind);
      });
      streamRef.current = null;
    }

    setAudioLevel(0);
    setConnectionStatus('connecting');
    setIsWaitingForUser(false);
  };

  const handleStopConversation = () => {
    console.log('🛑 Manually stopping conversation - ending completely');
    
    // Mark conversation as ended to prevent any further processing
    setIsConversationEnded(true);
    setAutoRestartEnabled(false);
    setIsWaitingForUser(false);
    setIsProcessingSpeech(false);
    setIsPlayingTTS(false);
    
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
      conversationTimeoutRef.current = null;
    }

    // Clear conversation state
    setConversationId(null);
    conversationIdRef.current = null;
    setConversationTurns([]);
    setCurrentTurnNumber(0);
    currentTurnNumberRef.current = 0; // Reset ref as well

    // Close the panel immediately
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
    // Don't send chunks if component is unmounted, conversation ended, or stopping
    if (!isMountedRef.current || isConversationEnded || isStoppingRef.current) {
      console.log('🚫 Skipping audio chunk send - component unmounted, conversation ended, or stopping');
      return;
    }
    
    // Reset conversation timeout on activity
    resetConversationTimeout();
    
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
        body: formData,
        signal: abortControllerRef.current?.signal
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
    
    // Don't restart if conversation has been ended
    if (isConversationEnded) {
      console.log('🚫 Conversation ended - not restarting');
      return;
    }
    
    // Check current visibility and session state to prevent stale restarts
    if (autoRestartEnabled && isVisible && isSessionActive && onClose) {
      // Wait a moment then restart listening
      setTimeout(() => {
        // Double-check all conditions again after timeout including ended flag
        if (autoRestartEnabled && isVisible && isSessionActive && !isConversationEnded) {
          console.log('🎤 Auto-restarting voice listening for continued conversation');
          setIsWaitingForUser(true);
          startVoiceInteraction(true); // Preserve conversation state
          resetConversationTimeout();
        } else {
          console.log('🚫 Auto-restart cancelled - panel closed, session ended, or conversation ended');
        }
      }, 1500); // 1.5 second delay after TTS ends
    } else {
      console.log('🚫 Auto-restart disabled, panel not visible, or session inactive');
    }
  };

  const sendFinalAudio = async (audioBlob: Blob) => {
    // Don't process if conversation has been ended
    if (isConversationEnded) {
      console.log('🚫 Conversation ended - not processing final audio');
      return;
    }
    
    try {
      setIsWaitingForUser(false);
      setIsProcessingSpeech(true);
      
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
      
      // Include conversation context and user identification
      // Use the conversation ID we generated when the panel opened
      const effectiveConversationId = conversationIdRef.current || conversationId || conversationContext?.conversationId;
      if (!effectiveConversationId) {
        console.error('❌ No conversation ID available - this should not happen');
        console.error('conversationIdRef.current:', conversationIdRef.current);
        console.error('conversationId state:', conversationId);
        console.error('conversationContext?.conversationId:', conversationContext?.conversationId);
        setIsProcessingSpeech(false);
        return;
      }
      
      formData.append('conversation_id', effectiveConversationId);
      formData.append('turn_number', currentTurnNumberRef.current.toString());
      formData.append('conversation_history', JSON.stringify(conversationTurns));
      
      // Always include user and session information
      const userId = conversationContext?.userId || localStorage.getItem('mindboat_user_id') || '';
      const sessionId = conversationContext?.sessionId || localStorage.getItem('mindboat_session_id') || '';
      
      if (!userId) {
        console.error('❌ No user ID available - cannot send voice interaction');
        setIsProcessingSpeech(false);
        return;
      }
      
      formData.append('user_id', userId);
      if (sessionId) {
        formData.append('session_id', sessionId);
      }
      
      // Include drift intervention context if available
      if (conversationContext?.isDriftIntervention) {
        formData.append('intervention_context', JSON.stringify({
          sessionId: conversationContext.sessionId,
          consecutiveDrifts: conversationContext.consecutiveDrifts,
          userId: conversationContext.userId,
          type: 'drift_intervention'
        }));
      }
      
      // Include context information but let Whisper transcribe all audio
      // Only add context flag for drift interventions, not predetermined text
      if (conversationContext?.isDriftIntervention) {
        formData.append('context_type', 'drift_intervention');
        formData.append('context_data', `consecutive_drifts:${conversationContext.consecutiveDrifts || 5}`);
        console.log('🔄 Marked as drift intervention context');
      } else {
        formData.append('context_type', 'regular_conversation');
        console.log('💬 Marked as regular conversation');
      }
      
      console.log('🎵 Sending audio for Whisper transcription (no predetermined text)');
      // Always use Whisper for all turns - no hardcoded queries

      console.log(`🗣️ Sending turn ${currentTurnNumberRef.current} of conversation`, {
        turnNumber: currentTurnNumberRef.current,
        conversationId: effectiveConversationId || 'new',
        hasConversationHistory: conversationTurns.length > 0,
        historyLength: conversationTurns.length
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
        signal: abortControllerRef.current?.signal
      });

      // Parse the response (could be success or error)
      const result = await response.json();
      console.log('📨 Voice interaction response:', result);

      // Handle speech recognition errors
      if (!response.ok || result.error) {
        console.error('❌ Voice interaction failed:', result.message || response.statusText);
        setIsProcessingSpeech(false);
        
        // Update user turn to show error
        setConversationTurns(prev => 
          prev.map(turn => 
            turn.id === userTurn.id 
              ? { ...turn, content: `[Speech not recognized: ${result.message || 'Please try again'}]` }
              : turn
          )
        );
        
        // If it's a retry-able error, restart listening
        if (result.requiresRetry && autoRestartEnabled && isVisible && isSessionActive) {
          setTimeout(() => {
            console.log('🔄 Retrying speech recognition...');
            setIsWaitingForUser(true);
            startVoiceInteraction();
          }, 2000);
        }
        return;
      }

      if (result.success && result.aiResponse) {
        setIsProcessingSpeech(false);
        
        // Update conversation ID if backend returns a different one (e.g., Dify generated ID)
        if (result.conversationId && result.conversationId !== effectiveConversationId) {
          console.warn('⚠️ Backend returned different conversation ID:', {
            sent: effectiveConversationId,
            received: result.conversationId
          });
          // Update to use Dify's conversation ID for future turns
          conversationIdRef.current = result.conversationId;
          setConversationId(result.conversationId);
        } else {
          console.log('✅ Conversation ID confirmed:', effectiveConversationId);
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
        // Increment turn number after each complete exchange
        setCurrentTurnNumber(prev => prev + 1);
        currentTurnNumberRef.current = currentTurnNumberRef.current + 1;
        
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
      setIsWaitingForUser(false);
      setIsProcessingSpeech(false);
      
      // Only restart on error if auto-restart is enabled, panel is visible, and session is active
      if (autoRestartEnabled && isVisible && isSessionActive) {
        console.log('⚠️ Restarting conversation after error...');
        setTimeout(() => {
          if (autoRestartEnabled && isVisible && isSessionActive) {
            startVoiceInteraction();
          }
        }, 2000);
      }
    }
  };

  // Determine current conversation state message
  const getConversationStateMessage = () => {
    if (isPlayingTTS) return 'Speaking...';
    if (isProcessingSpeech) return 'Processing speech...';
    if (isRecording) return 'Listening...';
    if (isWaitingForUser) return 'Ready to listen';
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (connectionStatus === 'error') return 'Connection error';
    return 'Ready';
  };

  const getConversationStateColor = () => {
    if (isPlayingTTS) return 'text-blue-300';
    if (isProcessingSpeech) return 'text-purple-300';
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
              "{conversationTurns.length > 0 ? conversationTurns[conversationTurns.length - 1].content : initialMessageRef.current}"
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

            {/* Manual stop & send button - only show when actively recording */}
            {isRecording && !isConversationEnded && (
              <button
                onClick={() => {
                  console.log('✋ Manual stop & send button clicked');
                  // Stop the recording and let onstop handle sending
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                  }
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 
                           backdrop-blur-md border border-white/25 shadow-lg relative overflow-hidden group
                           bg-gradient-to-br from-red-500/20 via-red-400/15 to-red-300/10
                           hover:from-red-500/30 hover:via-red-400/25 hover:to-red-300/15 
                           hover:border-red-400/35 mr-2"
                title="Stop recording and send message"
              >
                {/* Button inner glow */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-white/5 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Stop icon */}
                <div className="w-3 h-3 bg-red-400 rounded-sm group-hover:bg-red-300 relative z-10 transition-colors duration-300"></div>
              </button>
            )}

            {/* Manual continue button - only show when auto-restart is disabled and not currently active */}
            {!autoRestartEnabled && !isRecording && !isPlayingTTS && !isWaitingForUser && !isConversationEnded && conversationTurns.length > 1 && (
              <button
                onClick={() => {
                  if (isSessionActive) {
                    console.log('👆 Manual continue button clicked');
                    setIsWaitingForUser(true);
                    startVoiceInteraction();
                    resetConversationTimeout();
                  } else {
                    console.log('🚫 Cannot continue - session is not active');
                  }
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 
                           backdrop-blur-md border border-white/25 shadow-lg relative overflow-hidden group
                           bg-gradient-to-br from-white/15 via-white/10 to-white/8
                           hover:from-blue-500/20 hover:via-blue-400/15 hover:to-blue-300/10 
                           hover:border-blue-400/35 mr-2"
                title="Continue conversation (click to speak)"
              >
                {/* Button inner glow */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-white/5 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Continue icon */}
                <Mic className="w-4 h-4 text-white/80 group-hover:text-blue-300 relative z-10 transition-colors duration-300" />
              </button>
            )}

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