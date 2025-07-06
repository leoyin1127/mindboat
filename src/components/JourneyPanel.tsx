import React, { useState } from 'react';
import { Compass, CheckCircle, Circle, Mail as Sail, Mountain, BookOpen, Palette } from 'lucide-react';
import { designSystem, getButtonStyle, getPanelStyle, getIconContainerStyle, getInnerGlowStyle } from '../styles/designSystem';
import { ControlPanel } from './ControlPanel';
import { SailingSummaryPanel } from './SailingSummaryPanel';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'writing' | 'design' | 'learning' | 'personal';
  imageUrl: string;
  details: string;
}

interface SailingSummaryData {
  imageUrl: string;
  summaryText: string;
}

interface JourneyPanelProps {
  isVisible: boolean;
  onClose?: () => void;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'write PS',
    description: 'Personal Statement',
    completed: false,
    category: 'writing',
    imageUrl: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800',
    details: 'Since you need to apply for school, you need to write a personal statement. What are your requirements?'
  },
  {
    id: '2',
    title: 'Design UI',
    description: 'Interface Design',
    completed: false,
    category: 'design',
    imageUrl: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800',
    details: 'Create user interface prototypes, including interaction design and visual hierarchy. Focus on user experience and usability.'
  },
  {
    id: '3',
    title: 'Learn React',
    description: 'Frontend Learning',
    completed: true,
    category: 'learning',
    imageUrl: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800',
    details: 'Deep dive into React framework, master core concepts of component-based development and state management.'
  },
  {
    id: '4',
    title: 'Morning Meditation',
    description: 'Meditation Practice',
    completed: false,
    category: 'personal',
    imageUrl: 'https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=800',
    details: 'Daily morning meditation practice to cultivate inner peace and focus, preparing for the day ahead.'
  }
];

