import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb as Lighthouse, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUserStore } from '../../stores/userStore';

interface LighthouseGoalProps {
  onComplete: () => void;
}

export const LighthouseGoal: React.FC<LighthouseGoalProps> = ({ onComplete }) => {
  const { lighthouseGoal, setLighthouseGoal, saveLighthouseGoal, isLoading } = useUserStore();
  const [localGoal, setLocalGoal] = useState(lighthouseGoal);

  const handleSubmit = async () => {
    if (!localGoal.trim()) return;
    
    setLighthouseGoal(localGoal);
    await saveLighthouseGoal();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Lighthouse Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative mx-auto w-32 h-32 mb-6">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: 'linear' 
              }}
              className="absolute inset-0 bg-yellow-400 rounded-full opacity-30 blur-xl"
            />
            <Lighthouse className="w-32 h-32 text-yellow-300 relative z-10" />
          </div>
        </motion.div>

        {/* Title and Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Set Your Lighthouse
          </h1>
          <p className="text-xl text-blue-200 mb-4">
            Deep within everyone's heart lies an ocean
          </p>
          <p className="text-lg text-blue-300">
            And at the end of that ocean stands the lighthouse you aspire to become
          </p>
        </motion.div>

        {/* Goal Input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8"
        >
          <h2 className="text-2xl font-semibold text-white mb-6">
            What does your ideal self look like?
          </h2>
          
          <Input
            placeholder="e.g., Become an excellent software engineer who helps others solve problems..."
            value={localGoal}
            onChange={setLocalGoal}
            className="mb-6"
          />
          
          <Button
            onClick={handleSubmit}
            disabled={!localGoal.trim()}
            loading={isLoading}
            size="lg"
            icon={ArrowRight}
            className="w-full md:w-auto"
          >
            Light the Lighthouse
          </Button>
        </motion.div>

        {/* Metaphor Explanation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-blue-200 space-y-2"
        >
          <p><strong className="text-white">Boat</strong> = You</p>
          <p><strong className="text-white">Lighthouse</strong> = Your ideal self</p>
          <p><strong className="text-white">Sailing</strong> = Focused action</p>
          <p><strong className="text-white">Map</strong> = Your growth journey</p>
        </motion.div>
      </motion.div>
    </div>
  );
};