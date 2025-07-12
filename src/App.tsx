import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { LogIn, LogOut, User } from 'lucide-react';
import { SplineScene } from './components/SplineScene';
import { SplineEventHandler } from './components/SplineEventHandler';
import { AuthModal } from './components/AuthModal';
import { supabase } from './lib/supabase';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSplineEvent = (event: any) => {
    console.log('Spline event received in App:', event);
    // You can add custom logic here to handle different types of events
    // For example, trigger different animations or UI changes based on event.payload
  };

  // 监听模态框状态变化
  useEffect(() => {
    const handleModalStateChange = (event: CustomEvent) => {
      setIsModalOpen(event.detail.isOpen);
    };

    window.addEventListener('modalStateChange', handleModalStateChange as EventListener);
    
    return () => {
      window.removeEventListener('modalStateChange', handleModalStateChange as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="relative h-screen">
      {/* 3D Scene Background - 传递交互禁用状态 */}
      <SplineScene isInteractionDisabled={isModalOpen || showAuthModal} />
      
      {/* Spline Event Handler - handles real-time events from Spline */}
      <SplineEventHandler 
        onEventReceived={handleSplineEvent}
        onModalStateChange={setIsModalOpen}
        session={session}
        setShowAuthModal={setShowAuthModal}
      />

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Subtle gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none z-10"></div>

      {/* Authentication Status & Controls - positioned at top right */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-3">
        {!isLoading && (
          <>
            {session ? (
              // Logged in state
              <div className="flex items-center gap-3">
                {/* User info */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                               backdrop-blur-md border border-white/25 rounded-xl text-white/90 text-sm font-inter">
                  <User className="w-4 h-4" />
                  <span className="max-w-32 truncate">{session.user.email}</span>
                </div>
                
                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 bg-gradient-to-br from-red-500/20 via-red-600/20 to-red-700/20
                             hover:from-red-500/30 hover:via-red-600/30 hover:to-red-700/30
                             text-white rounded-xl transition-all duration-300
                             border border-red-500/30 hover:border-red-500/40
                             font-inter font-medium text-sm backdrop-blur-md
                             shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                             transform hover:scale-[1.02] active:scale-[0.98]
                             flex items-center gap-2"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              // Logged out state
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-gradient-to-br from-blue-500/80 via-blue-600/80 to-purple-600/80
                           hover:from-blue-500/90 hover:via-blue-600/90 hover:to-purple-600/90
                           text-white rounded-xl transition-all duration-300
                           border border-white/20 hover:border-white/30
                           font-inter font-medium text-sm backdrop-blur-md
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                           transform hover:scale-[1.02] active:scale-[0.98]
                           flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </>
        )}
      </div>

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