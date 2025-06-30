import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SplineScene } from './components/SplineScene';
import { SplineEventHandler } from './components/SplineEventHandler';
import { LifeGoalsModal } from './components/LifeGoalsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { WelcomePanel } from './components/WelcomePanel';
import { JourneyPanel } from './components/JourneyPanel';
import { ControlPanel } from './components/ControlPanel';
import { SailingSummaryPanel } from './components/SailingSummaryPanel';

// Import existing MindBoat services
import { UserService } from './services/UserService';
import { VoyageService } from './services/VoyageService';

interface SailingSummaryData {
  imageUrl: string;
  summaryText: string;
  sessionData?: any;
}

function App() {
  // Modal and panel state management
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showLifeGoalsModal, setShowLifeGoalsModal] = useState(false);
  const [showWelcomePanel, setShowWelcomePanel] = useState(false);
  const [showJourneyPanel, setShowJourneyPanel] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  
  // Summary data state
  const [summaryData, setSummaryData] = useState<SailingSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Check if any modal or panel is open (for Spline interaction blocking)
  const hasOpenUI = showWelcomeModal || showLifeGoalsModal || showWelcomePanel || 
                   showJourneyPanel || showControlPanel || showSummaryPanel;

  // Initialize app state
  useEffect(() => {
    // Check if user has completed onboarding
    const checkUserState = async () => {
      try {
        const userProfile = await UserService.getCurrentUser();
        if (!userProfile?.lighthouse_goal) {
          // New user - show welcome modal
          setShowWelcomeModal(true);
        }
      } catch (error) {
        console.error('Failed to check user state:', error);
        setShowWelcomeModal(true);
      }
    };

    checkUserState();
  }, []);

  // Spline event handlers
  const handleWelcomeEvent = () => {
    setShowWelcomePanel(true);
  };

  const handleJourneyEvent = () => {
    setShowJourneyPanel(true);
  };

  const handleGoalsEvent = () => {
    setShowLifeGoalsModal(true);
  };

  const handleSailingSummaryEvent = async (data: any) => {
    setSummaryLoading(true);
    setShowSummaryPanel(true);
    
    try {
      // Connect to existing summary generation service
      const summary = await VoyageService.generateSummary(data);
      setSummaryData(summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Modal/Panel handlers
  const handleWelcomeModalComplete = () => {
    setShowWelcomeModal(false);
    setShowLifeGoalsModal(true);
  };

  const handleLifeGoalsSubmit = async (goal: string) => {
    try {
      await UserService.setLighthouseGoal(goal);
      setShowLifeGoalsModal(false);
      setShowWelcomePanel(true);
    } catch (error) {
      console.error('Failed to save lighthouse goal:', error);
    }
  };

  const handleWelcomePanelComplete = () => {
    setShowWelcomePanel(false);
    setShowJourneyPanel(true);
  };

  const handleStartControlPanel = () => {
    setShowJourneyPanel(false);
    setShowControlPanel(true);
  };

  const handleEndVoyage = async () => {
    setShowControlPanel(false);
    setSummaryLoading(true);
    setShowSummaryPanel(true);
    
    try {
      // Generate summary using existing service
      const summary = await VoyageService.generateVoyageSummary();
      setSummaryData(summary);
    } catch (error) {
      console.error('Failed to generate voyage summary:', error);
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSummaryClose = () => {
    setShowSummaryPanel(false);
    setSummaryData(null);
    setShowJourneyPanel(true); // Return to journey panel
  };

  const closeAllPanels = () => {
    setShowWelcomePanel(false);
    setShowJourneyPanel(false);
    setShowControlPanel(false);
    setShowSummaryPanel(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      
      {/* 3D Ocean Background */}
      <SplineScene
        className="absolute inset-0"
        disableInteractions={hasOpenUI}
        onLoad={() => console.log('Spline scene loaded')}
        onError={(error) => console.error('Spline error:', error)}
      />

      {/* Spline Event Handler */}
      <SplineEventHandler
        onWelcomeEvent={handleWelcomeEvent}
        onJourneyEvent={handleJourneyEvent}
        onGoalsEvent={handleGoalsEvent}
        onSailingSummaryEvent={handleSailingSummaryEvent}
      />

      {/* Modals */}
      <AnimatePresence>
        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
          onGetStarted={handleWelcomeModalComplete}
        />

        <LifeGoalsModal
          isOpen={showLifeGoalsModal}
          onClose={() => setShowLifeGoalsModal(false)}
          onSubmit={handleLifeGoalsSubmit}
        />

        <SailingSummaryPanel
          isVisible={showSummaryPanel}
          summaryData={summaryData}
          isLoading={summaryLoading}
          onClose={handleSummaryClose}
          onViewDiary={() => {
            // TODO: Implement diary view
            console.log('View diary clicked');
          }}
        />
      </AnimatePresence>

      {/* Side Panels */}
      <AnimatePresence>
        <WelcomePanel
          isVisible={showWelcomePanel}
          onComplete={handleWelcomePanelComplete}
          onClose={closeAllPanels}
        />

        <JourneyPanel
          isVisible={showJourneyPanel}
          onClose={closeAllPanels}
          onStartControlPanel={handleStartControlPanel}
          onShowSummary={(data) => {
            setSummaryData(data);
            setShowSummaryPanel(true);
          }}
        />
      </AnimatePresence>

      {/* Floating Controls */}
      <ControlPanel
        isVisible={showControlPanel}
        onEndVoyage={handleEndVoyage}
      />

      {/* Development tools - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 space-y-2 z-50">
          <button
            onClick={() => setShowWelcomeModal(true)}
            className="block px-3 py-1 bg-white/10 text-white text-xs rounded"
          >
            Welcome Modal
          </button>
          <button
            onClick={() => setShowLifeGoalsModal(true)}
            className="block px-3 py-1 bg-white/10 text-white text-xs rounded"
          >
            Goals Modal
          </button>
          <button
            onClick={() => setShowJourneyPanel(true)}
            className="block px-3 py-1 bg-white/10 text-white text-xs rounded"
          >
            Journey Panel
          </button>
        </div>
      )}
    </div>
  );
}

export default App;