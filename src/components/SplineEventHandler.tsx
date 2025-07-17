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
  currentUser?: { id: string; deviceFingerprint: string } | null
}

export const SplineEventHandler: React.FC<SplineEventHandlerProps> = ({ 
  onEventReceived,
  onModalStateChange,
  currentUser
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

    // Subscribe to frontend_events table inserts
    const channel = supabase
      .channel('frontend-events-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'frontend_events'
        },
        (payload) => {
          console.log('=== FRONTEND RECEIVED DATABASE EVENT ===')
          console.log('Payload:', payload)
          
          const newEvent = payload.new
          const eventName = newEvent.event_name
          const eventData = newEvent.event_data
          const eventUserId = newEvent.user_id
          
          console.log('Event name:', eventName)
          console.log('Event data:', eventData)
          console.log('Event user_id:', eventUserId)
          
          // Frontend event injection - fix null user_id by using current user context
          if (!eventUserId && currentUser?.id) {
            eventUserId = currentUser.id
            console.log('🔧 Injected user_id from frontend context:', eventUserId)
          }
          
          // Filter events by current user to prevent cross-user modal triggers
          if (eventUserId && currentUser?.id && eventUserId !== currentUser.id) {
            console.log('🚫 Ignoring event for different user:', eventUserId)
            return
          }
          
          // If still no user_id after injection, ignore for safety
          if (!eventUserId && currentUser?.id) {
            console.log('🚫 Ignoring event without user_id when user is logged in')
            return
          }
          
          // Create a SplineEvent compatible object
          const event: SplineEvent = {
            type: eventName,
            payload: eventData || {},
            timestamp: newEvent.created_at || new Date().toISOString(),
            source: eventData?.source || 'spline-webhook'
          }
          
          setCurrentEvent(event)
          
          // First close all modals to avoid conflicts
          setShowLifeGoalsModal(false)
          setShowWelcomePanel(false)
          setShowJourneyPanel(false)
          setShowSeagullPanel(false)
          
          // Handle different event types
          let shouldShowWelcome = false
          let shouldShowGoals = false
          let shouldShowJourney = false
          let shouldShowSeagull = false
          
          // Check event name first
          if (eventName === 'show_goals_modal') {
            shouldShowGoals = true
          } else if (eventName === 'show_welcome_modal') {
            shouldShowWelcome = true
          } else if (eventName === 'show_journey_modal') {
            shouldShowJourney = true
          } else if (eventName === 'show_seagull_modal') {
            shouldShowSeagull = true
          }
          // Then check modalType in event data
          else if (eventData?.modalType === 'goals') {
            shouldShowGoals = true
          } else if (eventData?.modalType === 'welcome') {
            shouldShowWelcome = true
          } else if (eventData?.modalType === 'journey') {
            shouldShowJourney = true
          } else if (eventData?.modalType === 'seagull') {
            shouldShowSeagull = true
          }
          // Default fallback
          else {
            shouldShowGoals = true
          }
          
          // Execute decision - use delay to ensure state update
          setTimeout(() => {
            if (shouldShowSeagull) {
              setShowSeagullPanel(true)
            } else if (shouldShowWelcome) {
              setShowWelcomePanel(true)
            } else if (shouldShowGoals) {
              setShowLifeGoalsModal(true)
            } else if (shouldShowJourney) {
              setShowJourneyPanel(true)
            }
          }, 100)
          
          // Call the callback if provided
          onEventReceived?.(event)
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to frontend_events table')
        }
      })

    // Also subscribe to broadcast events from spline-events channel
    const broadcastChannel = supabase
      .channel('spline-events')
      .on('broadcast', { event: 'spline_interaction' }, (payload) => {
        console.log('=== RECEIVED BROADCAST EVENT ===')
        console.log('Broadcast payload:', payload)
        
        const eventData = payload.payload
        const eventUserId = payload.payload?.user_id || eventData?.user_id
        
        console.log('Broadcast event data:', eventData)
        console.log('Broadcast user_id:', eventUserId)
        
        // Filter events by current user
        if (eventUserId && currentUser?.id && eventUserId !== currentUser.id) {
          console.log('🚫 Ignoring broadcast event for different user:', eventUserId)
          return
        }
        
        if (!eventUserId && currentUser?.id) {
          console.log('🚫 Ignoring broadcast event without user_id when user is logged in')
          return
        }
        
        // Handle broadcast events - check both top level and payload level
        const uiAction = eventData?.uiAction || eventData?.payload?.uiAction
        const modalType = eventData?.modalType || eventData?.payload?.modalType
        const eventType = eventData?.type
        
        console.log('🔍 Checking broadcast conditions:', { uiAction, modalType, eventType })
        
        if (uiAction === 'show_goals' || modalType === 'goals' || eventType === 'spline_goals_trigger') {
          console.log('📢 Broadcast: Showing goals modal')
          setShowLifeGoalsModal(true)
        } else if (uiAction === 'show_journey' || modalType === 'journey' || eventType === 'spline_journey_trigger') {
          console.log('📢 Broadcast: Showing journey panel')
          setShowJourneyPanel(true)
        } else if (uiAction === 'show_seagull' || modalType === 'seagull' || eventType === 'spline_seagull_trigger') {
          console.log('📢 Broadcast: Showing seagull panel')
          setShowSeagullPanel(true)
        } else {
          console.log('❓ No matching broadcast condition found for:', { uiAction, modalType, eventType })
        }
        
        // Create compatible event for callback
        const event: SplineEvent = {
          type: eventData?.uiAction || 'broadcast_event',
          payload: eventData || {},
          timestamp: new Date().toISOString(),
          source: 'broadcast'
        }
        onEventReceived?.(event)
      })
      .subscribe((status) => {
        console.log('Broadcast subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to spline-events broadcast')
        }
      })

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
    }
  }, [onEventReceived, currentUser])

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
        currentUser={currentUser}
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