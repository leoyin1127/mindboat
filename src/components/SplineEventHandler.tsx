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

  // 通知父组件模态框状态变化
  useEffect(() => {
    const isAnyModalOpen = showModal || showLifeGoalsModal || showWelcomePanel || showJourneyPanel || showSeagullPanel;
    onModalStateChange?.(isAnyModalOpen);
    
    // 也可以通过自定义事件通知
    const event = new CustomEvent('modalStateChange', { 
      detail: { isOpen: isAnyModalOpen } 
    });
    window.dispatchEvent(event);
  }, [showModal, showLifeGoalsModal, showWelcomePanel, showJourneyPanel, showSeagullPanel, onModalStateChange]);

  useEffect(() => {
    console.log('🚀 初始化 Spline 事件处理器...')

    // Subscribe to Spline events via Supabase Realtime
    const channel = supabase.channel('spline-events')
    
    channel
      .on('broadcast', { event: 'spline_interaction' }, (payload) => {
        const event = payload.payload as SplineEvent
        
        console.log('=== 前端收到 SPLINE 事件 ===')
        console.log('完整事件:', JSON.stringify(event, null, 2))
        
        setCurrentEvent(event)
        
        // 先关闭所有模态框，避免冲突
        setShowLifeGoalsModal(false)
        setShowWelcomePanel(false)
        setShowJourneyPanel(false)
        setShowSeagullPanel(false)
        
        // 简化且明确的决策逻辑
        const apiEndpoint = event.payload.apiEndpoint
        const source = event.payload.source
        const modalType = event.payload.modalType
        const uiAction = event.payload.uiAction
        
        let shouldShowWelcome = false
        let shouldShowGoals = false
        let shouldShowJourney = false
        let shouldShowSeagull = false
        
        // 优先级1: 基于 API 端点和来源的精确匹配
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
        // 优先级2: 基于 Modal 类型
        else if (modalType === 'seagull') {
          shouldShowSeagull = true
        } else if (modalType === 'welcome') {
          shouldShowWelcome = true
        } else if (modalType === 'goals') {
          shouldShowGoals = true
        } else if (modalType === 'journey') {
          shouldShowJourney = true
        }
        // 优先级3: 基于 UI 动作
        else if (uiAction === 'show_seagull') {
          shouldShowSeagull = true
        } else if (uiAction === 'show_welcome') {
          shouldShowWelcome = true
        } else if (uiAction === 'show_goals') {
          shouldShowGoals = true
        } else if (uiAction === 'show_journey') {
          shouldShowJourney = true
        }
        // 优先级4: 基于事件类型
        else if (event.type === 'spline_seagull_trigger') {
          shouldShowSeagull = true
        } else if (event.type === 'spline_welcome_trigger') {
          shouldShowWelcome = true
        } else if (event.type === 'spline_goals_trigger') {
          shouldShowGoals = true
        } else if (event.type === 'spline_journey_trigger') {
          shouldShowJourney = true
        }
        // 优先级5: 基于特殊字段（numbaer5 for seagull）
        else if (event.payload.numbaer5 === 0) {
          shouldShowSeagull = true
        }
        // 优先级6: 基于数字值
        else if (event.payload.number === 2) {
          shouldShowWelcome = true
        } else if (event.payload.number === 1) {
          shouldShowGoals = true
        } else if (event.payload.number === 3) {
          shouldShowJourney = true
        }
        // 默认回退
        else {
          shouldShowGoals = true
        }
        
        // 执行决策 - 使用延迟确保状态更新
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
      return "海鸥语音助手!"
    }
    if (apiEndpoint === 'welcome-webhook' || source === 'welcome-webhook' || 
        modalType === 'welcome' || uiAction === 'show_welcome') {
      return "欢迎启航!"
    }
    if (apiEndpoint === 'goals-webhook' || source === 'goals-webhook' || 
        modalType === 'goals' || uiAction === 'show_goals') {
      return "人生目标!"
    }
    if (apiEndpoint === 'journey-webhook' || source === 'journey-webhook' || 
        modalType === 'journey' || uiAction === 'show_journey') {
      return "旅程面板!"
    }
    if (message) return message
    return "Spline 交互"
  }

  const getEventDescription = (event: SplineEvent) => {
    const parts = []
    if (event.payload.apiEndpoint) parts.push(`端点: ${event.payload.apiEndpoint}`)
    if (event.payload.source) parts.push(`来源: ${event.payload.source}`)
    if (event.payload.modalType) parts.push(`模态: ${event.payload.modalType}`)
    if (event.payload.uiAction) parts.push(`动作: ${event.payload.uiAction}`)
    if (event.payload.numbaer5 !== undefined) parts.push(`numbaer5: ${event.payload.numbaer5}`)
    
    return parts.length > 0 ? parts.join(' • ') : '交互元素已激活'
  }

  return (
    <>
      {/* 海鸥语音助手面板 - 小型悬浮面板 */}
      <SeagullPanel
        isVisible={showSeagullPanel}
        onClose={() => setShowSeagullPanel(false)}
        message={currentEvent?.payload?.seagullMessage}
      />

      {/* 人生目标模态框 */}
      <LifeGoalsModal
        isOpen={showLifeGoalsModal}
        onClose={() => setShowLifeGoalsModal(false)}
        onSubmit={handleLifeGoalSubmit}
      />

      {/* 欢迎面板 - 左侧固定位置 */}
      <WelcomePanel
        isVisible={showWelcomePanel}
        onClose={() => setShowWelcomePanel(false)}
        onVoiceSubmitSuccess={handleVoiceSubmitSuccess}
      />

      {/* 旅程面板 - 全屏横向布局 */}
      <JourneyPanel
        isVisible={showJourneyPanel}
        onClose={() => setShowJourneyPanel(false)}
      />

      {/* 事件详情模态框 - 使用透明玻璃设计系统 */}
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
                  事件详情:
                </h3>
                <div className={`space-y-1 ${designSystem.typography.sizes.sm}`}>
                  <div>来源: {currentEvent.source}</div>
                  <div>类型: {currentEvent.type}</div>
                  <div>时间: {new Date(currentEvent.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {Object.keys(currentEvent.payload).length > 0 && (
                <div className={`${designSystem.colors.glass.secondary} ${designSystem.effects.blur.sm} 
                                ${designSystem.radius.md} p-4 border ${designSystem.colors.borders.glass}`}>
                  <h3 className={`${designSystem.typography.weights.medium} mb-2 ${designSystem.colors.text.primary}`}>
                    载荷数据:
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
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}