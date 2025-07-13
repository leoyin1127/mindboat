import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle, Circle, Mail as Sail, Mountain, BookOpen, Palette, GripVertical, X } from 'lucide-react';
import { ControlPanel } from './ControlPanel';
import { SailingSummaryPanel } from './SailingSummaryPanel';
import { auth } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  source_thought_id?: string;
}

interface SailingSummaryData {
  imageUrl: string;
  summaryText: string;
}

interface JourneyPanelProps {
  isVisible: boolean;
  onClose?: () => void;
}

const getCategoryIcon = (priority: number) => {
  // Map priority to category icons
  switch (priority) {
    case 1:
      return <Mountain className="w-4 h-4" />; // High priority
    case 2:
      return <BookOpen className="w-4 h-4" />; // Medium priority
    case 3:
      return <Palette className="w-4 h-4" />; // Low priority
    default:
      return <Circle className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1:
      return 'text-red-400'; // High priority - red
    case 2:
      return 'text-yellow-400'; // Medium priority - yellow
    case 3:
      return 'text-green-400'; // Low priority - green
    default:
      return 'text-white/60';
  }
};

const getPriorityText = (priority: number) => {
  switch (priority) {
    case 1:
      return 'High Priority';
    case 2:
      return 'Medium Priority';
    case 3:
      return 'Low Priority';
    default:
      return 'Unknown Priority';
  }
};

