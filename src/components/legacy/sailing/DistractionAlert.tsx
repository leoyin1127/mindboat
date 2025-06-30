import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Compass, Mic, Camera, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface DistractionAlertProps {
  isVisible: boolean;
  onResponse: (response: 'return_to_course' | 'exploring') => void;
  distractionType: 'tab_switch' | 'idle' | 'camera_distraction' | 'camera_absence' | 'blacklisted_content' | 'irrelevant_content';
  duration?: number;
}

export const DistractionAlert: React.FC<DistractionAlertProps> = ({
  isVisible,
  onResponse,
  distractionType,
  duration
}) => {
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  const getDistractionMessage = () => {
    switch (distractionType) {
      case 'tab_switch':
        return "I noticed you switched away from your focus area. The winds have shifted!";
      case 'camera_absence':
      case 'camera_distraction':
        return "The AI noticed you're not at your workstation. Time to return to your voyage!";
      case 'blacklisted_content':
        return "You've sailed into distracting waters. Let's navigate back to your destination!";
      case 'irrelevant_content':
        return "The current content doesn't seem related to your voyage goal. Shall we return to course?";
      case 'idle':
        return "You seem to be taking a break. The sea is calm and peaceful.";
      default:
        return "The captain seems to be off course!";
    }
  };

  const getDistractionIcon = () => {
    switch (distractionType) {
      case 'tab_switch':
      case 'blacklisted_content':
      case 'irrelevant_content':
        return <Compass className="w-16 h-16 text-yellow-500" />;
      case 'camera_absence':
      case 'camera_distraction':
        return <Camera className="w-16 h-16 text-orange-500" />;
      case 'idle':
        return <Eye className="w-16 h-16 text-blue-500" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
    }
  };

  const handleResponse = (response: 'return_to_course' | 'exploring') => {
    setSelectedResponse(response);
    setTimeout(() => {
      onResponse(response);
      setSelectedResponse(null);
    }, 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Card className="max-w-md w-full p-8 text-center">
              <motion.div
                animate={{ 
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="mb-6"
              >
                {getDistractionIcon()}
              </motion.div>

              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                Course Correction Needed
              </h2>
              
              <p className="text-gray-600 mb-2">
                {getDistractionMessage()}
              </p>
              
              {duration && (
                <p className="text-sm text-gray-500 mb-6">
                  Away for {Math.round(duration / 1000)} seconds
                </p>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => handleResponse('return_to_course')}
                  className={`w-full transition-all ${
                    selectedResponse === 'return_to_course' 
                      ? 'bg-green-600 scale-105' 
                      : ''
                  }`}
                  size="lg"
                  icon={ArrowLeft}
                  disabled={selectedResponse !== null}
                >
                  Return to Course
                </Button>
                
                <Button
                  onClick={() => handleResponse('exploring')}
                  variant="outline"
                  className={`w-full transition-all ${
                    selectedResponse === 'exploring' 
                      ? 'border-blue-600 bg-blue-50 scale-105' 
                      : ''
                  }`}
                  size="lg"
                  icon={Compass}
                  disabled={selectedResponse !== null}
                >
                  I'm Exploring
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Choose "Exploring" to temporarily pause distraction detection
              </p>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};