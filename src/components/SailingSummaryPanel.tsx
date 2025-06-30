import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { designSystem } from '../styles/designSystem';

interface SailingSummaryData {
  imageUrl: string;
  summaryText: string;
}

interface SailingSummaryPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  summaryData?: SailingSummaryData;
  isLoading?: boolean;
}

export const SailingSummaryPanel: React.FC<SailingSummaryPanelProps> = ({
  isVisible,
  onClose,
  summaryData,
  isLoading = false
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Content container - centered */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-6xl w-full">
          
          {/* Main glass panel with Apple-inspired styling */}
          <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                          backdrop-blur-2xl border border-white/25 rounded-3xl p-10
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-20 w-10 h-10 rounded-xl 
                         bg-gradient-to-br from-white/15 via-white/10 to-white/8
                         hover:from-white/20 hover:via-white/15 hover:to-white/12
                         border border-white/25 hover:border-white/35
                         backdrop-blur-md transition-all duration-300
                         flex items-center justify-center
                         shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                         hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)]
                         transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <X className="w-5 h-5 text-white/80 hover:text-white" />
            </button>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-20 relative z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white 
                                  rounded-full animate-spin"></div>
                  <p className="text-white/70 font-inter">Loading your sailing summary...</p>
                </div>
              </div>
            )}

            {/* Content - Two column layout with title in right column */}
            {!isLoading && (
              <div className="flex gap-10 relative z-10">
                {/* Left column - Image only */}
                <div className="flex-1">
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 
                                  border border-white/20 shadow-lg aspect-[4/3]">
                    {summaryData?.imageUrl ? (
                      <img
                        src={summaryData.imageUrl}
                        alt="Journey visualization"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800';
                        }}
                      />
                    ) : (
                      // Placeholder image while waiting for backend data
                      <img
                        src="https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800"
                        alt="Journey placeholder"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                </div>

                {/* Right column - Title, subtitle, summary text and button */}
                <div className="flex-1 flex flex-col">
                  {/* Header - now part of right column */}
                  <div className="mb-8">
                    <h2 className="text-[32px] font-playfair font-normal text-white mb-4 leading-tight">
                      Sailing Summary
                    </h2>
                    <p className="text-white/80 text-base font-inter">
                      Your journey reflection and insights
                    </p>
                  </div>

                  {/* Summary text */}
                  <div className="flex-1">
                    <div className="bg-gradient-to-br from-white/8 via-white/5 to-white/3 
                                    backdrop-blur-md border border-white/20 rounded-2xl p-6
                                    shadow-[inset_0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <p className="text-white/90 font-inter text-base leading-relaxed">
                        {summaryData?.summaryText || 
                         "Today, you sailed x hours toward the continent of your thesis. Along the way, you were easily drawn to [backend input value], spending x minutes on it. If you'd like to dive deeper into your reflections, check out the Seagull's Human Observation Log. Keep it up—the journey itself is the reward!"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="pt-6">
                    <button
                      onClick={() => {
                        console.log('Opening Seagull\'s Observation Diary');
                        // Here you would implement navigation to the diary
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30
                                 hover:from-blue-400/40 hover:to-purple-400/40 text-white rounded-xl 
                                 transition-all duration-300 font-inter font-medium text-base
                                 shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md
                                 border border-white/25 hover:border-white/35
                                 transform hover:scale-[1.02] active:scale-[0.98]
                                 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      See Seagull's Observation Diary
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ultra subtle decorative elements */}
            <div className="absolute -top-3 -left-3 w-6 h-6 bg-white/10 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-white/8 rounded-full blur-sm animate-pulse" 
                 style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/3 -right-3 w-3 h-3 bg-white/12 rounded-full blur-sm animate-pulse"
                 style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/3 -left-3 w-4 h-4 bg-white/10 rounded-full blur-sm animate-pulse"
                 style={{animationDelay: '0.5s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};