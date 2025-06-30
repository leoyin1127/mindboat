import React from 'react';
import { motion } from 'framer-motion';

interface WeatherSystemProps {
  mood: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  className?: string;
}

export const WeatherSystem: React.FC<WeatherSystemProps> = ({ mood, className = '' }) => {
  const getWeatherElements = () => {
    switch (mood) {
      case 'sunny':
        return (
          <>
            {/* Sun */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute top-8 right-8 w-16 h-16 bg-yellow-400 rounded-full shadow-lg"
            >
              <div className="absolute inset-2 bg-yellow-300 rounded-full" />
              {/* Sun rays */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-6 bg-yellow-400 rounded-full"
                  style={{
                    top: '-12px',
                    left: '50%',
                    transformOrigin: '50% 44px',
                    transform: `translateX(-50%) rotate(${i * 45}deg)`,
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
            
            {/* Gentle sparkles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + Math.sin(i) * 20}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}
          </>
        );

      case 'cloudy':
        return (
          <>
            {/* Clouds */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-white/80 rounded-full"
                style={{
                  width: `${60 + i * 20}px`,
                  height: `${30 + i * 10}px`,
                  left: `${10 + i * 25}%`,
                  top: `${10 + i * 5}%`,
                }}
                animate={{
                  x: [0, 20, 0],
                  opacity: [0.6, 0.9, 0.6],
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </>
        );

      case 'rainy':
        return (
          <>
            {/* Dark clouds */}
            {[...Array(2)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-gray-600/70 rounded-full"
                style={{
                  width: `${80 + i * 30}px`,
                  height: `${40 + i * 15}px`,
                  left: `${15 + i * 30}%`,
                  top: `${5 + i * 8}%`,
                }}
                animate={{
                  x: [0, 15, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            
            {/* Rain drops */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-4 bg-blue-300/60 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '20%',
                }}
                animate={{
                  y: [0, 300],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'linear',
                }}
              />
            ))}
          </>
        );

      case 'stormy':
        return (
          <>
            {/* Storm clouds */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-gray-800/80 rounded-full"
                style={{
                  width: `${100 + i * 40}px`,
                  height: `${50 + i * 20}px`,
                  left: `${5 + i * 25}%`,
                  top: `${0 + i * 10}%`,
                }}
                animate={{
                  x: [0, 30, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            
            {/* Lightning */}
            <motion.div
              className="absolute inset-0 bg-yellow-200/20"
              animate={{
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.1,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
            
            {/* Heavy rain */}
            {[...Array(25)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-6 bg-blue-400/70 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '15%',
                }}
                animate={{
                  y: [0, 400],
                  opacity: [0, 1, 0],
                  x: [0, -20],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: Math.random() * 1,
                  ease: 'linear',
                }}
              />
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {getWeatherElements()}
    </div>
  );
};