import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/auth/AuthForm';
import { LighthouseGoal } from './components/onboarding/LighthouseGoal';
import { CreateDestination } from './components/onboarding/CreateDestination';
import { VoyagePreparation } from './components/sailing/VoyagePreparation';
import { SailingMode } from './components/sailing/SailingMode';
import { VoyageComplete } from './components/sailing/VoyageComplete';
import { GrandMap } from './components/visualization/GrandMap';
import { NotificationSystem } from './components/ui/NotificationSystem';
import { useUserStore } from './stores/userStore';
import { useDestinationStore } from './stores/destinationStore';
import { useVoyageStore } from './stores/voyageStore';
import { useNotificationStore } from './stores/notificationStore';
import type { Destination } from './types';

type AppState = 'auth' | 'lighthouse' | 'destinations' | 'voyage-prep' | 'sailing' | 'voyage-complete' | 'map';

function App() {
  const { 
    user, 
    lighthouseGoal, 
    initialize, 
    isLoading, 
    isAuthenticated, 
    authMode,
    error: authError 
  } = useUserStore();
  
  const { destinations, loadDestinations } = useDestinationStore();
  const { currentVoyage, voyageHistory, startVoyage, endVoyage } = useVoyageStore();
  const { showSuccess, showError, showInfo } = useNotificationStore();
  
  const [appState, setAppState] = useState<AppState>('auth');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [completedVoyageId, setCompletedVoyageId] = useState<string | null>(null);
  const [initializationComplete, setInitializationComplete] = useState(false);

  // Initialize the app
  useEffect(() => {
    const initApp = async () => {
      await initialize();
      setInitializationComplete(true);
    };
    
    initApp();
  }, [initialize]);

  // Handle state transitions after initialization
  useEffect(() => {
    if (!initializationComplete) return;

    if (isAuthenticated && user) {
      // Show welcome notification
      if (authMode === 'demo') {
        showInfo(
          'You\'re in demo mode. Your progress won\'t be saved permanently.',
          'Welcome to MindBoat!',
          { duration: 6000 }
        );
      } else {
        showSuccess(
          `Welcome back, ${user.email}!`,
          'Successfully signed in'
        );
      }

      // Load user data
      if (authMode === 'supabase') {
        loadDestinations(user.id);
      }
      
      // Determine app state based on user progress and current voyage
      if (!lighthouseGoal) {
        setAppState('lighthouse');
      } else if (currentVoyage && appState !== 'sailing') {
        // If there's an active voyage and we're not already in sailing mode
        setAppState('sailing');
        showInfo('Resuming your active voyage...', 'Welcome back');
      } else if (appState === 'auth') {
        // Only set to voyage-prep if we're coming from auth
        setAppState('voyage-prep');
      }
    } else {
      setAppState('auth');
    }
  }, [isAuthenticated, user, lighthouseGoal, currentVoyage, authMode, initializationComplete]);

  // Show auth errors as notifications
  useEffect(() => {
    if (authError && initializationComplete) {
      showError(authError, 'Authentication Error');
    }
  }, [authError, initializationComplete, showError]);

  // Show loading screen during initialization
  if (!initializationComplete || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">
            {isLoading ? 'Loading...' : 'Initializing MindBoat...'}
          </div>
          {authError && (
            <div className="mt-4 text-red-300 text-sm max-w-md">
              {authError}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleAuthSuccess = () => {
    if (!lighthouseGoal) {
      setAppState('lighthouse');
    } else {
      setAppState('voyage-prep');
    }
  };

  const handleLighthouseComplete = () => {
    showSuccess('Your lighthouse goal has been set!', 'Goal Saved');
    
    // Skip destinations if user already has some, go straight to voyage prep
    if (destinations.length > 0) {
      setAppState('voyage-prep');
    } else {
      setAppState('destinations');
    }
  };

  const handleDestinationsComplete = () => {
    showSuccess('Ready to start your first voyage!', 'Destinations Created');
    setAppState('voyage-prep');
  };

  const handleStartVoyage = async (destination: Destination, plannedDuration: number) => {
    if (!user) return;
    
    setSelectedDestination(destination);
    
    try {
      // Start the voyage in the store
      await startVoyage(destination.id, user.id, plannedDuration);
      
      showSuccess(
        `Sailing to ${destination.destination_name}`,
        'Voyage Started',
        { duration: 3000 }
      );
      
      // Transition to sailing mode
      setAppState('sailing');
    } catch (error) {
      console.error('Failed to start voyage:', error);
      showError(
        'Failed to start your voyage. Please try again.',
        'Voyage Error'
      );
    }
  };

  const handleEndVoyage = async () => {
    if (currentVoyage && selectedDestination) {
      // Capture distraction count before ending voyage (since endVoyage resets store state)
      const { distractionCount } = useVoyageStore.getState();
      
      try {
        // End the voyage in the store
        const updatedVoyage = await endVoyage();
        
        showSuccess(
          'Your voyage has been completed successfully!',
          'Voyage Complete'
        );
        
        // Set completed voyage data for the completion screen
        if (updatedVoyage) {
          setCompletedVoyageId(updatedVoyage.id);
        } else {
          // Fallback: use current voyage ID
          setCompletedVoyageId(currentVoyage.id);
        }
        
        // Transition to voyage complete screen
        setAppState('voyage-complete');
      } catch (error) {
        console.error('Failed to end voyage:', error);
        showError(
          'Failed to save your voyage progress.',
          'Save Error'
        );
        setAppState('voyage-prep');
      }
    }
  };

  const handleVoyageCompleteNext = () => {
    setAppState('map');
  };

  const handleBackToPrep = () => {
    setSelectedDestination(null);
    setCompletedVoyageId(null);
    setAppState('voyage-prep');
  };

  const handleViewMap = () => {
    setAppState('map');
  };

  const handleManageDestinations = () => {
    setAppState('destinations');
  };

  return (
    <div className="App">
      {appState === 'auth' && (
        <AuthForm onSuccess={handleAuthSuccess} />
      )}
      
      {appState === 'lighthouse' && (
        <LighthouseGoal onComplete={handleLighthouseComplete} />
      )}
      
      {appState === 'destinations' && (
        <CreateDestination onComplete={handleDestinationsComplete} />
      )}
      
      {appState === 'voyage-prep' && (
        <VoyagePreparation 
          onStartVoyage={handleStartVoyage}
          onViewMap={handleViewMap}
          onManageDestinations={handleManageDestinations}
        />
      )}
      
      {appState === 'sailing' && selectedDestination && (
        <SailingMode 
          destination={selectedDestination} 
          onEndVoyage={handleEndVoyage}
        />
      )}
      
      {appState === 'voyage-complete' && completedVoyageId && (
        <VoyageComplete
          voyageId={completedVoyageId}
          onContinue={handleVoyageCompleteNext}
        />
      )}
      
      {appState === 'map' && (
        <GrandMap onBack={handleBackToPrep} />
      )}
      
      {/* Global Notification System */}
      <NotificationSystem />
    </div>
  );
}

export default App;