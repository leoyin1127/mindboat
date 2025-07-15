import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Anchor, TestTube } from 'lucide-react';

interface ControlPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  onEndVoyage?: () => void;
  sessionId?: string | null;
  isSessionActive?: boolean;
  // Media control props
  isMicMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  onToggleMic?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isVisible,
  onClose,
  onEndVoyage,
  sessionId,
  isSessionActive,
  isMicMuted = false,
  isVideoOn = false,
  isScreenSharing = false,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare
}) => {
  if (!isVisible) return null;

  const handleToggleMic = () => {
    onToggleMic?.();
  };

  const handleToggleVideo = () => {
    onToggleVideo?.();
  };

  const handleToggleScreenShare = () => {
    onToggleScreenShare?.();
  };

  const handleEndVoyage = () => {
    console.log('Ending voyage...');
    onEndVoyage?.();
  };

  // FR-2.4: Test drift intervention functionality
  const handleTestDriftIntervention = async () => {
    if (!sessionId) {
      console.error('No active session for drift intervention test');
      return;
    }

    console.log('🧪 Testing drift intervention...');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drift-intervention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: 'test-user-id', // In real implementation, get from auth
          consecutive_drifts: 5,
          drift_context: {
            last_drift_reason: 'Test drift simulation',
            current_task: 'Test task',
            user_goal: 'Test goal'
          },
          test_mode: true
        })
      });

      if (!response.ok) {
        console.error('Failed to trigger drift intervention:', response.status);
        return;
      }

      const result = await response.json();
      console.log('✅ Test drift intervention result:', result);

      // Play TTS audio if available
      if (result.audio_url && result.tts_success) {
        try {
          const audio = new Audio(result.audio_url);
          audio.play();
          console.log('🔊 Playing test intervention audio');
        } catch (audioError) {
          console.error('Error playing intervention audio:', audioError);
        }
      }

      // Show text message
      if (result.intervention_message) {
        console.log('🤖 Intervention message:', result.intervention_message);
      }

    } catch (error) {
      console.error('Error testing drift intervention:', error);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      {/* Enhanced glass panel with Apple-inspired depth */}
      <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                      backdrop-blur-2xl border border-white/25 rounded-3xl px-6 py-4
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                      before:absolute before:inset-0 before:rounded-3xl 
                      before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                      before:pointer-events-none overflow-visible">

        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent 
                        rounded-3xl pointer-events-none"></div>

        {/* All buttons in a single horizontal row */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Microphone Control */}
          <button
            onClick={handleToggleMic}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 
                        backdrop-blur-md border shadow-lg relative overflow-visible group ${!isMicMuted
                ? 'bg-green-400/20 border-green-300/30 shadow-green-400/20'
                : 'bg-red-400/20 border-red-300/30 shadow-red-400/20'
              }`}
          >
            {/* Button inner glow */}
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${!isMicMuted
              ? 'bg-gradient-to-br from-green-300/20 to-green-500/20'
              : 'bg-gradient-to-br from-red-300/20 to-red-500/20'
              }`}></div>

            {!isMicMuted ? (
              <Mic className="w-5 h-5 text-white relative z-10" />
            ) : (
              <MicOff className="w-5 h-5 text-white relative z-10" />
            )}

            {/* Custom hover tooltip */}
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 
                           bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                           backdrop-blur-md border border-white/25 rounded-md 
                           text-sm text-white/90 whitespace-nowrap 
                           opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                           transition-all duration-300 z-20
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
              {!isMicMuted ? 'Turn off microphone' : 'Turn on microphone'}
            </span>
          </button>

          {/* Video Control */}
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 
                        backdrop-blur-md border shadow-lg relative overflow-visible group ${isVideoOn
                ? 'bg-green-400/20 border-green-300/30 shadow-green-400/20'
                : 'bg-red-400/20 border-red-300/30 shadow-red-400/20'
              }`}
          >
            {/* Button inner glow */}
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isVideoOn
              ? 'bg-gradient-to-br from-green-300/20 to-green-500/20'
              : 'bg-gradient-to-br from-red-300/20 to-red-500/20'
              }`}></div>

            {isVideoOn ? (
              <Video className="w-5 h-5 text-white relative z-10" />
            ) : (
              <VideoOff className="w-5 h-5 text-white relative z-10" />
            )}

            {/* Custom hover tooltip */}
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 
                           bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                           backdrop-blur-md border border-white/25 rounded-md 
                           text-sm text-white/90 whitespace-nowrap 
                           opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                           transition-all duration-300 z-20
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
              {isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            </span>
          </button>

          {/* Screen Share Control */}
          <button
            onClick={handleToggleScreenShare}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 
                        backdrop-blur-md border shadow-lg relative overflow-visible group ${isScreenSharing
                ? 'bg-green-400/20 border-green-300/30 shadow-green-400/20'
                : 'bg-red-400/20 border-red-300/30 shadow-red-400/20'
              }`}
          >
            {/* Button inner glow */}
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isScreenSharing
              ? 'bg-gradient-to-br from-green-300/20 to-green-500/20'
              : 'bg-gradient-to-br from-red-300/20 to-red-500/20'
              }`}></div>

            {isScreenSharing ? (
              <Monitor className="w-5 h-5 text-white relative z-10" />
            ) : (
              <MonitorOff className="w-5 h-5 text-white relative z-10" />
            )}

            {/* Custom hover tooltip */}
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 
                           bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                           backdrop-blur-md border border-white/25 rounded-md 
                           text-sm text-white/90 whitespace-nowrap 
                           opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                           transition-all duration-300 z-20
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
              {isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
            </span>
          </button>

          {/* Test Drift Intervention Button - FR-2.4 */}
          <button
            onClick={handleTestDriftIntervention}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 
                       backdrop-blur-md border border-white/25 shadow-lg relative overflow-visible group
                       bg-gradient-to-br from-purple-500/20 via-purple-400/15 to-purple-600/25 
                       border-purple-400/30 hover:from-purple-500/30 hover:via-purple-400/25 hover:to-purple-600/35
                       shadow-purple-400/10 hover:shadow-purple-400/20"
          >
            {/* Button inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/10 to-purple-600/5 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <TestTube className="w-5 h-5 text-white relative z-10" />

            {/* Custom hover tooltip */}
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 
                           bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                           backdrop-blur-md border border-white/25 rounded-md 
                           text-sm text-white/90 whitespace-nowrap 
                           opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                           transition-all duration-300 z-20
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
              Test Drift Intervention
            </span>
          </button>

          {/* End Voyage Button with custom hover tooltip */}
          <button
            onClick={handleEndVoyage}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 
                       backdrop-blur-md border border-white/25 shadow-lg relative overflow-visible group
                       bg-gradient-to-br from-white/15 via-white/10 to-white/8
                       hover:from-white/20 hover:via-white/15 hover:to-white/12 hover:border-white/35
                       shadow-white/10 hover:shadow-white/15"
          >
            {/* Button inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <Anchor className="w-5 h-5 text-white relative z-10" />

            {/* Custom hover tooltip */}
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 
                           bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                           backdrop-blur-md border border-white/25 rounded-md 
                           text-sm text-white/90 whitespace-nowrap 
                           opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                           transition-all duration-300 z-20
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
              End the voyage
            </span>
          </button>
        </div>

        {/* Subtle decorative elements */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/20 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-white/15 rounded-full blur-sm animate-pulse"
          style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};