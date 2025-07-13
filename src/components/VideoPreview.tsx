import React, { useEffect, useRef } from 'react';
import { Video, Monitor, X } from 'lucide-react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  type: 'camera' | 'screen';
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  stream,
  type,
  isVisible,
  onClose,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isVisible || !stream) return null;

  return (
    <div className={`fixed z-50 ${className}`}>
      {/* Glass morphism container */}
      <div className="relative bg-gradient-to-br from-slate-500/20 via-slate-400/15 to-slate-600/25 
                      backdrop-blur-2xl border border-white/25 rounded-2xl p-4
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                      before:absolute before:inset-0 before:rounded-2xl 
                      before:bg-gradient-to-br before:from-slate-400/10 before:via-transparent before:to-transparent 
                      before:pointer-events-none overflow-hidden">

        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 via-transparent to-transparent 
                        rounded-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-slate-500/20 via-slate-400/15 to-slate-600/25 
                            backdrop-blur-md rounded-lg flex items-center justify-center w-8 h-8
                            border border-white/25">
              {type === 'camera' ? (
                <Video className="w-4 h-4 text-white" />
              ) : (
                <Monitor className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-white/90 text-sm font-inter font-medium">
              {type === 'camera' ? 'Camera' : 'Screen Share'}
            </span>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white/90 transition-colors 
                         hover:bg-white/10 rounded-lg p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Video element */}
        <div className="relative z-10 rounded-xl overflow-hidden bg-black/20">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ 
              width: type === 'camera' ? '240px' : '320px',
              height: type === 'camera' ? '180px' : '240px'
            }}
          />
          
          {/* Video overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent 
                          pointer-events-none"></div>
        </div>

        {/* Status indicator */}
        <div className="relative z-10 flex items-center gap-2 mt-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white/70 text-xs font-inter">
            Live
          </span>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-white/20 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white/15 rounded-full blur-sm animate-pulse"
          style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}; 