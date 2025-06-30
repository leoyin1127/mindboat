/**
 * Integration adapter to connect min-d interface components 
 * with existing MindBoat backend services
 */

import { UserService, DestinationService, VoyageService, DistractionService, ReflectionService } from '../services';
import type { UserProfile, CreateDestinationInput, StartVoyageInput, DistractionEvent } from '../services';

export class MinDIntegrationAdapter {
  
  /**
   * User & Goals Integration
   */
  static userAdapters = {
    // Connect LifeGoalsModal to UserService
    setLighthouseGoal: async (goal: string): Promise<boolean> => {
      try {
        const userProfile = await UserService.setLighthouseGoal(goal);
        return !!userProfile;
      } catch (error) {
        console.error('Failed to set lighthouse goal:', error);
        return false;
      }
    },

    // Get current user for initialization
    getCurrentUser: async (): Promise<UserProfile | null> => {
      try {
        return await UserService.getCurrentUser();
      } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
      }
    },

    // Check if user has completed onboarding
    hasCompletedOnboarding: async (): Promise<boolean> => {
      try {
        const user = await UserService.getCurrentUser();
        return !!(user?.lighthouse_goal);
      } catch (error) {
        return false;
      }
    }
  };

  /**
   * Journey Panel Integration
   */
  static journeyAdapters = {
    // Get user's destinations/tasks
    getDestinations: async () => {
      try {
        return await DestinationService.getUserDestinations();
      } catch (error) {
        console.error('Failed to get destinations:', error);
        return [];
      }
    },

    // Create new destination from task input
    createDestination: async (taskInput: string) => {
      try {
        const destination = await DestinationService.create({
          original_task: taskInput,
          // Let the service generate the destination name and description
        } as CreateDestinationInput);
        return destination;
      } catch (error) {
        console.error('Failed to create destination:', error);
        return null;
      }
    },

    // Start a voyage for a destination
    startVoyage: async (destinationId: string) => {
      try {
        const voyage = await VoyageService.start({
          destination_id: destinationId,
        } as StartVoyageInput);
        return voyage;
      } catch (error) {
        console.error('Failed to start voyage:', error);
        return null;
      }
    },

    // Mark destination as completed
    markDestinationComplete: async (destinationId: string) => {
      try {
        return await DestinationService.markComplete(destinationId);
      } catch (error) {
        console.error('Failed to mark destination complete:', error);
        return false;
      }
    }
  };

  /**
   * Control Panel Integration
   */
  static controlPanelAdapters = {
    // Get current voyage info
    getCurrentVoyage: async () => {
      try {
        return await VoyageService.getCurrentVoyage();
      } catch (error) {
        console.error('Failed to get current voyage:', error);
        return null;
      }
    },

    // End current voyage
    endVoyage: async () => {
      try {
        return await VoyageService.end();
      } catch (error) {
        console.error('Failed to end voyage:', error);
        return null;
      }
    },

    // Record distraction event
    recordDistraction: async (event: DistractionEvent) => {
      try {
        return await DistractionService.record(event);
      } catch (error) {
        console.error('Failed to record distraction:', error);
        return false;
      }
    },

    // Enter exploration mode
    enterExplorationMode: async () => {
      try {
        return await VoyageService.enterExplorationMode();
      } catch (error) {
        console.error('Failed to enter exploration mode:', error);
        return false;
      }
    },

    // Return to focused mode
    returnToFocus: async () => {
      try {
        return await VoyageService.returnToFocus();
      } catch (error) {
        console.error('Failed to return to focus:', error);
        return false;
      }
    }
  };

  /**
   * Summary Panel Integration
   */
  static summaryAdapters = {
    // Generate voyage summary
    generateVoyageSummary: async (voyageId?: string) => {
      try {
        return await VoyageService.generateSummary(voyageId);
      } catch (error) {
        console.error('Failed to generate voyage summary:', error);
        return null;
      }
    },

    // Get daily reflection
    getDailyReflection: async (date?: string) => {
      try {
        return await ReflectionService.getDailyReflection(date);
      } catch (error) {
        console.error('Failed to get daily reflection:', error);
        return null;
      }
    },

    // Generate seagull diary entry
    generateSeagullDiary: async (voyageId: string) => {
      try {
        return await ReflectionService.generateSeagullDiary(voyageId);
      } catch (error) {
        console.error('Failed to generate seagull diary:', error);
        return null;
      }
    }
  };

  /**
   * Spline Event Integration
   */
  static splineAdapters = {
    // Handle Spline webhook events
    handleSplineEvent: async (eventType: string, eventData: any) => {
      try {
        switch (eventType) {
          case 'welcome':
            // Track welcome interaction
            console.log('Welcome event triggered via Spline');
            break;
          case 'journey':
            // Track journey panel opening
            console.log('Journey event triggered via Spline');
            break;
          case 'goals':
            // Track goals modal opening
            console.log('Goals event triggered via Spline');
            break;
          case 'sailing_summary':
            // Handle summary generation request
            return await MinDIntegrationAdapter.summaryAdapters.generateVoyageSummary();
          default:
            console.log('Unknown Spline event:', eventType);
        }
        return true;
      } catch (error) {
        console.error('Failed to handle Spline event:', error);
        return false;
      }
    }
  };

  /**
   * Utility Methods
   */
  static utils = {
    // Format time for display
    formatTime: (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    // Calculate voyage duration
    calculateVoyageDuration: (startTime: string, endTime?: string): number => {
      const start = new Date(startTime).getTime();
      const end = endTime ? new Date(endTime).getTime() : Date.now();
      return Math.floor((end - start) / 1000);
    },

    // Validate environment variables
    validateEnvironment: (): boolean => {
      const requiredVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY'
      ];
      
      return requiredVars.every(varName => {
        const value = import.meta.env[varName];
        if (!value) {
          console.error(`Missing required environment variable: ${varName}`);
          return false;
        }
        return true;
      });
    }
  };
}

// Export convenience methods for direct use in components
export const {
  userAdapters,
  journeyAdapters,
  controlPanelAdapters,
  summaryAdapters,
  splineAdapters,
  utils
} = MinDIntegrationAdapter;