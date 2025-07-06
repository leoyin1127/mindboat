import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface LifeGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: string) => void;
}

export const LifeGoalsModal: React.FC<LifeGoalsModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendSplineWebhook = async () => {
    try {
      console.log('Sending Spline webhook via backend proxy...');
      
      // Call our backend proxy instead of Spline directly
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spline-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ number: 0 })
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Backend proxy response:', responseData);
        
        if (responseData.success) {
          console.log('Spline webhook sent successfully via proxy');
          console.log('Spline response:', responseData.splineResponse);
        } else {
          console.error('Spline webhook failed:', responseData);
        }
      } else {
        console.error('Failed to call backend proxy:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error calling backend proxy:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setIsSubmitting(true);
    
    try {
      // Send the Spline webhook first via backend proxy
      await sendSplineWebhook();
      
      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then submit the goal
      onSubmit(goal.trim());
      setGoal('');
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (goal.trim()) {
      setIsSubmitting(true);
      
      try {
        // Send the Spline webhook first via backend proxy
        await sendSplineWebhook();
        
        // Simulate a brief delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Then submit the goal
        onSubmit(goal.trim());
        setGoal('');
        onClose();
      } catch (error) {
        console.error('Error in handleNext:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-3xl">
      {/* Ultra subtle inner glow overlay across entire screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Content container - centered but text position unchanged */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-2xl w-full">
          
          {/* Main glass panel with Apple-inspired styling - reverted to transparent background */}
          <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                          backdrop-blur-2xl border border-white/20 rounded-3xl p-10
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">
            
            {/* Header without logo - title changed to 32px */}
            <div className="text-center mb-10 relative z-10">
              <h2 className="text-[32px] font-playfair font-normal text-white mb-6 leading-tight">
                What kind of person do you want to become?
              </h2>
              
              <p className="text-white/90 text-base font-inter leading-relaxed max-w-lg mx-auto">
                The Mind Boat gently filters out distractions, helping you focus on what truly matters and guiding you toward self-awareness and personal growth.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="relative">
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Share your thoughts on who you want to become..."
                  className="w-full h-40 px-6 py-4 bg-black/15 backdrop-blur-md 
                             border border-white/25 rounded-2xl text-white placeholder-white/60
                             focus:outline-none focus:ring-2 focus:ring-white/30 
                             focus:border-white/40 transition-all duration-300
                             resize-none font-inter text-base leading-relaxed
                             shadow-[inset_0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  maxLength={500}
                  required
                />
                
                {/* Character count */}
                <div className="absolute bottom-3 right-4 text-xs text-white/50 font-inter">
                  {goal.length}/500
                </div>
              </div>

              {/* Apple-style Next button - using Back button size (smaller) - reverted to transparent background */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!goal.trim() || isSubmitting}
                  className="px-8 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                             hover:from-white/20 hover:via-white/15 hover:to-white/12
                             text-white rounded-xl transition-all duration-300
                             border border-white/25 hover:border-white/35
                             font-inter font-medium text-base backdrop-blur-md
                             shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]
                             hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transform hover:scale-[1.02] active:scale-[0.98]
                             flex items-center justify-center gap-2.5 min-w-[100px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                      rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      <span>Next</span>
                    </>
                  )}
                </button>
              </div>
            </form>

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