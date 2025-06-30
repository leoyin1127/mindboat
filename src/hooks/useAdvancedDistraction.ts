/**
 * Advanced Distraction Detection Hook - Complete Detection System
 * 
 * This hook implements comprehensive distraction detection using:
 * 1. Tab switching detection via Page Visibility API
 * 2. Combined screenshot + camera analysis every 60 seconds
 * 3. URL blacklist checking (independent)
 * 4. Activity and idle monitoring
 * 
 * All detection methods work together to provide comprehensive distraction monitoring.
 * Detection results are stored in Supabase regardless of whether distraction is detected.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useVoyageStore } from '../stores/voyageStore';
import { useUserStore } from '../stores/userStore';
import { GeminiService } from '../services/GeminiService';
import { DetectionResultService } from '../services/DetectionResultService';
import {
  DISTRACTION_BLACKLIST,
  PRODUCTIVITY_WHITELIST
} from '../config/prompts';
import type { Destination, DistractionDetectionEvent } from '../types';

interface UseAdvancedDistractionProps {
  isExploring?: boolean;
  currentDestination?: Destination | null;
  cameraStream?: MediaStream | null;
}

// Enhanced distraction type mapping
const ENHANCED_DISTRACTION_MAPPING = {
  // Social media domains
  'facebook.com': 'social_media',
  'twitter.com': 'social_media',
  'x.com': 'social_media',
  'instagram.com': 'social_media',
  'tiktok.com': 'social_media',
  'linkedin.com/feed': 'social_media',
  'reddit.com': 'social_media',

  // Entertainment
  'youtube.com/watch': 'entertainment',
  'netflix.com': 'entertainment',
  'hulu.com': 'entertainment',
  'twitch.tv': 'entertainment',
  'spotify.com': 'entertainment',

  // Shopping
  'amazon.com': 'shopping',
  'ebay.com': 'shopping',
  'aliexpress.com': 'shopping',
  'etsy.com': 'shopping',

  // News
  'cnn.com': 'news_browsing',
  'bbc.com': 'news_browsing',
  'news.google.com': 'news_browsing',
  'reuters.com': 'news_browsing',
  'nytimes.com': 'news_browsing',
};

// Tab switching detection state
interface TabSwitchDetectionState {
  isDistracted: boolean;
  startTime: number | null;
  isTabHidden: boolean;
}

// Combined screenshot + camera detection state
interface CombinedDetectionState {
  isDistracted: boolean;
  startTime: number | null;
  lastCheck: number;
  confidenceLevel: number;
  error: string | null;
  lastCameraAnalysis: unknown;
  lastScreenshotAnalysis: unknown;
  isActive: boolean;
}

interface UrlDetectionState {
  isDistracted: boolean;
  startTime: number | null;
  currentUrl: string;
  distractionType: 'blacklisted_content' | 'irrelevant_browsing' | null;
}

export const useAdvancedDistraction = ({
  isExploring = false,
  currentDestination = null,
  cameraStream = null
}: UseAdvancedDistractionProps) => {

  const hasTriggeredDistractionRef = useRef(false);

  const { isVoyageActive, recordDistraction, currentVoyage } = useVoyageStore(state => ({
    isVoyageActive: state.isVoyageActive,
    recordDistraction: state.recordDistraction,
    currentVoyage: state.currentVoyage,
  }));
  const { user } = useUserStore();

  // Tab switching detection state
  const [tabSwitchState, setTabSwitchState] = useState<TabSwitchDetectionState>({
    isDistracted: false,
    startTime: null,
    isTabHidden: false
  });

  // Combined detection state (screenshot + camera in one analysis)
  const [combinedState, setCombinedState] = useState<CombinedDetectionState>({
    isDistracted: false,
    startTime: null,
    lastCheck: Date.now(),
    confidenceLevel: 0,
    error: null,
    lastCameraAnalysis: null,
    lastScreenshotAnalysis: null,
    isActive: false
  });

  const [urlState, setUrlState] = useState<UrlDetectionState>({
    isDistracted: false,
    startTime: null,
    currentUrl: window.location.href,
    distractionType: null
  });

  // Combined state
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for intervals and timeouts
  const combinedCheckInterval = useRef<NodeJS.Timeout>();
  const urlCheckInterval = useRef<NodeJS.Timeout>();
  const distractionTimeoutRef = useRef<NodeJS.Timeout>();

  // Refs for state tracking
  const isExploringRef = useRef(isExploring);
  const isVoyageActiveRef = useRef(isVoyageActive);
  const destinationRef = useRef(currentDestination);
  const lastUrlRef = useRef(window.location.href);
  const lastActivityTime = useRef<number>(Date.now());
  const idleTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync refs with props
  useEffect(() => {
    isExploringRef.current = isExploring;
    isVoyageActiveRef.current = isVoyageActive;
    destinationRef.current = currentDestination;
  }, [isExploring, isVoyageActive, currentDestination]);

  // Debug logging function - memoized to prevent infinite loops
  const debugLog = useCallback((category: string, message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    }
  }, []); // Empty dependency array to prevent recreation

  // Tab switching detection using Page Visibility API
  const handleVisibilityChange = useCallback(() => {
    const shouldMonitor = isVoyageActive && !isExploringRef.current;
    if (!shouldMonitor) return;

    const isHidden = document.hidden;
    const currentTime = Date.now();

    debugLog('TAB_SWITCH', 'Visibility change detected', {
      hidden: isHidden,
      documentVisibilityState: document.visibilityState,
      timestamp: new Date().toISOString(),
      voyageActive: isVoyageActive,
      exploring: isExploringRef.current
    });

    // Store tab switch detection result regardless of distraction
    if (currentVoyage && user) {
      DetectionResultService.storeTabSwitchDetection({
        voyageId: currentVoyage.id,
        userId: user.id,
        detected: isHidden,
        visibilityState: document.visibilityState,
        timestamp: new Date(currentTime),
      });
    }

    if (isHidden) {
      // Tab became hidden - user switched away
      debugLog('TAB_SWITCH', 'User switched away from tab - starting timer');
      const startTime = Date.now();

      setTabSwitchState(prev => ({
        ...prev,
        startTime,
        isTabHidden: true
      }));

      // Set timeout for distraction detection (5 seconds)
      distractionTimeoutRef.current = setTimeout(() => {
        setTabSwitchState(prev => {
          if (prev.isTabHidden && !prev.isDistracted) {
            debugLog('TAB_SWITCH', '🚨 DISTRACTION TRIGGERED - user away for 5+ seconds');

            // Record distraction
            setTimeout(() => {
              recordDistraction({
                type: 'tab_switch',
                timestamp: startTime,
              });
            }, 0);

            return {
              ...prev,
              isDistracted: true // 🔧 KEY FIX: This sets the distracted state
            };
          }
          return prev;
        });
      }, 5000);
    } else {
      // Tab became visible - user returned
      debugLog('TAB_SWITCH', 'User returned to tab', {
        hadTimeout: !!distractionTimeoutRef.current,
        wasDistracted: tabSwitchState.isDistracted,
        timeAway: tabSwitchState.startTime ?
          `${Math.round((Date.now() - tabSwitchState.startTime) / 1000)}s` : 'N/A'
      });

      // Store return-to-tab detection result
      if (currentVoyage && user && tabSwitchState.startTime) {
        const duration = currentTime - tabSwitchState.startTime;
        DetectionResultService.storeTabSwitchDetection({
          voyageId: currentVoyage.id,
          userId: user.id,
          detected: false, // User returned
          durationMs: duration,
          visibilityState: document.visibilityState,
          timestamp: new Date(currentTime),
        });
      }

      // Clear timeout if user returned quickly
      if (distractionTimeoutRef.current) {
        clearTimeout(distractionTimeoutRef.current);
        debugLog('TAB_SWITCH', 'Cleared distraction timeout - user returned quickly');
      }

      // Handle distraction completion
      setTabSwitchState(prev => {
        if (prev.startTime) {
          const duration = Date.now() - prev.startTime;

          if (duration >= 5000 && !hasTriggeredDistractionRef.current) {
            hasTriggeredDistractionRef.current = true;
            debugLog('TAB_SWITCH', '🚨 DISTRACTION TRIGGERED on return - user was away long enough', {
              duration: `${Math.round(duration / 1000)} seconds`,
              wasTriggered: prev.isDistracted
            });

            // Record the distraction event
            setTimeout(() => {
              recordDistraction({
                type: 'tab_switch',
                timestamp: prev.startTime!,
                duration,
              });
            }, 0);

            // Return the distracted state so the UI can react
            debugLog('TAB_SWITCH', '🎤 Setting distraction state for voice alert processing');
            return {
              ...prev,
              isDistracted: true,
              isTabHidden: false
            };
          }
          else if (duration < 5000) {
            debugLog('TAB_SWITCH', 'User returned quickly - no distraction triggered', {
              duration: `${Math.round(duration / 1000)} seconds`
            });
          }
        }

        // If already distracted, preserve the distracted state when returning to tab
        if (prev.isDistracted) {
          debugLog('TAB_SWITCH', 'Preserving existing distraction state on return');
          return {
            ...prev,
            isTabHidden: false
          };
        }

        // Only clear distraction state for quick returns with no existing distraction
        return {
          ...prev,
          isDistracted: false,
          startTime: null,
          isTabHidden: false
        };
      });

      // Reset activity tracking
      lastActivityTime.current = Date.now();

      // Check URL when returning to tab (in case user navigated while away)
      setTimeout(() => {
        debugLog('TAB_SWITCH', 'Performing URL check after tab return');
        checkUrlChange();
      }, 100);
    }
  }, [isVoyageActive, recordDistraction, debugLog, currentVoyage, user]);

  // URL checking for blacklisted/irrelevant content
  const checkUrlChange = useCallback(() => {
    if (!isVoyageActive || isExploringRef.current) return;

    const currentUrl = window.location.href;
    const previousUrl = lastUrlRef.current;

    if (currentUrl === previousUrl) return;

    debugLog('URL', 'URL changed detected', { from: previousUrl, to: currentUrl });
    lastUrlRef.current = currentUrl;

    // Enhanced URL checking with specific distraction types
    let distractionType: DistractionDetectionEvent['type'] | null = null;

    // Check for specific distraction types
    for (const [domain, type] of Object.entries(ENHANCED_DISTRACTION_MAPPING)) {
      if (currentUrl.toLowerCase().includes(domain.toLowerCase())) {
        distractionType = type as DistractionDetectionEvent['type'];
        break;
      }
    }

    // Fallback to general blacklist check
    if (!distractionType) {
      const isBlacklisted = DISTRACTION_BLACKLIST.some(item =>
        currentUrl.toLowerCase().includes(item.toLowerCase())
      );

      if (isBlacklisted) {
        distractionType = 'irrelevant_browsing';
      }
    }

    // Check if task-related (simplified check)
    const isTaskRelated = destinationRef.current?.related_apps?.some((app: string) =>
      currentUrl.toLowerCase().includes(app.toLowerCase())
    ) || false;

    if (distractionType) {
      debugLog('URL', 'Distracting site detected', { url: currentUrl, type: distractionType });
      setUrlState(prev => ({
        ...prev,
        isDistracted: true,
        startTime: Date.now(),
        currentUrl,
        distractionType: distractionType as 'blacklisted_content' | 'irrelevant_browsing'
      }));

      recordDistraction({
        type: distractionType,
        timestamp: Date.now(),
      });
    } else if (!isTaskRelated) {
      // Check if it's an irrelevant site (not blacklisted but not related to task)
      const isProductivitySite = PRODUCTIVITY_WHITELIST.some(item =>
        currentUrl.toLowerCase().includes(item.toLowerCase())
      );

      if (!isProductivitySite) {
        debugLog('URL', 'Potentially irrelevant site detected', { url: currentUrl });
        setUrlState(prev => ({
          ...prev,
          isDistracted: true,
          startTime: Date.now(),
          currentUrl,
          distractionType: 'irrelevant_content'
        }));

        recordDistraction({
          type: 'irrelevant_browsing',
          timestamp: Date.now(),
        });
      }
    } else if (isTaskRelated && urlState.isDistracted) {
      // User returned to task-related site
      debugLog('URL', 'Clearing distraction due to return to task');
      setUrlState(prev => ({
        ...prev,
        isDistracted: false,
        startTime: null,
        distractionType: null
      }));
    }
  }, [isVoyageActive, currentDestination, recordDistraction, debugLog]);

  // Activity monitoring
  const handleActivity = useCallback(() => {
    const shouldMonitor = isVoyageActive && !isExploringRef.current;
    if (!shouldMonitor) return;

    lastActivityTime.current = Date.now();

    // Check URL on activity to catch any navigation
    checkUrlChange();

    // Clear idle timeout if user becomes active
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new idle timeout (90 seconds)
    idleTimeoutRef.current = setTimeout(() => {
      const timeSinceActivity = Date.now() - lastActivityTime.current;
      if (timeSinceActivity >= 90000 && !combinedState.isDistracted && !tabSwitchState.isDistracted) {
        debugLog('ACTIVITY', 'Idle distraction triggered after 90s of inactivity');

        // Set as combined distraction for simplicity
        setCombinedState(prev => ({
          ...prev,
          isDistracted: true,
          startTime: Date.now() - timeSinceActivity
        }));

        recordDistraction({
          type: 'idle',
          timestamp: Date.now() - timeSinceActivity,
        });
      }
    }, 90000);
  }, [isVoyageActive, checkUrlChange, debugLog]);

  // Combined screenshot + camera analysis with result storage
  const performCombinedAnalysis = useCallback(async () => {
    if (!isVoyageActive || isExploringRef.current) return;

    debugLog('COMBINED', 'Starting combined analysis');

    setCombinedState(prev => ({ ...prev, isActive: true }));

    try {
      const { ScreenshotService } = await import('../services/ScreenshotService');
      if (!ScreenshotService.isPermissionGranted()) {
        debugLog('COMBINED', 'Screen sharing not available - skipping screenshot analysis');
        setCombinedState(prev => ({
          ...prev,
          isActive: false,
          error: 'Screen sharing permission not granted'
        }));
        return;
      }

      const screenshot = await ScreenshotService.captureScreenshot(cameraStream ?? undefined);
      if (!screenshot) {
        debugLog('COMBINED', 'No screenshot captured');
        return;
      }

      // Perform analysis using the captured screenshot
      const analysis = await GeminiService.analyzeScreenshot(
        screenshot.blob,
        user?.lighthouse_goal || 'Focus on work',
        destinationRef.current?.destination_name || 'Focus task',
        destinationRef.current?.related_apps || []
      );

      if (analysis && currentVoyage && user) {
        const currentTime = Date.now();

        // 🔧 STORE DETECTION RESULT REGARDLESS OF DISTRACTION
        await DetectionResultService.storeCombinedDetection({
          voyageId: currentVoyage.id,
          userId: user.id,
          analysisResult: analysis,
          confidenceLevel: analysis.confidenceLevel,
          distractionDetected: !analysis.contentRelevant || 
            (cameraStream && analysis.cameraAnalysis &&
            (!analysis.cameraAnalysis.personPresent || !analysis.cameraAnalysis.appearsFocused)),
          distractionType: analysis.distractionType,
        });

        // Check if distraction detected
        const isContentIrrelevant = !analysis.contentRelevant;
        const cameraIssues = cameraStream && analysis.cameraAnalysis &&
          (!analysis.cameraAnalysis.personPresent || !analysis.cameraAnalysis.appearsFocused);

        if (isContentIrrelevant || cameraIssues) {
          setCombinedState(prev => {
            if (!prev.isDistracted) {
              debugLog('COMBINED', 'Distraction detected via combined analysis', {
                contentIrrelevant: isContentIrrelevant,
                cameraIssues,
                cameraAnalysis: analysis.cameraAnalysis
              });

              // Record distraction
              setTimeout(() => {
                recordDistraction({
                  type: cameraIssues ? 'camera_distraction' : 'tab_switch',
                  timestamp: currentTime,
                });
              }, 0);

              return {
                ...prev,
                isDistracted: true,
                startTime: currentTime,
                confidenceLevel: analysis.confidenceLevel,
                lastCameraAnalysis: analysis.cameraAnalysis,
                lastScreenshotAnalysis: analysis
              };
            }

            return {
              ...prev,
              lastCheck: currentTime,
              confidenceLevel: analysis.confidenceLevel,
              lastCameraAnalysis: analysis.cameraAnalysis,
              lastScreenshotAnalysis: analysis
            };
          });
        } else {
          // Both content and camera are good - clear distraction
          setCombinedState(prev => {
            if (prev.isDistracted || prev.startTime) {
              debugLog('COMBINED', 'Combined distraction cleared - all good', {
                contentRelevant: analysis.contentRelevant,
                cameraAnalysis: analysis.cameraAnalysis
              });
            }
            return {
              ...prev,
              isDistracted: false,
              startTime: null,
              lastCheck: currentTime,
              confidenceLevel: analysis.confidenceLevel,
              lastCameraAnalysis: analysis.cameraAnalysis,
              lastScreenshotAnalysis: analysis
            };
          });
        }
      }

    } catch (error) {
      debugLog('COMBINED', 'Combined analysis failed', { error: error instanceof Error ? error.message : error });
      setCombinedState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }));
    } finally {
      setCombinedState(prev => ({ ...prev, isActive: false }));
    }
  }, [isVoyageActive, cameraStream, currentDestination, recordDistraction, debugLog, currentVoyage, user]);

  // Set up all monitoring systems
  useEffect(() => {
    const shouldMonitor = isVoyageActive && !isExploring;
    setIsMonitoring(shouldMonitor);

    if (!shouldMonitor) {
      // Clear all intervals and reset states
      if (combinedCheckInterval.current) clearInterval(combinedCheckInterval.current);
      if (urlCheckInterval.current) clearInterval(urlCheckInterval.current);
      if (distractionTimeoutRef.current) clearTimeout(distractionTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

      setTabSwitchState({
        isDistracted: false,
        startTime: null,
        isTabHidden: false
      });

      setCombinedState({
        isDistracted: false,
        startTime: null,
        lastCheck: Date.now(),
        confidenceLevel: 0,
        error: null,
        lastCameraAnalysis: null,
        lastScreenshotAnalysis: null,
        isActive: false
      });

      setUrlState({
        isDistracted: false,
        startTime: null,
        currentUrl: window.location.href,
        distractionType: null
      });

      debugLog('SYSTEM', 'Monitoring stopped - all detection cleared');
      return;
    }

    debugLog('SYSTEM', 'Starting comprehensive monitoring systems', {
      hasCamera: !!cameraStream,
      currentUrl: window.location.href,
      destination: destinationRef.current?.destination_name
    });

    // Initialize activity tracking
    lastActivityTime.current = Date.now();
    lastUrlRef.current = window.location.href;

    // Set up tab switching detection
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up activity monitoring
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('scroll', handleActivity);

    // Set up URL monitoring
    window.addEventListener('popstate', checkUrlChange);
    urlCheckInterval.current = setInterval(() => {
      debugLog('URL', 'Periodic URL check');
      checkUrlChange();
    }, 5000);

    // Set up combined analysis (every 60 seconds)
    combinedCheckInterval.current = setInterval(() => {
      performCombinedAnalysis();
    }, 60000);

    // Initial checks
    setTimeout(() => {
      debugLog('SYSTEM', 'Performing initial checks');
      checkUrlChange();
    }, 100);

    // Initial idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      const timeSinceActivity = Date.now() - lastActivityTime.current;
      if (timeSinceActivity >= 90000 && !tabSwitchState.isDistracted && !combinedState.isDistracted) {
        debugLog('ACTIVITY', 'Initial idle timeout triggered');
        setCombinedState(prev => ({
          ...prev,
          isDistracted: true,
          startTime: Date.now() - timeSinceActivity
        }));
        recordDistraction({
          type: 'idle',
          timestamp: Date.now() - timeSinceActivity,
        });
      }
    }, 90000);

    return () => {
      debugLog('SYSTEM', 'Cleaning up all monitoring systems');

      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      window.removeEventListener('popstate', checkUrlChange);

      // Clear intervals and timeouts
      if (combinedCheckInterval.current) clearInterval(combinedCheckInterval.current);
      if (urlCheckInterval.current) clearInterval(urlCheckInterval.current);
      if (distractionTimeoutRef.current) clearTimeout(distractionTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isVoyageActive, isExploring, handleVisibilityChange, handleActivity, checkUrlChange, performCombinedAnalysis, recordDistraction, cameraStream, currentDestination]);

  /**
   * Handle user response to distraction alert
   */
  const handleDistractionResponse = useCallback(async (response: 'return_to_course' | 'exploring') => {
    console.log('[RESPONSE] Handling distraction response', { response });

    if (response === 'return_to_course') {
      // Clear all distraction states
      setTabSwitchState(prev => ({
        ...prev,
        isDistracted: false,
        startTime: null
      }));

      setCombinedState(prev => ({
        ...prev,
        isDistracted: false,
        startTime: null
      }));

      setUrlState(prev => ({
        ...prev,
        isDistracted: false,
        startTime: null,
        distractionType: null
      }));
    }

    // Record the response if there was an active distraction
    const activeStartTime = tabSwitchState.startTime || combinedState.startTime || urlState.startTime;
    if (activeStartTime) {
      const duration = Date.now() - activeStartTime;
      setTimeout(() => {
        recordDistraction({
          type: getDominantDistractionType(),
          timestamp: activeStartTime,
          duration,
        });
      }, 0);
    }
  }, [recordDistraction, tabSwitchState.startTime, combinedState.startTime, urlState.startTime]);

  // Helper function to determine dominant distraction type
  const getDominantDistractionType = useCallback(() => {
    if (tabSwitchState.isDistracted) return 'tab_switch';
    if (urlState.isDistracted) return urlState.distractionType || 'tab_switch';
    if (combinedState.isDistracted) return 'camera_distraction';
    return 'tab_switch';
  }, [tabSwitchState.isDistracted, urlState.isDistracted, urlState.distractionType, combinedState.isDistracted]);

  // 🔧 KEY FIX: Combined distraction state - THIS IS THE CRITICAL PART
  const isDistracted = tabSwitchState.isDistracted || combinedState.isDistracted || urlState.isDistracted;
  const distractionType = getDominantDistractionType();

  // 🔧 DEBUG: Log distraction state changes (optimized to prevent excessive logging)
  const prevDistractionStateRef = useRef({ isDistracted: false, distractionType: 'tab_switch' as const });
  useEffect(() => {
    const currentState = { isDistracted, distractionType };
    const prevState = prevDistractionStateRef.current;

    // Only log if the state actually changed
    if (currentState.isDistracted !== prevState.isDistracted ||
      currentState.distractionType !== prevState.distractionType) {
      console.log('[DISTRACTION_STATE] 🚨 Distraction state changed', {
        isDistracted,
        distractionType,
        tabSwitch: tabSwitchState.isDistracted,
        combined: combinedState.isDistracted,
        url: urlState.isDistracted,
        isExploring,
        timestamp: new Date().toISOString()
      });
      prevDistractionStateRef.current = currentState;
    }
  }, [isDistracted, distractionType, tabSwitchState.isDistracted, combinedState.isDistracted, urlState.isDistracted, isExploring]);

  // Memoized diagnostics to prevent unnecessary re-renders
  const diagnostics = useMemo(() => ({
    tabSwitch: tabSwitchState,
    combined: combinedState,
    url: urlState,
    monitoring: isMonitoring,
    voyageActive: isVoyageActive,
    exploring: isExploring,
    geminiConfigured: GeminiService.isConfigured(),
    cameraAvailable: !!cameraStream,
    screenSharingAvailable: false // Simplified for performance
  }), [tabSwitchState, combinedState, urlState, isMonitoring, isVoyageActive, isExploring, cameraStream]);

  return {
    isDistracted,
    distractionType,
    confidenceLevel: combinedState.confidenceLevel,
    isMonitoring,
    diagnostics,
    handleDistractionResponse
  };
};