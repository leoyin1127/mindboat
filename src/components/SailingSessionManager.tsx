import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, Anchor } from 'lucide-react';

interface SailingSession {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  startTime: string;
  status: 'sailing' | 'drifting' | 'completed';
  elapsedTime: number;
}

interface SailingSessionManagerProps {
  isActive: boolean;
  session: SailingSession | null;
  onEndSession: () => void;
}

export const SailingSessionManager: React.FC<SailingSessionManagerProps> = ({
  isActive,
  session,
  onEndSession
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<'sailing' | 'drifting'>('sailing');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Timer management
  useEffect(() => {
    if (isActive && session) {
      const startTime = new Date(session.startTime).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };

      // Update timer immediately
      updateTimer();
      
      // Then update every second
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, session]);

  // Real-time session status updates
  useEffect(() => {
    if (isActive && session) {
      console.log('📡 Establishing WebSocket connection for session:', session.id);
      
      // Subscribe to session status updates
      const channel = supabase.channel(`session-${session.id}`)
        .on('broadcast', { event: 'session_status_update' }, (payload) => {
          console.log('📡 Received session status update:', payload);
          
          if (payload.payload.sessionId === session.id) {
            const newStatus = payload.payload.status;
            setCurrentStatus(newStatus);
            
            // Update the visual state based on status
            if (newStatus === 'drifting') {
              // Trigger drifting animation
              triggerSplineAnimation('drifting');
            } else if (newStatus === 'sailing') {
              // Trigger sailing animation
              triggerSplineAnimation('sailing');
            }
          }
        })
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
        });

      realtimeChannelRef.current = channel;

      return () => {
        console.log('📡 Cleaning up WebSocket connection');
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
        }
      };
    }
  }, [isActive, session]);

  const triggerSplineAnimation = async (status: 'sailing' | 'drifting') => {
    try {
      console.log(`🎬 Triggering ${status} animation`);
      
      // Different webhook URLs or parameters for different states
      const webhookData = status === 'sailing' 
        ? { numbaer2: 0 }  // Sailing animation
        : { numbaer2: 1 }; // Drifting animation
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spline-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          webhookUrl: 'https://hooks.spline.design/vS-vioZuERs',
          payload: webhookData
        })
      });

      if (response.ok) {
        console.log(`✅ ${status} animation triggered successfully`);
      } else {
        console.error(`❌ Failed to trigger ${status} animation`);
      }
    } catch (error) {
      console.error(`❌ Error triggering ${status} animation:`, error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndSession = async () => {
    if (!session) return;

    try {
      // Update session in database
      const { error } = await supabase
        .from('voyages')
        .update({
          end_time: new Date().toISOString(),
          actual_duration: elapsedTime,
          status: 'completed'
        })
        .eq('id', session.id);

      if (error) {
        console.error('Error ending session:', error);
        return;
      }

      console.log('✅ Session ended successfully');
      onEndSession();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  if (!isActive || !session) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                      backdrop-blur-2xl border border-white/25 rounded-3xl px-6 py-4
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                      before:absolute before:inset-0 before:rounded-3xl 
                      before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                      before:pointer-events-none overflow-visible">
        
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent 
                        rounded-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center gap-6">
          {/* Session Info */}
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
              currentStatus === 'sailing' 
                ? 'bg-green-400 animate-pulse' 
                : 'bg-orange-400 animate-pulse'
            }`}></div>
            
            {/* Task Title */}
            <div className="text-white/90 font-inter text-sm font-medium">
              {session.taskTitle}
            </div>
            
            {/* Timer */}
            <div className="flex items-center gap-2 text-white font-mono text-lg">
              <Timer className="w-4 h-4" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
          </div>

          {/* Status Text */}
          <div className={`text-sm font-inter transition-colors duration-500 ${
            currentStatus === 'sailing' 
              ? 'text-green-300' 
              : 'text-orange-300'
          }`}>
            {currentStatus === 'sailing' ? 'Sailing' : 'Drifting'}
          </div>

          {/* End Session Button */}
          <button
            onClick={handleEndSession}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 
                       backdrop-blur-md border border-white/25 shadow-lg relative overflow-visible group
                       bg-gradient-to-br from-white/15 via-white/10 to-white/8
                       hover:from-white/20 hover:via-white/15 hover:to-white/12 
                       hover:border-white/35"
            title="End Sailing Session"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <Anchor className="w-5 h-5 text-white relative z-10" />
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/20 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-white/15 rounded-full blur-sm animate-pulse" 
             style={{animationDelay: '1s'}}></div>
      </div>
    </div>
  );
};