import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface SailingTimerProps {
  startTime: Date | null;
  isActive: boolean;
  className?: string;
}

export const SailingTimer: React.FC<SailingTimerProps> = ({
  startTime,
  isActive,
  className = ''
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, startTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  if (!startTime || !isActive) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4 text-white/70" />
      <span className="font-mono text-white/90 text-sm">
        {formatTime(elapsedTime)}
      </span>
    </div>
  );
};