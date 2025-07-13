import React, { useState } from 'react';
import { Camera, Monitor, Mic, Shield, X } from 'lucide-react';
import { designSystem } from '../styles/designSystem';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onPermissionsGranted?: (permissions: PermissionStatus) => void;
}

interface PermissionStatus {
  camera: boolean;
  screen: boolean;
  microphone: boolean;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsGranted
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    screen: false,
    microphone: false
  });
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const results: PermissionStatus = {
        camera: false,
        screen: false,
        microphone: false
      };

      // Request camera permission
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
        results.camera = true;
        cameraStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Camera permission denied:', error);
      }

      // Request microphone permission
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true 
        });
        results.microphone = true;
        micStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Microphone permission denied:', error);
      }

      // Request screen sharing permission (on user interaction)
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        results.screen = true;
        screenStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Screen sharing permission denied:', error);
      }

      setPermissions(results);

      // Check if we have enough permissions to proceed
      if (results.camera || results.screen) {
        onPermissionsGranted?.(results);
      } else {
        setError('At least camera or screen sharing permission is required to start sailing.');
      }

    } catch (error) {
      console.error('Error requesting permissions:', error);
      setError('Failed to request permissions. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-2xl w-full">
          
          <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                          backdrop-blur-2xl border border-white/25 rounded-3xl p-10
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-20 w-10 h-10 rounded-xl 
                         bg-gradient-to-br from-white/15 via-white/10 to-white/8
                         hover:from-white/20 hover:via-white/15 hover:to-white/12
                         border border-white/25 hover:border-white/35
                         backdrop-blur-md transition-all duration-300
                         flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white/80 hover:text-white" />
            </button>

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
              <div className="bg-gradient-to-br from-white/15 via-white/10 to-white/8 backdrop-blur-md 
                              rounded-2xl flex items-center justify-center w-16 h-16 mx-auto mb-6
                              border border-white/25 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl"></div>
                <Shield className="w-8 h-8 text-white relative z-10" />
              </div>
              
              <h2 className="text-[32px] font-playfair font-normal text-white mb-6 leading-tight">
                Permission Required
              </h2>
              
              <p className="text-white/90 text-base font-inter leading-relaxed">
                "Mind Boat" needs your permission to track your journey:
              </p>
            </div>

            {/* Permissions list */}
            <div className="space-y-4 mb-8 relative z-10">
              {/* Camera Permission */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20">
                <div className="bg-blue-400/20 rounded-lg p-2 flex-shrink-0">
                  <Camera className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-white font-inter font-medium mb-1">Camera</h3>
                  <p className="text-white/70 text-sm">Checks whether you're on board (in front of your computer).</p>
                  {permissions.camera && (
                    <span className="text-green-400 text-xs">✓ Granted</span>
                  )}
                </div>
              </div>

              {/* Screen Permission */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20">
                <div className="bg-purple-400/20 rounded-lg p-2 flex-shrink-0">
                  <Monitor className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-white font-inter font-medium mb-1">Screen</h3>
                  <p className="text-white/70 text-sm">Helps make sure you're steering the right course.</p>
                  {permissions.screen && (
                    <span className="text-green-400 text-xs">✓ Granted</span>
                  )}
                </div>
              </div>

              {/* Microphone Permission */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20">
                <div className="bg-green-400/20 rounded-lg p-2 flex-shrink-0">
                  <Mic className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <h3 className="text-white font-inter font-medium mb-1">Microphone</h3>
                  <p className="text-white/70 text-sm">Records your travel log. We promise to protect your privacy.</p>
                  {permissions.microphone && (
                    <span className="text-green-400 text-xs">✓ Granted</span>
                  )}
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-white px-4 py-3 rounded-xl text-sm mb-6 relative z-10">
                {error}
              </div>
            )}

            {/* Grant Permissions Button */}
            <div className="flex justify-center pt-4 relative z-10">
              <button
                onClick={requestPermissions}
                disabled={isRequesting}
                className="px-10 py-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30
                           hover:from-blue-400/40 hover:to-purple-400/40 text-white rounded-xl 
                           transition-all duration-300 font-inter font-medium text-base
                           shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md
                           border border-white/25 hover:border-white/35
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transform hover:scale-[1.02] active:scale-[0.98]
                           flex items-center justify-center gap-2 min-w-[200px]"
              >
                {isRequesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                    rounded-full animate-spin"></div>
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Grant Permissions</span>
                  </>
                )}
              </button>
            </div>

            {/* Privacy note */}
            <p className="text-white/60 text-xs text-center mt-6 relative z-10">
              Your data is processed locally and used only for improving your focus experience.
            </p>

            {/* Decorative elements */}
            <div className="absolute -top-3 -left-3 w-6 h-6 bg-white/10 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-white/8 rounded-full blur-sm animate-pulse" 
                 style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};