export const JourneyPanel: React.FC<JourneyPanelProps> = ({
  isVisible,
  onClose
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [summaryData, setSummaryData] = useState<SailingSummaryData | undefined>(undefined);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch tasks from database
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('🔄 Fetching tasks for user:', currentUser.id);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (tasksError) {
        throw tasksError;
      }

      console.log('✅ Tasks fetched:', tasksData);

      // Transform database tasks to match our interface
      const transformedTasks: Task[] = tasksData.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        completed: task.status === 'completed',
        priority: task.priority,
        status: task.status,
        created_at: task.created_at,
        updated_at: task.updated_at,
        source_thought_id: task.source_thought_id
      }));

      setTasks(transformedTasks);

      // Select the first task if available
      if (transformedTasks.length > 0) {
        setSelectedTask(transformedTasks[0]);
      }

    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tasks when component becomes visible
  useEffect(() => {
    if (isVisible) {
      fetchTasks();
    }
  }, [isVisible]);

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.completed ? 'pending' : 'completed';

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, completed: !t.completed, status: newStatus }
          : t
      ));

      console.log('✅ Task status updated:', taskId, newStatus);
    } catch (error) {
      console.error('❌ Error updating task:', error);
    }
  };

  // Delete task handler
  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        return;
      }

      // Update local state
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);

      // If deleted task was selected, select the first remaining task
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTasks.length > 0 ? updatedTasks[0] : null);
      }

      console.log('✅ Task deleted:', taskId);
    } catch (error) {
      console.error('❌ Error deleting task:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedTask) return;

    const dragIndex = tasks.findIndex(t => t.id === draggedTask.id);
    if (dragIndex === dropIndex) return;

    // Reorder tasks
    const newTasks = [...tasks];
    const [draggedItem] = newTasks.splice(dragIndex, 1);
    newTasks.splice(dropIndex, 0, draggedItem);

    setTasks(newTasks);
    setDraggedTask(null);
    setDragOverIndex(null);

    console.log('✅ Task reordered:', draggedTask.title, 'to index', dropIndex);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverIndex(null);
  };

  const handleStartJourney = async () => {
    if (!selectedTask) {
      console.error('No task selected');
      return;
    }

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
          taskId: selectedTask?.id,
          sessionData: {
            // Include any session data needed for summary generation
            startTime: new Date().toISOString(),
            taskTitle: selectedTask?.title,
            taskPriority: selectedTask?.priority
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
    setSummaryData(undefined);
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

                {/* Loading state */}
                {isLoading && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white 
                                      rounded-full animate-spin"></div>
                      <p className="text-white/70 font-inter">Loading your tasks...</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-red-400 font-inter mb-4">Failed to load tasks</p>
                      <p className="text-white/60 text-sm font-inter mb-4">{error}</p>
                      <button
                        onClick={fetchTasks}
                        className="px-6 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                                   hover:from-white/20 hover:via-white/15 hover:to-white/12
                                   text-white rounded-xl transition-all duration-300
                                   border border-white/25 hover:border-white/35
                                   font-inter font-medium text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && tasks.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Compass className="w-12 h-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/70 font-inter mb-2">No tasks yet</p>
                      <p className="text-white/60 text-sm font-inter">
                        Record your voice to create tasks from your thoughts
                      </p>
                    </div>
                  </div>
                )}

                {/* Main content area - Show only if tasks exist */}
                {!isLoading && !error && tasks.length > 0 && selectedTask && (
                  <div className="flex-1 flex gap-8">
                    {/* Left column - To Do List with Scroll and Drag & Drop */}
                    <div className="w-64 space-y-3 flex flex-col">
                      <h3 className="text-lg font-playfair font-medium text-white mb-4">
                        to do list
                      </h3>

                      {/* Scrollable task list container */}
                      <div className="flex-1 overflow-y-auto max-h-96 space-y-2 pr-2 
                                      scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        {tasks.map((task, index) => (
                          <div key={task.id} className="relative">
                            {/* Drop indicator line - shows above current item */}
                            {draggedTask && dragOverIndex === index && (
                              <div className="absolute -top-1 left-0 right-0 z-10 flex items-center">
                                <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full opacity-80"></div>
                                <div className="absolute left-1/2 transform -translate-x-1/2 -top-1">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full shadow-lg"></div>
                                </div>
                              </div>
                            )}

                            <div
                              draggable
                              onDragStart={() => handleDragStart(task)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragEnd={handleDragEnd}
                              className={`relative group transition-all duration-300 
                                          ${dragOverIndex === index ? 'scale-105 shadow-lg' : ''}
                                          ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                            >
                              <button
                                onClick={() => setSelectedTask(task)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 
                                          border backdrop-blur-md font-inter text-sm relative
                                          ${selectedTask.id === task.id
                                    ? 'bg-gradient-to-br from-slate-500/30 via-slate-400/25 to-slate-600/35 border-white/30 text-white shadow-md'
                                    : 'bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-slate-600/20 border-white/20 text-white/80 hover:from-slate-500/20 hover:via-slate-400/15 hover:to-slate-600/25 hover:border-white/30'
                                  }`}
                              >
                                {/* Drag handle */}
                                <div className="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-3 h-3 text-white/40" />
                                </div>

                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity 
                                           text-white/40 hover:text-red-400 z-10"
                                >
                                  <X className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-2 mb-1 ml-4">
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
                                  <div className={getPriorityColor(task.priority)}>
                                    {getCategoryIcon(task.priority)}
                                  </div>
                                </div>
                                <div className={`ml-4 ${task.completed ? 'line-through opacity-60' : ''}`}>
                                  <div className="font-medium pr-6">{task.title}</div>
                                  <div className="text-xs text-white/60 mt-1">
                                    {getPriorityText(task.priority)}
                                  </div>
                                </div>
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Drop indicator at the bottom - shows when dragging over the area below the last item */}
                        {draggedTask && dragOverIndex === tasks.length && (
                          <div className="relative mt-2">
                            <div className="flex items-center">
                              <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full opacity-80"></div>
                              <div className="absolute left-1/2 transform -translate-x-1/2 -top-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full shadow-lg"></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Drop zone at the bottom for dropping after the last item */}
                        {draggedTask && (
                          <div
                            onDragOver={(e) => handleDragOver(e, tasks.length)}
                            onDrop={(e) => handleDrop(e, tasks.length)}
                            className="h-8 -mt-2"
                          />
                        )}
                      </div>
                    </div>

                    {/* Right column - Task Details - Now has more space */}
                    <div className="flex-1 space-y-6">
                      <div>
                        <h3 className="text-xl font-playfair font-medium text-white mb-3">
                          {selectedTask.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={getPriorityColor(selectedTask.priority)}>
                            {getCategoryIcon(selectedTask.priority)}
                          </div>
                          <span className={`text-sm font-inter ${getPriorityColor(selectedTask.priority)}`}>
                            {getPriorityText(selectedTask.priority)}
                          </span>
                        </div>
                        <p className="text-white/80 font-inter text-base leading-relaxed">
                          {selectedTask.description || 'No description provided'}
                        </p>
                      </div>

                      {/* Task details card */}
                      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-slate-600/20 
                                      border border-white/20 shadow-lg p-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm font-inter">Status:</span>
                            <span className={`text-sm font-inter capitalize ${selectedTask.completed ? 'text-green-400' : 'text-yellow-400'
                              }`}>
                              {selectedTask.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm font-inter">Created:</span>
                            <span className="text-white/80 text-sm font-inter">
                              {new Date(selectedTask.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {selectedTask.source_thought_id && (
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm font-inter">Source:</span>
                              <span className="text-white/80 text-sm font-inter">Voice Recording</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Start Journey Button - Removed justify-center to align with container edges */}
                      <div className="pt-4">
                        <button
                          onClick={handleStartJourney}
                          disabled={selectedTask.completed}
                          className={`w-full px-6 py-3 rounded-xl transition-all duration-300 
                                      font-inter font-medium text-base backdrop-blur-md
                                      border flex items-center justify-center gap-2
                                      transform hover:scale-[1.02] active:scale-[0.98]
                                      ${selectedTask.completed
                              ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-400/30 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-400/30 to-purple-400/30 hover:from-blue-400/40 hover:to-purple-400/40 text-white border-white/25 hover:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]'
                            }`}
                        >
                          <Sail className="w-5 h-5" />
                          {selectedTask.completed ? 'Task Completed' : 'Start Journey'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/20 rounded-full blur-sm animate-pulse"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white/15 rounded-full blur-sm animate-pulse"
                style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/4 -right-2 w-2 h-2 bg-white/25 rounded-full blur-sm animate-pulse"
                style={{ animationDelay: '2s' }}></div>
              <div className="absolute bottom-1/3 -left-2 w-3 h-3 bg-white/20 rounded-full blur-sm animate-pulse"
                style={{ animationDelay: '0.5s' }}></div>
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