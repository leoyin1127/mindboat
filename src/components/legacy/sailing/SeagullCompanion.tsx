import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Heart, Coffee } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface SeagullCompanionProps {
  isVisible: boolean;
  voyageTime: number;
  distractionCount: number;
  onDismiss: () => void;
}

export const SeagullCompanion: React.FC<SeagullCompanionProps> = ({
  isVisible,
  voyageTime,
  distractionCount,
  onDismiss
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  const seagullMessages = {
    welcome: [
      "Ahoy! I'm your sailing companion. I'll keep you company on this voyage! 🐦",
      "The winds are favorable today, captain! Let's sail toward your destination.",
      "I see great focus in your future. The sea is calm and ready for our journey."
    ],
    encouragement: [
      "You're doing wonderfully! The lighthouse grows brighter with each moment of focus.",
      "Steady as she goes, captain! Your determination is inspiring.",
      "The sea rewards those who stay the course. Keep sailing forward!"
    ],
    break: [
      "Taking a well-deserved break, I see! Even the best sailors need rest.",
      "The sea is peaceful right now. Perfect time to recharge your spirit.",
      "A wise captain knows when to rest. I'll keep watch while you relax! ☕"
    ],
    distraction: [
      "No worries, captain! Even experienced sailors sometimes drift off course.",
      "The important thing is getting back on track. I believe in you!",
      "Every great voyage has its challenges. You're handling this beautifully."
    ],
    milestone: [
      "Look how far we've sailed! Your focus is creating quite the wake.",
      "The lighthouse keeper would be proud of your progress today.",
      "You're becoming quite the skilled navigator of attention!"
    ]
  };

  useEffect(() => {
    if (isVisible) {
      let messageType: keyof typeof seagullMessages = 'welcome';
      
      if (voyageTime > 1800) { // 30 minutes
        messageType = 'milestone';
      } else if (distractionCount > 3) {
        messageType = 'distraction';
      } else if (voyageTime > 600) { // 10 minutes
        messageType = 'encouragement';
      }

      const messages = seagullMessages[messageType];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setCurrentMessage(randomMessage);
      setShowMessage(true);
    }
  }, [isVisible, voyageTime, distractionCount]);

  const handleDismiss = () => {
    setShowMessage(false);
    setTimeout(onDismiss, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed bottom-4 right-4 z-30 max-w-sm"
        >
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
            <div className="flex items-start space-x-3">
              {/* Animated Seagull */}
              <motion.div
                animate={{ 
                  y: [0, -5, 0],
                  rotate: [0, 5, 0, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="text-2xl"
              >
                🐦
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800 text-sm">
                    Your Seagull Companion
                  </h4>
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                <p className="text-blue-700 text-sm leading-relaxed">
                  {currentMessage}
                </p>
                
                {/* Interaction buttons */}
                <div className="flex items-center space-x-2 mt-3">
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:bg-blue-100 h-7 px-2"
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    Thanks!
                  </Button>
                  
                  {voyageTime > 900 && ( // Show after 15 minutes
                    <Button
                      onClick={() => {
                        setCurrentMessage("Of course! Take all the time you need. I'll be here when you're ready to continue. ☕");
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-100 h-7 px-2"
                    >
                      <Coffee className="w-3 h-3 mr-1" />
                      Break?
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};