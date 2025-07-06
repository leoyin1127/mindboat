import React from 'react';
import { Compass, Wind, Target } from 'lucide-react';
import { designSystem, getButtonStyle, getPanelStyle } from '../styles/designSystem';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`relative ${getPanelStyle()} p-10 max-w-2xl w-full mx-4 
                      transform transition-all duration-700 scale-100 animate-in`}>
        
        {/* Very subtle inner glow overlay */}
        <div className={designSystem.patterns.innerGlow}></div>
        
        {/* Decorative top element - more transparent */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-8 bg-gradient-to-r from-white/30 to-white/20 rounded-full 
                          animate-pulse shadow-lg shadow-white/20"></div>
        </div>

        {/* Header with sailing icon */}
        <div className="text-center mb-8 relative z-10">
          <div className={`inline-flex items-center justify-center w-20 h-20 
                          ${designSystem.patterns.iconContainer} mb-6 animate-float`}>
            {/* Very subtle inner highlight for icon container */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent rounded-2xl"></div>
            <Compass className="w-10 h-10 text-white animate-spin relative z-10" style={{animationDuration: '8s'}} />
          </div>
          
          <h1 className={`${designSystem.typography.sizes['4xl']} ${designSystem.typography.fonts.heading} 
                         ${designSystem.typography.weights.bold} ${designSystem.colors.text.primary} mb-4 animate-glow`}>
            欢迎启航
          </h1>
        </div>

        {/* Main content */}
        <div className="space-y-6 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Wind className="w-6 h-6 text-white/80 animate-pulse" />
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent flex-1"></div>
            <Target className="w-6 h-6 text-white/80 animate-pulse" />
          </div>

          <p className={`${designSystem.typography.sizes.xl} ${designSystem.colors.text.secondary} 
                        ${designSystem.typography.fonts.body} leading-relaxed mb-6`}>
            系统会调用传感器来监测你是否当下在做重要的事情。
          </p>
          
          <p className={`${designSystem.typography.sizes.lg} ${designSystem.colors.text.muted} 
                        ${designSystem.typography.fonts.body} leading-relaxed mb-8`}>
            当你做和目标有关的事情的时候，会吹起不同的意念之风，推进你的小船帮你到达目的地。
          </p>

          {/* Action button */}
          <button
            onClick={onClose}
            className={`${getButtonStyle('accent', 'lg')} ${designSystem.typography.sizes.lg}
                       ${designSystem.effects.hover.subtle}`}
          >
            开始旅程
          </button>
        </div>

        {/* Very subtle floating decorative elements */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/25 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white/20 rounded-full blur-sm animate-pulse" 
             style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/4 -right-2 w-2 h-2 bg-white/30 rounded-full blur-sm animate-pulse"
             style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 -left-2 w-3 h-3 bg-white/25 rounded-full blur-sm animate-pulse"
             style={{animationDelay: '0.5s'}}></div>

        {/* Wind effect lines - more transparent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/25 to-transparent
                          animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent
                          animate-pulse" style={{animationDelay: '2.5s'}}></div>
        </div>
      </div>
    </div>
  );
};