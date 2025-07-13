import React from 'react';
import { supabase } from './lib/supabase';
import { SplineScene } from './components/SplineScene';
import { SplineEventHandler } from './components/SplineEventHandler';

// Device ID management
const generateDeviceId = () => {
  return 'device_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
};

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem('mindboat_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('mindboat_device_id', deviceId);
    console.log('Created new device ID:', deviceId);
  } else {
    console.log('Using existing device ID:', deviceId);
  }
  return deviceId;
};

function App() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deviceId, setDeviceId] = React.useState<string>('');

  // Initialize device-based authentication on app start
  React.useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, []);

  const handleSplineEvent = (event: any) => {
    console.log('Spline event received in App:', event);
    // You can add custom logic here to handle different types of events
    // For example, trigger different animations or UI changes based on event.payload
  };

  // 监听模态框状态变化
  React.useEffect(() => {
    const handleModalStateChange = (event: CustomEvent) => {
      setIsModalOpen(event.detail.isOpen);
    };

    window.addEventListener('modalStateChange', handleModalStateChange as EventListener);
    
    return () => {
      window.removeEventListener('modalStateChange', handleModalStateChange as EventListener);
    };
  }, []);

  // Don't render until device ID is ready
  if (!deviceId) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Initializing...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* 3D Scene Background - 传递交互禁用状态 */}
      <SplineScene isInteractionDisabled={isModalOpen} />
      
      {/* Spline Event Handler - handles real-time events from Spline */}
      <SplineEventHandler 
        onEventReceived={handleSplineEvent}
        onModalStateChange={setIsModalOpen}
        deviceId={deviceId}
      />

      {/* Subtle gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none z-10"></div>

      {/* Manual Test Button - positioned at bottom right */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-seagull-webhook`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ numbaer5: 0 })
              });
              
              if (response.ok) {
                console.log('Test seagull webhook triggered successfully');
              } else {
                console.error('Failed to trigger test webhook');
              }
            } catch (error) {
              console.error('Error triggering test webhook:', error);
            }
          }}
          className="px-4 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                     hover:from-white/20 hover:via-white/15 hover:to-white/12
                     text-white rounded-xl transition-all duration-300
                     border border-white/25 hover:border-white/35
                     font-inter font-medium text-sm backdrop-blur-md
                     shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                     transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Talk to Seagull
        </button>
      </div>
    </div>
  );
}

export default App;