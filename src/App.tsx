import React from 'react';
import { SplineScene } from './components/SplineScene';
import { SplineEventHandler } from './components/SplineEventHandler';
import { auth, type AnonymousUser } from './lib/auth';
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import ReactPlugin from '@stagewise-plugins/react';

function App() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<AnonymousUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Initialize anonymous authentication on app load
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        setIsAuthLoading(true);
        setAuthError(null);

        console.log('🔐 Initializing anonymous authentication...');
        const user = await auth.initialize();
        setCurrentUser(user);

        console.log('✅ Anonymous authentication successful:', {
          userId: user.id,
          deviceFingerprint: user.deviceFingerprint.slice(0, 8) + '...',
          guidingStar: user.guidingStar,
          isFirstTime: !user.guidingStar
        });

      } catch (error) {
        console.error('❌ Authentication failed:', error);
        setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleSplineEvent = (event: unknown) => {
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

  // Show loading state while authentication is initializing
  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80 text-lg font-inter">Initializing Mindship...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (authError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-black">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-white text-2xl font-playfair mb-4">Authentication Error</h1>
          <p className="text-white/80 text-lg font-inter mb-6">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show main app once authentication is successful
  return (
    <div className="relative h-screen">
      {/* Stagewise Toolbar - only in development */}
      <StagewiseToolbar
        config={{
          plugins: [ReactPlugin],
        }}
      />

      {/* Authentication Debug Info (only in development) */}
      {import.meta.env.DEV && currentUser && (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs font-mono">
          <div>User ID: {currentUser.id.slice(0, 8)}...</div>
          <div>Fingerprint: {currentUser.deviceFingerprint.slice(0, 12)}...</div>
          <div>Goal: {currentUser.guidingStar || 'Not set'}</div>
        </div>
      )}

      {/* 3D Scene Background - 传递交互禁用状态 */}
      <SplineScene isInteractionDisabled={isModalOpen} />

      {/* Spline Event Handler - handles real-time events from Spline */}
      <SplineEventHandler
        onEventReceived={handleSplineEvent}
        onModalStateChange={setIsModalOpen}
        currentUser={currentUser}
      />

      {/* Subtle gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none z-10"></div>

      {/* Temporary Test Buttons - positioned at bottom right */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
        {/* Start Journey Button (replaces Spline start button) */}
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journey-webhook`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({})
              });

              if (response.ok) {
                console.log('Journey webhook triggered successfully');
              } else {
                console.error('Failed to trigger journey webhook');
              }
            } catch (error) {
              console.error('Error triggering journey webhook:', error);
            }
          }}
          className="px-4 py-2 bg-gradient-to-br from-blue-500/20 via-blue-400/15 to-blue-300/10
                     hover:from-blue-500/30 hover:via-blue-400/25 hover:to-blue-300/20
                     text-white rounded-xl transition-all duration-300
                     border border-blue-400/30 hover:border-blue-400/50
                     font-inter font-medium text-sm backdrop-blur-md
                     shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                     transform hover:scale-[1.02] active:scale-[0.98]"
        >
          🚀 Start Journey
        </button>

        {/* Welcome Button */}
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/welcome-webhook`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  user_id: currentUser?.id
                })
              });

              if (response.ok) {
                console.log('Welcome webhook triggered successfully');
              } else {
                console.error('Failed to trigger welcome webhook');
              }
            } catch (error) {
              console.error('Error triggering welcome webhook:', error);
            }
          }}
          className="px-4 py-2 bg-gradient-to-br from-green-500/20 via-green-400/15 to-green-300/10
                     hover:from-green-500/30 hover:via-green-400/25 hover:to-green-300/20
                     text-white rounded-xl transition-all duration-300
                     border border-green-400/30 hover:border-green-400/50
                     font-inter font-medium text-sm backdrop-blur-md
                     shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                     transform hover:scale-[1.02] active:scale-[0.98]"
        >
          👋 Welcome
        </button>

        {/* Goals Button */}
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-webhook`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({})
              });

              if (response.ok) {
                console.log('Goals webhook triggered successfully');
              } else {
                console.error('Failed to trigger goals webhook');
              }
            } catch (error) {
              console.error('Error triggering goals webhook:', error);
            }
          }}
          className="px-4 py-2 bg-gradient-to-br from-purple-500/20 via-purple-400/15 to-purple-300/10
                     hover:from-purple-500/30 hover:via-purple-400/25 hover:to-purple-300/20
                     text-white rounded-xl transition-all duration-300
                     border border-purple-400/30 hover:border-purple-400/50
                     font-inter font-medium text-sm backdrop-blur-md
                     shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                     transform hover:scale-[1.02] active:scale-[0.98]"
        >
          🎯 Goals
        </button>

        {/* Seagull Button */}
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
          🐦 Talk to Seagull
        </button>
      </div>
    </div>
  );
}

export default App;