import React, { useState } from 'react';
import { Camera, Monitor, Mic, Shield, X } from 'lucide-react';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsGranted: (permissions: MediaPermissions) => void;
}

interface MediaPermissions {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  isOpen,
  onClose,
  onPermissionsGranted
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const permissions: MediaPermissions = {
        camera: false,
        microphone: false,
        screen: false
      };

      // Request camera and microphone
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        permissions.camera = true;
        permissions.microphone = true;
        // Stop the stream immediately after getting permission
        mediaStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Camera/Microphone permission denied:', error);
      }

      // Request screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        permissions.screen = true;
        // Stop the stream immediately after getting permission
        screenStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Screen sharing permission denied:', error);
      }

      // Check if at least camera permission was granted (minimum requirement)
      if (!permissions.camera) {
        setError('Camera permission is required to track your journey. Please allow camera access and try again.');
        setIsRequesting(false);
        return;
      }

      onPermissionsGranted(permissions);
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setError('Failed to request permissions. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-lg w-full">
          
          <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                          backdrop-blur-2xl border border-white/25 rounded-3xl p-8
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg 
                         bg-gradient-to-br from-white/15 via-white/10 to-white/8
                         hover:from-white/20 hover:via-white/15 hover:to-white/12
                         border border-white/25 hover:border-white/35
                         backdrop-blur-md transition-all duration-300
                         flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white/80 hover:text-white" />
            </button>

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 
                              bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                              rounded-2xl border border-white/25 mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-playfair font-normal text-white mb-4 leading-tight">
                Permission Required
              </h2>
              
              <p className="text-white/90 text-sm font-inter leading-relaxed">
                "Mind Boat" needs your permission to track your journey:
              </p>
            </div>

            {/* Permission explanations */}
            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/30 to-blue-600/30 
                                flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-1">Camera</h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Checks whether you're on board (in front of your computer).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400/30 to-green-600/30 
                                flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-1">Screen</h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Helps make sure you're steering the right course.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400/30 to-purple-600/30 
                                flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-1">Microphone</h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Records your travel log.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="text-center mb-6 relative z-10">
              <p className="text-white/60 text-xs font-inter italic">
                We promise to protect your privacy.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-white px-4 py-3 rounded-xl text-sm mb-6 relative z-10">
                {error}
              </div>
            )}

            {/* Grant permissions button */}
            <div className="relative z-10">
              <button
                onClick={requestPermissions}
                disabled={isRequesting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30
                           hover:from-blue-400/40 hover:to-purple-400/40 text-white rounded-xl 
                           transition-all duration-300 font-inter font-medium text-base
                           shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md
                           border border-white/25 hover:border-white/35
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transform hover:scale-[1.02] active:scale-[0.98]
                           flex items-center justify-center gap-2"
              >
                {isRequesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                    rounded-full animate-spin"></div>
                    <span>Requesting Permissions...</span>
                  </>
                ) : (
                  <span>Grant Permissions</span>
                )}
              </button>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/20 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-white/15 rounded-full blur-sm animate-pulse" 
                 style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};