const getCategoryIcon = (category: Task['category']) => {
  switch (category) {
    case 'writing':
      return <BookOpen className="w-4 h-4" />;
    case 'design':
      return <Palette className="w-4 h-4" />;
    case 'learning':
      return <Mountain className="w-4 h-4" />;
    case 'personal':
      return <Compass className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

export const JourneyPanel: React.FC<JourneyPanelProps> = ({
  isVisible,
  onClose
}) => {
  const [selectedTask, setSelectedTask] = useState<Task>(mockTasks[0]);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [summaryData, setSummaryData] = useState<SailingSummaryData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleStartJourney = async () => {
    console.log('Starting journey with task:', selectedTask.title);
    
    try {
      // Send webhook via backend proxy
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spline-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          webhookUrl: 'https://hooks.spline.design/vS-vioZuERs',
          payload: { numbaer2: 0 }
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Journey webhook sent successfully:', responseData);
      } else {
        console.error('Failed to send journey webhook:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error sending journey webhook:', error);
    }
    
    // Hide the journey panel and show control panel
    setShowControlPanel(true);
    onClose?.();
  };

  const handleEndVoyage = async () => {
    console.log('Ending voyage...');
    
    // Hide control panel and show loading state
    setShowControlPanel(false);
    setShowSummaryPanel(true);
    setIsLoadingSummary(true);
    
    try {
      // Simulate API call to backend for summary data
      // Replace this with actual API call
      const response = await fetch('/api/sailing-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          sessionData: {
            // Include any session data needed for summary generation
            startTime: new Date().toISOString(),
            taskTitle: selectedTask.title,
            taskCategory: selectedTask.category
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSummaryData({
          imageUrl: data.imageUrl,
          summaryText: data.summaryText
        });
      } else {
        // Fallback to mock data if API fails
        setSummaryData({
          imageUrl: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
          summaryText: "Today, you sailed 2.5 hours toward the continent of your thesis. Along the way, you were easily drawn to social media notifications, spending 45 minutes on it. If you'd like to dive deeper into your reflections, check out the Seagull's Human Observation Log. Keep it up—the journey itself is the reward!"
        });
      }
    } catch (error) {
      console.error('Failed to fetch summary data:', error);
      // Fallback to mock data
      setSummaryData({
        imageUrl: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
        summaryText: "Today, you sailed 2.5 hours toward the continent of your thesis. Along the way, you were easily drawn to social media notifications, spending 45 minutes on it. If you'd like to dive deeper into your reflections, check out the Seagull's Human Observation Log. Keep it up—the journey itself is the reward!"
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCloseSummary = () => {
    setShowSummaryPanel(false);
    setSummaryData(null);
    // Optionally return to journey panel or close entirely
    onClose?.();
  };

  // Show journey panel only if it's visible and no other panels are showing
  const shouldShowJourneyPanel = isVisible && !showControlPanel && !showSummaryPanel;

  if (!shouldShowJourneyPanel && !showControlPanel && !showSummaryPanel) return null;

  return (
    <>
      {/* Journey Panel - only show if not in control or summary mode */}
      {shouldShowJourneyPanel && (
        <div className="fixed inset-0 z-40 flex">
          {/* Left side - Ocean scene (completely transparent to allow Spline to show through) */}
          <div className="flex-1 relative">
            {/* No overlay - let the 3D scene show through seamlessly */}
          </div>

          {/* Right side - Task Panel - width increased from 600px to 900px (1.5x) */}
          <div className="w-[900px] p-8 flex items-center justify-center">
            <div className="relative w-full max-w-[820px] bg-gradient-to-br from-slate-500/20 via-slate-400/15 to-slate-600/25 
                            backdrop-blur-2xl border border-white/25 rounded-3xl p-10
                            shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                            before:absolute before:inset-0 before:rounded-3xl 
                            before:bg-gradient-to-br before:from-slate-400/10 before:via-transparent before:to-transparent 
                            before:pointer-events-none overflow-hidden">
              
              {/* Inner glow overlay - tinted */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 via-transparent to-transparent 
                              rounded-3xl pointer-events-none"></div>
              
              <div className="relative z-10 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-gradient-to-br from-slate-500/20 via-slate-400/15 to-slate-600/25 backdrop-blur-md 
                                  rounded-2xl flex items-center justify-center w-12 h-12
                                  border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]
                                  relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 to-slate-600/5 rounded-2xl"></div>
                    <Sail className="w-6 h-6 text-white relative z-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-playfair font-normal text-white leading-tight">
                      Journey Dashboard
                    </h2>
                    <p className="text-white/70 text-sm font-inter">
                      Navigate your goals with intention
                    </p>
                  </div>
                </div>

                {/* Main content area - Increased spacing and column widths */}
                <div className="flex-1 flex gap-8">
                  {/* Left column - To Do List - Increased width from w-48 to w-64 */}
                  <div className="w-64 space-y-3">
                    <h3 className="text-lg font-playfair font-medium text-white mb-4">
                      to do list
                    </h3>
                    
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-300 
                                      border backdrop-blur-md font-inter text-sm
                                      ${selectedTask.id === task.id 
                                        ? 'bg-gradient-to-br from-slate-500/30 via-slate-400/25 to-slate-600/35 border-white/30 text-white shadow-md' 
                                        : 'bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-slate-600/20 border-white/20 text-white/80 hover:from-slate-500/20 hover:via-slate-400/15 hover:to-slate-600/25 hover:border-white/30'
                                      }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskCompletion(task.id);
                              }}
                              className="text-white/60 hover:text-white transition-colors"
                            >
                              {task.completed ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            {getCategoryIcon(task.category)}
                          </div>
                          <div className={task.completed ? 'line-through opacity-60' : ''}>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-white/60 mt-1">{task.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right column - Task Details - Now has more space */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-xl font-playfair font-medium text-white mb-3">
                        {selectedTask.title} - {selectedTask.description}:
                      </h3>
                      <p className="text-white/80 font-inter text-base leading-relaxed">
                        {selectedTask.details}
                      </p>
                    </div>

                    {/* Task illustration - Increased height from h-48 to h-64 */}
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-slate-600/20 
                                    border border-white/20 shadow-lg">
                      <img
                        src={selectedTask.imageUrl}
                        alt={selectedTask.title}
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>

                    {/* Start Journey Button - Removed justify-center to align with container edges */}
                    <div className="pt-4">
                      <button
                        onClick={handleStartJourney}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30
                                   hover:from-blue-400/40 hover:to-purple-400/40 text-white rounded-xl 
                                   transition-all duration-300 font-inter font-medium text-base
                                   shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md
                                   border border-white/25 hover:border-white/35
                                   transform hover:scale-[1.02] active:scale-[0.98]
                                   flex items-center justify-center gap-2"
                      >
                        <Sail className="w-5 h-5" />
                        Start Journey
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/20 rounded-full blur-sm animate-pulse"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white/15 rounded-full blur-sm animate-pulse" 
                   style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/4 -right-2 w-2 h-2 bg-white/25 rounded-full blur-sm animate-pulse"
                   style={{animationDelay: '2s'}}></div>
              <div className="absolute bottom-1/3 -left-2 w-3 h-3 bg-white/20 rounded-full blur-sm animate-pulse"
                   style={{animationDelay: '0.5s'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel - floating at bottom center */}
      <ControlPanel 
        isVisible={showControlPanel}
        onClose={() => setShowControlPanel(false)}
        onEndVoyage={handleEndVoyage}
      />

      {/* Sailing Summary Panel - full screen modal */}
      <SailingSummaryPanel
        isVisible={showSummaryPanel}
        onClose={handleCloseSummary}
        summaryData={summaryData}
        isLoading={isLoadingSummary}
      />
    </>
  );
};