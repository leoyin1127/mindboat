/**
 * Real-time Camera View Component
 * 
 * Shows the user's camera feed in a small window at the bottom-left corner
 * (1/12 of the page as specified). This helps users see what the AI sees
 * and provides visual feedback during distraction detection.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Eye, EyeOff, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface CameraViewProps {
  isActive: boolean;
  onCameraStream?: (stream: MediaStream | null) => void;
  className?: string;
}

export const CameraView: React.FC<CameraViewProps> = ({
  isActive,
  onCameraStream,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Start camera stream
  const startCamera = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user' // Front camera
        },
        audio: false // We don't need audio for distraction detection
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreamActive(true);
      onCameraStream?.(stream);

    } catch (err) {
      console.error('Failed to start camera:', err);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      setIsStreamActive(false);
      onCameraStream?.(null);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreamActive(false);
    onCameraStream?.(null);
  };

  // Handle activation/deactivation
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [isActive]);

  // Toggle visibility
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Toggle minimized state
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`fixed bottom-4 left-4 z-30 ${className}`}
    >
      <div 
        className={`
          relative bg-gray-900 rounded-lg overflow-hidden shadow-xl border-2 border-gray-700
          transition-all duration-300 ease-in-out
          ${isMinimized ? 'w-16 h-12' : 'w-80 h-60'}
        `}
      >
        {/* Control buttons */}
        <div className="absolute top-2 right-2 flex space-x-1 z-40">
          <Button
            onClick={toggleVisibility}
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 bg-black/50 hover:bg-black/70 text-white"
          >
            {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          
          {!isMinimized && (
            <Button
              onClick={toggleMinimized}
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
          )}
          
          {isMinimized && (
            <Button
              onClick={toggleMinimized}
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Status indicator */}
        <div className="absolute top-2 left-2 z-40">
          <div className={`
            w-2 h-2 rounded-full
            ${isStreamActive ? 'bg-green-400' : error ? 'bg-red-400' : 'bg-yellow-400'}
            ${isStreamActive ? 'animate-pulse' : ''}
          `} />
        </div>

        {/* Camera feed */}
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {isStreamActive ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }} // Mirror the video
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  {error ? (
                    <div className="text-center p-2">
                      <CameraOff className="w-6 h-6 text-red-400 mx-auto mb-1" />
                      <p className="text-xs text-red-300">Camera Error</p>
                      {!isMinimized && (
                        <p className="text-xs text-gray-400 mt-1">
                          {error.includes('Permission') ? 'Permission denied' : 'Connection failed'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-2">
                      <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-300">Starting camera...</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized view */}
        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90">
            <Camera className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Label */}
        {!isMinimized && (
          <div className="absolute bottom-1 left-1 right-1">
            <div className="bg-black/70 rounded px-2 py-1 text-center">
              <p className="text-xs text-white font-medium">
                AI Monitoring
              </p>
              <p className="text-xs text-gray-300">
                {isStreamActive ? 'Active' : error ? 'Error' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info tooltip */}
      {!isMinimized && (
        <div className="absolute -top-8 left-0 right-0">
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded text-center opacity-0 hover:opacity-100 transition-opacity">
            AI uses this feed to detect if you're focused
          </div>
        </div>
      )}
    </motion.div>
  );
};