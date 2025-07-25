import { useState, useEffect } from 'react';
import { getPanelStyle, getButtonStyle } from '../styles/designSystem';
import { AlertTriangle } from 'lucide-react';

interface DriftNotificationProps {
  isVisible: boolean;
  onContinueWorking: () => void;
  driftReason?: string;
}

export function DriftNotification({ 
  isVisible, 
  onContinueWorking, 
  driftReason 
}: DriftNotificationProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isVisible) {
      // Show notification after 5 seconds
      timer = setTimeout(() => {
        setShouldRender(true);
      }, 5000);
    } else {
      // Hide immediately when isVisible becomes false
      setShouldRender(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 ${shouldRender ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ease-in-out`}>
      {/* Notification content - no background overlay */}
      <div className={`relative w-full max-w-md p-6 rounded-2xl shadow-xl backdrop-blur-md ${getPanelStyle('md', true)} border border-amber-400/30 transform transition-all duration-300 ease-in-out ${shouldRender ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base mb-2">
              Drifting Detected
            </h3>
            <p className="text-sm text-gray-200 leading-relaxed mb-4">
              {driftReason || "It seems your focus has sailed off course. Let's get back on track!"}
            </p>
            <button
              onClick={onContinueWorking}
              className={`w-full ${getButtonStyle('default', 'sm')} text-sm font-medium transition-all duration-200 hover:scale-105`}
            >
              I understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 