import React, { useState } from 'react';
import { Camera, Monitor, Mic, Shield, X } from 'lucide-react';
import { designSystem } from '../styles/designSystem';

interface PermissionRequestModalProps {
  isVisible: boolean;
  onClose?: () => void;
  onPermissionsGranted: (permissions: MediaPermissions) => void;
  taskTitle: string;
}

interface MediaPermissions {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  isVisible,
  onClose,
  onPermissionsGranted,
  taskTitle
}) => {
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [permissionErrors, setPermissionErrors] = useState<string[]>([]);

  const requestPermissions = async () => {
    setIsRequestingPermissions(true);
    setPermissionErrors([]);
    
    const permissions: MediaPermissions = {
      camera: false,
      microphone: false,
      screen: false
    };
    
    const errors: string[] = [];

    try {
      // Request camera and microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        permissions.camera = true;
        permissions.microphone = true;
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Camera/Microphone permission denied:', error);
        errors.push('Camera and microphone access denied');
      }

      // Request screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        permissions.screen = true;
        // Stop the stream immediately after getting permission
        screenStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Screen sharing permission denied:', error);
        errors.push('Screen sharing access denied');
      }

      if (errors.length > 0) {
        setPermissionErrors(errors);
      } else {
        // All permissions granted
        onPermissionsGranted(permissions);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionErrors(['Failed to request permissions']);
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-2xl w-full">
          
          {/* Main glass panel */}
          <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                          backdrop-blur-2xl border border-white/25 rounded-3xl p-10
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">
            
            {/* Close button */}
            {onClose && (
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
            )}

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 
                              bg-gradient-to-br from-blue-400/40 to-blue-600/40 
                              rounded-2xl backdrop-blur-md border border-white/40 mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-[32px] font-playfair font-normal text-white mb-4 leading-tight">
                Permission Required
              </h2>
              
              <p className="text-white/80 text-base font-inter mb-2">
                For your journey to: <span className="font-medium text-white">{taskTitle}</span>
              </p>
              
              <p className="text-white/70 text-sm font-inter leading-relaxed max-w-lg mx-auto">
                "Mind Boat" needs your permission to track your journey
              </p>
            </div>

            {/* Permission explanations */}
            <div className="space-y-4 mb-8 relative z-10">
              {/* Camera */}
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/30 to-green-600/30 
                                flex items-center justify-center flex-shrink-0 mt-1">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium font-inter mb-1">Camera</h3>
                  <p className="text-white/70 text-sm font-inter leading-relaxed">
                    Checks whether you're on board (in front of your computer)
                  </p>
                </div>
              </div>

              {/* Screen */}
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/30 to-blue-600/30 
                                flex items-center justify-center flex-shrink-0 mt-1">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium font-inter mb-1">Screen</h3>
                  <p className="text-white/70 text-sm font-inter leading-relaxed">
                    Helps make sure you're steering the right course
                  </p>
                </div>
              </div>

              {/* Microphone */}
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                              backdrop-blur-md border border-white/20 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400/30 to-purple-600/30 
                                flex items-center justify-center flex-shrink-0 mt-1">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium font-inter mb-1">Microphone</h3>
                  <p className="text-white/70 text-sm font-inter leading-relaxed">
                    Records your travel log
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="text-center mb-8 relative z-10">
              <p className="text-white/80 text-sm font-inter">
                We promise to protect your privacy.
              </p>
            </div>

            {/* Error messages */}
            {permissionErrors.length > 0 && (
              <div className="mb-6 relative z-10">
                <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4">
                  <h4 className="text-white font-medium mb-2">Permission Issues:</h4>
                  <ul className="text-red-200 text-sm space-y-1">
                    {permissionErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                  <p className="text-red-200/80 text-xs mt-2">
                    You can continue without some permissions, but the experience may be limited.
                  </p>
                </div>
              </div>
            )}

            {/* Start Journey Button */}
            <div className="flex justify-center relative z-10">
              <button
                onClick={requestPermissions}
                disabled={isRequestingPermissions}
                className="px-12 py-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30
                           hover:from-blue-400/40 hover:to-purple-400/40 text-white rounded-xl 
                           transition-all duration-300 font-inter font-medium text-base
                           shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md
                           border border-white/25 hover:border-white/35
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transform hover:scale-[1.02] active:scale-[0.98]
                           flex items-center justify-center gap-2 min-w-[200px]"
              >
                {isRequestingPermissions ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                    rounded-full animate-spin"></div>
                    <span>Requesting...</span>
                  </>
                ) : (
                  <span>Grant Permissions & Start Journey</span>
                )}
              </button>
            </div>

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