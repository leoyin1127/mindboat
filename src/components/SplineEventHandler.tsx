import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Sparkles, Compass, Target, Heart, MessageCircle } from 'lucide-react'
import { LifeGoalsModal } from './LifeGoalsModal'
import { WelcomePanel } from './WelcomePanel'
import { JourneyPanel } from './JourneyPanel'
import { SeagullPanel } from './SeagullPanel'
import { designSystem, getButtonStyle, getPanelStyle } from '../styles/designSystem'

interface SplineEvent {
  type: string
  payload: {
    number?: number
    action?: string
    buttonId?: string
    apiEndpoint?: string
    modalType?: string
    uiAction?: string
    message?: string
    source?: string
    timestamp?: string
    numbaer5?: number
    voiceInteraction?: boolean
    seagullMessage?: string
    [key: string]: any
  }
  timestamp: string
  source: string
}

interface SplineEventHandlerProps {
  onEventReceived?: (event: SplineEvent) => void
  onModalStateChange?: (isOpen: boolean) => void
}

export const SplineEventHandler: React.FC<SplineEventHandlerProps> = ({ 
  onEventReceived,
  onModalStateChange 
}) => {
  const [showModal, setShowModal] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<SplineEvent | null>(null)
  const [showLifeGoalsModal, setShowLifeGoalsModal] = useState(false)
  const [showWelcomePanel, setShowWelcomePanel] = useState(false)
  const [showJourneyPanel, setShowJourneyPanel] = useState(false)
  const [showSeagullPanel, setShowSeagullPanel] = useState(false)

  // Notify parent component of modal state changes
  useEffect(() => {
    const isAnyModalOpen = showModal || showLifeGoalsModal || showWelcomePanel || showJourneyPanel || showSeagullPanel;
    onModalStateChange?.(isAnyModalOpen);
    
    // Also notify via custom event
    const event = new CustomEvent('modalStateChange', { 
      detail: { isOpen: isAnyModalOpen } 
    });
    window.dispatchEvent(event);
  }, [showModal, showLifeGoalsModal, showWelcomePanel, showJourneyPanel, showSeagullPanel, onModalStateChange]);

  useEffect(() => {
    console.log('🚀 Initializing Spline event handler...')

    // Subscribe to Spline events via Supabase Realtime
    const channel = supabase.channel('spline-events')
    
    channel
      .on('broadcast', { event: 'spline_interaction' }, (payload) => {
        const event = payload.payload as SplineEvent
        
        console.log('=== FRONTEND RECEIVED SPLINE EVENT ===')
        console.log('Complete event:', JSON.stringify(event, null, 2))
        
        setCurrentEvent(event)
        
        // First close all modals to avoid conflicts
        setShowLifeGoalsModal(false)
        setShowWelcomePanel(false)
        setShowJourneyPanel(false)
        setShowSeagullPanel(false)
        
        // Simplified and clear decision logic
        const apiEndpoint = event.payload.apiEndpoint
        const source = event.payload.source
        const modalType = event.payload.modalType
        const uiAction = event.payload.uiAction
        
        let shouldShowWelcome = false
        let shouldShowGoals = false
        let shouldShowJourney = false
        let shouldShowSeagull = false
        
        // Priority 1: Based on API endpoint and source exact matching
        if (apiEndpoint === 'seagull-webhook' || source === 'seagull-webhook' || 
            apiEndpoint === 'test-seagull-webhook' || source === 'test-seagull-webhook') {
          shouldShowSeagull = true
        } else if (apiEndpoint === 'welcome-webhook' || source === 'welcome-webhook') {
          shouldShowWelcome = true
        } else if (apiEndpoint === 'goals-webhook' || source === 'goals-webhook') {
          shouldShowGoals = true
        } else if (apiEndpoint === 'journey-webhook' || source === 'journey-webhook') {
          shouldShowJourney = true
        }
        // Priority 2: Based on Modal type
        else if (modalType === 'seagull') {
          shouldShowSeagull = true
        } else if (modalType === 'welcome') {
          shouldShowWelcome = true
        } else if (modalType === 'goals') {
          shouldShowGoals = true
        } else if (modalType === 'journey') {
          shouldShowJourney = true
        }
        // Priority 3: Based on UI action
        else if (uiAction === 'show_seagull') {
          shouldShowSeagull = true
        } else if (uiAction === 'show_welcome') {
          shouldShowWelcome = true
        } else if (uiAction === 'show_goals') {
          shouldShowGoals = true
        } else if (uiAction === 'show_journey') {
          shouldShowJourney = true
        }
        // Priority 4: Based on event type
        else if (event.type === 'spline_seagull_trigger') {
          shouldShowSeagull = true
        } else if (event.type === 'spline_welcome_trigger') {
          shouldShowWelcome = true
        } else if (event.type === 'spline_goals_trigger') {
          shouldShowGoals = true
        } else if (event.type === 'spline_journey_trigger') {
          shouldShowJourney = true
        }
        // Priority 5: Based on special fields (numbaer5 for seagull)
        else if (event.payload.numbaer5 === 0) {
          shouldShowSeagull = true
        }
        // Priority 6: Based on number value
        else if (event.payload.number === 2) {
          shouldShowWelcome = true
        } else if (event.payload.number === 1) {
          shouldShowGoals = true
        } else if (event.payload.number === 3) {
          shouldShowJourney = true
        }
        // Default fallback
        else {
          shouldShowGoals = true
        }
        
        // Execute decision - use delay to ensure state update
        setTimeout(() => {
          if (shouldShowSeagull) {
            setShowSeagullPanel(true)
            setShowWelcomePanel(false)
            setShowLifeGoalsModal(false)
            setShowJourneyPanel(false)
          } else if (shouldShowWelcome) {
            setShowWelcomePanel(true)
            setShowLifeGoalsModal(false)
            setShowJourneyPanel(false)
            setShowSeagullPanel(false)
          } else if (shouldShowGoals) {
            setShowLifeGoalsModal(true)
            setShowWelcomePanel(false)
            setShowJourneyPanel(false)
            setShowSeagullPanel(false)
          } else if (shouldShowJourney) {
            setShowJourneyPanel(true)
            setShowWelcomePanel(false)
            setShowLifeGoalsModal(false)
            setShowSeagullPanel(false)
          }
        }, 100)
        
        // Call the callback if provided
        onEventReceived?.(event)
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onEventReceived])

  const closeModal = () => {
    setShowModal(false)
    setCurrentEvent(null)
  }

  const handleLifeGoalSubmit = (goal: string) => {
    console.log('Life goal submitted:', goal)
    // Here you could save to Supabase database if needed
  }

  const handleVoiceSubmitSuccess = () => {
    // Close welcome panel and show journey panel
    setShowWelcomePanel(false)
    setShowJourneyPanel(true)
  }

  const getEventIcon = (event: SplineEvent) => {
    const { apiEndpoint, modalType, uiAction, source } = event.payload
    
    if (apiEndpoint === 'seagull-webhook' || source === 'seagull-webhook' || 
        apiEndpoint === 'test-seagull-webhook' || source === 'test-seagull-webhook' ||
        modalType === 'seagull' || uiAction === 'show_seagull') {
      return <MessageCircle className="w-6 h-6 text-blue-400" />
    }
    if (apiEndpoint === 'welcome-webhook' || source === 'welcome-webhook' || 
        modalType === 'welcome' || uiAction === 'show_welcome') {
      return <Compass className="w-6 h-6 text-blue-400" />
    }
    if (apiEndpoint === 'goals-webhook' || source === 'goals-webhook' || 
        modalType === 'goals' || uiAction === 'show_goals') {
      return <Target className="w-6 h-6 text-purple-400" />
    }
    if (apiEndpoint === 'journey-webhook' || source === 'journey-webhook' || 
        modalType === 'journey' || uiAction === 'show_journey') {
      return <Heart className="w-6 h-6 text-green-400" />
    }
    return <Sparkles className="w-6 h-6 text-white" />
  }

  const getEventTitle = (event: SplineEvent) => {
    const { apiEndpoint, modalType, uiAction, source, message } = event.payload
    
    if (apiEndpoint === 'seagull-webhook' || source === 'seagull-webhook' || 
        apiEndpoint === 'test-seagull-webhook' || source === 'test-seagull-webhook' ||
        modalType === 'seagull' || uiAction === 'show_seagull') {
      return "Seagull Voice Assistant!"
    }
    if (apiEndpoint === 'welcome-webhook' || source === 'welcome-webhook' || 
        modalType === 'welcome' || uiAction === 'show_welcome') {
      return "Welcome Aboard!"
    }
    if (apiEndpoint === 'goals-webhook' || source === 'goals-webhook' || 
        modalType === 'goals' || uiAction === 'show_goals') {
      return "Life Goals!"
    }
    if (apiEndpoint === 'journey-webhook' || source === 'journey-webhook' || 
        modalType === 'journey' || uiAction === 'show_journey') {
      return "Journey Panel!"
    }
    if (message) return message
    return "Spline Interaction"
  }

  const getEventDescription = (event: SplineEvent) => {
    const parts = []
    if (event.payload.apiEndpoint) parts.push(`Endpoint: ${event.payload.apiEndpoint}`)
    if (event.payload.source) parts.push(`Source: ${event.payload.source}`)
    if (event.payload.modalType) parts.push(`Modal: ${event.payload.modalType}`)
    if (event.payload.uiAction) parts.push(`Action: ${event.payload.uiAction}`)
    if (event.payload.numbaer5 !== undefined) parts.push(`numbaer5: ${event.payload.numbaer5}`)
    
    return parts.length > 0 ? parts.join(' • ') : 'Interactive element activated'
  }

  return (
    <>
      {/* Seagull Voice Assistant Panel - Small floating panel */}
      <SeagullPanel
        isVisible={showSeagullPanel}
        onClose={() => setShowSeagullPanel(false)}
        message={currentEvent?.payload?.seagullMessage}
      />

      {/* Life Goals Modal */}
      <LifeGoalsModal
        isOpen={showLifeGoalsModal}
        onClose={() => setShowLifeGoalsModal(false)}
        onSubmit={handleLifeGoalSubmit}
      />

      {/* Welcome Panel - Left side fixed position */}
      <WelcomePanel
        isVisible={showWelcomePanel}
        onClose={() => setShowWelcomePanel(false)}
        onVoiceSubmitSuccess={handleVoiceSubmitSuccess}
      />

      {/* Journey Panel - Full screen horizontal layout */}
      <JourneyPanel
        isVisible={showJourneyPanel}
        onClose={() => setShowJourneyPanel(false)}
      />

      {/* Event Details Modal - Using transparent glass design system */}
      {showModal && currentEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className={`${getPanelStyle()} p-8 max-w-md w-full mx-4 
                          transform transition-all duration-300 scale-100`}>
            
            {/* Very subtle inner glow overlay */}
            <div className={designSystem.patterns.innerGlow}></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`flex items-center gap-3 ${designSystem.colors.text.primary}`}>
                {getEventIcon(currentEvent)}
                <h2 className={`${designSystem.typography.sizes.xl} ${designSystem.typography.weights.semibold}`}>
                  {getEventTitle(currentEvent)}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className={`${designSystem.colors.text.subtle} hover:${designSystem.colors.text.primary} 
                           ${designSystem.effects.transitions.default} p-1 rounded-full hover:bg-white/10`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`space-y-4 ${designSystem.colors.text.muted} relative z-10`}>
              <p className={designSystem.typography.sizes.lg}>{getEventDescription(currentEvent)}</p>
              
              <div className={`${designSystem.colors.glass.secondary} ${designSystem.effects.blur.sm} 
                              ${designSystem.radius.md} p-4 border ${designSystem.colors.borders.glass}`}>
                <h3 className={`${designSystem.typography.weights.medium} mb-2 ${designSystem.colors.text.primary}`}>
                  Event Details:
                </h3>
                <div className={`space-y-1 ${designSystem.typography.sizes.sm}`}>
                  <div>Source: {currentEvent.source}</div>
                  <div>Type: {currentEvent.type}</div>
                  <div>Time: {new Date(currentEvent.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {Object.keys(currentEvent.payload).length > 0 && (
                <div className={`${designSystem.colors.glass.secondary} ${designSystem.effects.blur.sm} 
                                ${designSystem.radius.md} p-4 border ${designSystem.colors.borders.glass}`}>
                  <h3 className={`${designSystem.typography.weights.medium} mb-2 ${designSystem.colors.text.primary}`}>
                    Payload Data:
                  </h3>
                  <pre className={`${designSystem.typography.sizes.xs} ${designSystem.colors.text.muted} overflow-x-auto`}>
                    {JSON.stringify(currentEvent.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 relative z-10">
              <button
                onClick={closeModal}
                className={getButtonStyle('glass', 'md')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}