import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MinDIntegrationAdapter } from '../adapters/MinDIntegrationAdapter';

// Enhanced interface state for min-d
interface MinDState {
  // UI State
  currentPanel: 'welcome' | 'journey' | 'control' | 'summary' | null;
  splineInteractionEnabled: boolean;
  voiceRecordingState: {
    isRecording: boolean;
    recordedBlob: Blob | null;
    duration: number;
  } | null;
  
  // Actions
  setCurrentPanel: (panel: MinDState['currentPanel']) => void;
  setSplineInteractionEnabled: (enabled: boolean) => void;
  setVoiceRecordingState: (state: MinDState['voiceRecordingState']) => void;
}

export const useMinDStore = create<MinDState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentPanel: null,
    splineInteractionEnabled: true,
    voiceRecordingState: null,

    // Actions
    setCurrentPanel: (panel) => {
      set({ currentPanel: panel });
      // Disable Spline interactions when panels are open
      set({ splineInteractionEnabled: panel === null });
    },

    setSplineInteractionEnabled: (enabled) => {
      set({ splineInteractionEnabled: enabled });
    },

    setVoiceRecordingState: (state) => {
      set({ voiceRecordingState: state });
    },
  }))
);

// Enhanced voyage store with min-d integration
interface EnhancedVoyageState {
  // Existing voyage state (preserve from original)
  currentVoyage: any | null;
  isVoyageActive: boolean;
  voyageStartTime: string | null;
  distractionEvents: any[];
  
  // Min-d enhancements
  voyageVisualState: 'sailing' | 'distracted' | 'exploring' | 'resting';
  encouragementMessage: string | null;
  
  // Actions
  startVoyage: (destinationId: string) => Promise<boolean>;
  endVoyage: () => Promise<boolean>;
  recordDistraction: (event: any) => Promise<boolean>;
  setVoyageVisualState: (state: EnhancedVoyageState['voyageVisualState']) => void;
  setEncouragementMessage: (message: string | null) => void;
}

export const useEnhancedVoyageStore = create<EnhancedVoyageState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentVoyage: null,
    isVoyageActive: false,
    voyageStartTime: null,
    distractionEvents: [],
    voyageVisualState: 'sailing',
    encouragementMessage: null,

    // Enhanced actions
    startVoyage: async (destinationId: string) => {
      try {
        const voyage = await MinDIntegrationAdapter.journeyAdapters.startVoyage(destinationId);
        if (voyage) {
          set({
            currentVoyage: voyage,
            isVoyageActive: true,
            voyageStartTime: voyage.start_time,
            voyageVisualState: 'sailing',
            encouragementMessage: 'Fair winds and focused sailing ahead!'
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to start voyage:', error);
        return false;
      }
    },

    endVoyage: async () => {
      try {
        const result = await MinDIntegrationAdapter.controlPanelAdapters.endVoyage();
        if (result) {
          set({
            currentVoyage: null,
            isVoyageActive: false,
            voyageStartTime: null,
            voyageVisualState: 'sailing',
            encouragementMessage: null
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to end voyage:', error);
        return false;
      }
    },

    recordDistraction: async (event: any) => {
      try {
        const success = await MinDIntegrationAdapter.controlPanelAdapters.recordDistraction(event);
        if (success) {
          set(state => ({
            distractionEvents: [...state.distractionEvents, event],
            voyageVisualState: 'distracted'
          }));
        }
        return success;
      } catch (error) {
        console.error('Failed to record distraction:', error);
        return false;
      }
    },

    setVoyageVisualState: (visualState) => {
      set({ voyageVisualState: visualState });
    },

    setEncouragementMessage: (message) => {
      set({ encouragementMessage: message });
    },
  }))
);

// Subscribe to state changes for side effects
useMinDStore.subscribe(
  (state) => state.currentPanel,
  (currentPanel) => {
    // Log panel changes in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Panel changed to:', currentPanel);
    }
    
    // Additional side effects for panel changes
    if (currentPanel === 'control') {
      // Starting voyage - could trigger ambient sounds, etc.
    } else if (currentPanel === 'summary') {
      // Voyage ended - could trigger celebration effects
    }
  }
);