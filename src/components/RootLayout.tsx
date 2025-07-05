import React, { useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { SplineScene } from '@3d/SplineScene';
import { SplineEventHandler } from '@3d/SplineEventHandler';
import { useAppStateStore } from '@/stores/appStateStore';
import { AuthForm } from '@/components/auth/AuthForm';
import { CreateDestination } from '@/components/onboarding/CreateDestination';
import { LighthouseGoal } from '@/components/onboarding/LighthouseGoal';
import { SailingMode } from '@/components/sailing/SailingMode';
import { GrandMap } from '@/components/visualization/GrandMap';
import { NotificationSystem } from '@/components/ui/NotificationSystem';
import { SailingSummaryPanel } from '@/components/panels/SailingSummaryPanel';

interface SplineEvent {
    type: string;
    payload: Record<string, unknown>;
    timestamp: string;
    source: string;
}

export const RootLayout: React.FC = () => {
    const { sceneMode, setScene, activePanel, showPanel, hidePanels } = useAppStateStore();
    const navigate = useNavigate();

    // Handle modal state changes to control scene interactions
    const handleModalStateChange = useCallback((isOpen: boolean) => {
        if (isOpen) {
            setScene('background'); // Set scene to background when modal is open
        } else {
            setScene('interactive'); // Return to interactive when modal is closed
        }
    }, [setScene]);

    // Handle Spline events and update app state accordingly
    const handleSplineEvent = useCallback((event: SplineEvent) => {
        console.log('Spline event received in RootLayout:', event);
        // Events are already handled by SplineEventHandler, but we can add additional logic here if needed
    }, []);

    // Navigation handlers
    const handleAuthSuccess = useCallback(() => navigate('/onboarding'), [navigate]);
    const handleOnboardingComplete = useCallback(() => navigate('/destinations'), [navigate]);
    const handleDestinationComplete = useCallback(() => navigate('/sailing'), [navigate]);
    const handleMapBack = useCallback(() => navigate('/sailing'), [navigate]);
    const handleEndVoyage = useCallback(() => showPanel('summary'), [showPanel]);

    return (
        <div className="relative w-full h-screen">
            {/* 3D Scene - Always mounted, never unmounts */}
            <SplineScene
                isInteractionDisabled={sceneMode === 'background' || sceneMode === 'hidden'}
            />

            {/* Spline Event Handler - Always mounted, never unmounts */}
            <SplineEventHandler
                onEventReceived={handleSplineEvent}
                onModalStateChange={handleModalStateChange}
            />

            {/* Subtle gradient overlay for depth, from min-d */}
            <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none z-10"></div>

            <div className="relative z-10">
                <Routes>
                    <Route path="/" element={<AuthForm onSuccess={handleAuthSuccess} />} />
                    <Route path="/auth" element={<AuthForm onSuccess={handleAuthSuccess} />} />
                    <Route path="/onboarding" element={<LighthouseGoal onComplete={handleOnboardingComplete} />} />
                    <Route path="/destinations" element={<CreateDestination onComplete={handleDestinationComplete} />} />
                    <Route path="/sailing" element={<SailingMode onEndVoyage={handleEndVoyage} />} />
                    <Route path="/map" element={<GrandMap onBack={handleMapBack} />} />
                </Routes>
            </div>

            <SailingSummaryPanel
                isVisible={activePanel === 'summary'}
                onClose={hidePanels}
                onNewVoyage={() => {
                    hidePanels();
                    navigate('/sailing');
                }}
                onGoToMap={() => {
                    hidePanels();
                    navigate('/map');
                }}
            />

            {/* Global Notification System */}
            <NotificationSystem />

            {/* Scene Mode Visual Overlay */}
            {sceneMode === 'hidden' && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-5 pointer-events-none" />
            )}
        </div>
    );
}; 