import React, { useState, useEffect, useRef } from 'react';
import { Compass, CheckCircle, Circle, Mail as Sail, Mountain, BookOpen, Palette, GripVertical, X } from 'lucide-react';
import { ControlPanel } from './ControlPanel';
import { SailingSummaryPanel } from './SailingSummaryPanel';
import { PermissionPanel } from './PermissionPanel';
import { VideoPreview } from './VideoPreview';
import { SeagullPanel } from './SeagullPanel';
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
  const [showPermissionPanel, setShowPermissionPanel] = useState(false);
  const [showSeagullPanel, setShowSeagullPanel] = useState(false);
  const [seagullMessage, setSeagullMessage] = useState<string>('');

  // Sailing session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Realtime channel reference
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Media state management
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  
  // Media stream references
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  
  // Refs to avoid stale closures in heartbeat callbacks
  const videoStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Refs for video elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenRef = useRef<HTMLVideoElement | null>(null);

  // Heartbeat system for distraction detection
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);

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
      // Check permissions when panel opens
      checkInitialPermissions();
    }
  }, [isVisible]);

  // Check initial permissions when panel opens
  const checkInitialPermissions = async () => {
    try {
      let hasMic = false;
      let hasCamera = false;
      let hasScreen = false;

      // Check microphone permission
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        hasMic = micPermission.state === 'granted';
      } catch (error) {
        console.warn('Could not check microphone permission:', error);
        hasMic = false;
      }

      // Check camera permission
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        hasCamera = cameraPermission.state === 'granted';
      } catch (error) {
        console.warn('Could not check camera permission:', error);
        hasCamera = false;
      }

      // Screen sharing can't be queried, assume false initially
      hasScreen = false;

      // Only set hasPermissions to true if we have microphone (required)
      // The permission panel will handle checking all three
      setHasPermissions(hasMic);

      console.log('Initial permissions check:', { hasMic, hasCamera, hasScreen });
    } catch (error) {
      console.warn('Could not check initial permissions:', error);
      setHasPermissions(false);
    }
  };

  // Cleanup Realtime channel, media streams, and heartbeat on component unmount
  useEffect(() => {
    return () => {
      cleanupRealtimeChannel();
      cleanupMediaStreams();
      stopHeartbeat();
    };
  }, []);

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

  // Handle permission panel completion
  const handlePermissionsGranted = (hasEssentialPermissions: boolean) => {
    setHasPermissions(hasEssentialPermissions);
    if (hasEssentialPermissions) {
      setSessionError(null);
      // Don't auto-start here - let the permission panel handle it via onClose
    }
  };

  // Media handling functions
  const toggleVideo = async () => {
    try {
      if (isVideoOn && videoStream) {
        // Turn off video
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        videoStreamRef.current = null;
        setIsVideoOn(false);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        console.log('Video turned off');
      } else {
        // Turn on video
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          } 
        });
        setVideoStream(stream);
        videoStreamRef.current = stream;
        setIsVideoOn(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        console.log('Video turned on');
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      setSessionError('Failed to access camera. Please check permissions.');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing && screenStream) {
        // Stop screen sharing
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        if (screenRef.current) {
          screenRef.current.srcObject = null;
        }
        console.log('Screen sharing stopped');
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        setScreenStream(stream);
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        if (screenRef.current) {
          screenRef.current.srcObject = stream;
        }
        
        // Handle when user stops sharing via browser UI
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setScreenStream(null);
          screenStreamRef.current = null;
          setIsScreenSharing(false);
          if (screenRef.current) {
            screenRef.current.srcObject = null;
          }
        });
        
        console.log('Screen sharing started');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setSessionError('Failed to start screen sharing. Please check permissions.');
    }
  };

  const toggleMic = async () => {
    try {
      if (!micStream) {
        // Request microphone access if not already available
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        setIsMicMuted(false);
        console.log('Microphone access granted');
      } else {
        // Toggle mute state
        const audioTrack = micStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = isMicMuted;
          setIsMicMuted(!isMicMuted);
          console.log('Microphone', isMicMuted ? 'unmuted' : 'muted');
        }
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      setSessionError('Failed to access microphone. Please check permissions.');
    }
  };

  // Cleanup all media streams
  const cleanupMediaStreams = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
      videoStreamRef.current = null;
      setIsVideoOn(false);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
      setIsMicMuted(false);
    }
    console.log('All media streams cleaned up');
  };

  // Image capture utilities for heartbeat system
  const captureCameraFrame = async (): Promise<Blob | null> => {
    const stream = videoStreamRef.current;
    if (!stream) {
      console.warn('No video stream available for camera capture');
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      
      // Set up video element
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      // Set canvas dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      });
    } catch (error) {
      console.error('Error capturing camera frame:', error);
      return null;
    }
  };

  const captureScreenFrame = async (): Promise<Blob | null> => {
    const stream = screenStreamRef.current;
    if (!stream) {
      console.warn('No screen stream available for screen capture');
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      
      // Set up video element
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      // Set canvas dimensions
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      });
    } catch (error) {
      console.error('Error capturing screen frame:', error);
      return null;
    }
  };

  // Heartbeat function - sends periodic focus check to backend
  // Helper function to convert blob to base64
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const sendHeartbeat = async (sessionId: string, isActive: boolean) => {
    if (!sessionId || !isActive) {
      console.log('Invalid session parameters for heartbeat:', { sessionId, isActive });
      return;
    }

    console.log('📊 Sending heartbeat for session:', sessionId);

    try {
      // Capture images from active streams
      const [cameraBlob, screenBlob] = await Promise.all([
        captureCameraFrame(),
        captureScreenFrame()
      ]);

      // Skip heartbeat if no images captured
      if (!cameraBlob && !screenBlob) {
        console.warn('Heartbeat skipped: No media to send.')
        return;
      }

      // Convert blobs to base64 strings
      const cameraImageBase64 = cameraBlob ? await blobToBase64(cameraBlob) : null
      const screenImageBase64 = screenBlob ? await blobToBase64(screenBlob) : null

      // Invoke the backend function with the new payload
      const { data, error } = await supabase.functions.invoke('session-heartbeat', {
        body: { 
          sessionId: sessionId, 
          cameraImage: cameraImageBase64,
          screenImage: screenImageBase64 
        },
      });

      if (error) {
        console.error('❌ Heartbeat failed:', error);
        return;
      }

      console.log('✅ Heartbeat sent successfully:', data);
      
      // Log drift status for debugging
      if (data.is_drifting) {
        console.warn('🚨 Drift detected:', data.reason);
      } else {
        console.log('✨ User focused:', data.actual_task);
      }
    } catch (error) {
      console.error('❌ Error sending heartbeat:', error);
    }
  };

  // Start heartbeat monitoring
  const startHeartbeat = (sessionId: string, isActive: boolean) => {
    if (heartbeatIntervalRef.current) {
      console.log('Heartbeat already active');
      return;
    }

    console.log('🔄 Starting heartbeat monitoring (60s intervals) for session:', sessionId);
    setIsHeartbeatActive(true);
    
    // Send first heartbeat after longer delay to ensure streams are ready
    setTimeout(() => sendHeartbeat(sessionId, isActive), 8000); // Wait 8 seconds for streams to stabilize
    
    // Then send every 60 seconds
    heartbeatIntervalRef.current = setInterval(() => sendHeartbeat(sessionId, isActive), 60000);
  };

  // Stop heartbeat monitoring
  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      setIsHeartbeatActive(false);
      console.log('⏹️ Heartbeat monitoring stopped');
    }
  };

  // Setup Realtime channel for session
  const setupRealtimeChannel = (sessionId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase.channel(`session:${sessionId}`);

    channel
      .on('broadcast', { event: 'session_event' }, (payload) => {
        console.log('Session event received:', payload);
        // Handle session events like drift detection, AI interventions, etc.
      })
      .on('broadcast', { event: 'session_ended' }, (payload) => {
        console.log('Session ended remotely:', payload);
        setIsSessionActive(false);
        setCurrentSessionId(null);
      })
      .on('broadcast', { event: 'deep_drift_detected' }, (payload) => {
        console.log('🚨 Deep drift detected, triggering AI intervention:', payload);
        
        // Trigger SeagullPanel with intervention message
        const interventionMessage = payload.payload?.message || 
          `Captain, I've noticed you've been drifting for ${payload.payload?.consecutive_drifts || 5} minutes. Let's get back on course together.`;
        
        setSeagullMessage(interventionMessage);
        setShowSeagullPanel(true);
        
        console.log('🦅 Seagull intervention activated');
      })
      .subscribe((status) => {
        console.log('Realtime channel status:', status);
      });

    realtimeChannelRef.current = channel;
  };

  // Clean up Realtime channel
  const cleanupRealtimeChannel = () => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };

  // Trigger Spline animation for session events
  const triggerSplineSessionAnimation = async (event: 'start' | 'end') => {
    try {
      const webhookUrl = event === 'start' ?
        'https://hooks.spline.design/vS-vioZuERs' :
        'https://hooks.spline.design/vS-vioZuERs'; // Use same webhook for now

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spline-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          webhookUrl,
          payload: { numbaer2: event === 'start' ? 0 : 1 }
        })
      });

      if (response.ok) {
        console.log(`${event} session animation triggered successfully`);
      } else {
        console.error(`Failed to trigger ${event} session animation:`, response.status);
      }
    } catch (error) {
      console.error(`Error triggering ${event} session animation:`, error);
    }
  };

  // Core session starting logic - separated from permission checks
  const startSailingSession = async () => {
    if (!selectedTask) {
      console.error('No task selected');
      return;
    }

    // Guard: Prevent multiple calls if already starting or active
    if (isStartingSession || isSessionActive || currentSessionId) {
      console.log('Session already starting or active, ignoring call');
      return;
    }

    console.log('Starting sailing session with task:', selectedTask.title);
    setIsStartingSession(true);
    setSessionError(null);

    try {
      // Step 1: Start sailing session in database
      const sessionId = await auth.startSession(selectedTask.id);
      console.log('Sailing session started with ID:', sessionId);

      // Step 2: Setup Realtime channel
      setupRealtimeChannel(sessionId);

      // Step 3: Initialize microphone stream for session
      try {
        const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(microphoneStream);
        setIsMicMuted(false);
        console.log('Microphone initialized for session');
      } catch (micError) {
        console.warn('Could not initialize microphone for session:', micError);
        // Continue with session even if microphone fails
      }

      // Step 3.5: Initialize camera stream for heartbeat monitoring
      if (!isVideoOn && !videoStream) {
        try {
          console.log('Initializing camera for heartbeat monitoring...');
          await toggleVideo();
          console.log('Camera initialized for session');
        } catch (cameraError) {
          console.warn('Could not initialize camera for session:', cameraError);
          // Continue with session even if camera fails
        }
      }

      // Step 3.6: Initialize screen sharing for heartbeat monitoring
      if (!isScreenSharing && !screenStream) {
        try {
          console.log('Initializing screen sharing for heartbeat monitoring...');
          await toggleScreenShare();
          console.log('Screen sharing initialized for session');
        } catch (screenError) {
          console.warn('Could not initialize screen sharing for session:', screenError);
          // Continue with session even if screen sharing fails
        }
      }

      // Step 4: Trigger Spline animation
      await triggerSplineSessionAnimation('start');

      // Step 5: Update session state
      setCurrentSessionId(sessionId);
      setIsSessionActive(true);
      setSessionStartTime(new Date());

      // Step 6: Start heartbeat monitoring for distraction detection
      startHeartbeat(sessionId, true);

      // Step 7: Show control panel and hide journey panel
      setShowControlPanel(true);
      onClose?.();

    } catch (error) {
      console.error('Error starting sailing session:', error);
      setSessionError(error instanceof Error ? error.message : 'Failed to start sailing session');
      setIsSessionActive(false);
      setCurrentSessionId(null);
    } finally {
      setIsStartingSession(false);
    }
  };

  // Handle journey start - always check permissions first
  const handleStartJourney = async () => {
    if (!selectedTask) {
      console.error('No task selected');
      return;
    }

    // Always show permission panel to allow user to grant all permissions
    // The panel will auto-start the session when essential permissions are granted
    setShowPermissionPanel(true);
  };



  const handleEndVoyage = async () => {
    if (!currentSessionId) {
      console.error('No active session to end');
      setSessionError('No active session found');
      return;
    }

    console.log('Ending sailing session:', currentSessionId);
    setSessionError(null);

    // Immediately reset session state to prevent race conditions
    const sessionIdToEnd = currentSessionId;
    setCurrentSessionId(null);
    setIsSessionActive(false);
    setIsStartingSession(false);

    // Hide control panel and show loading state
    setShowControlPanel(false);
    setShowSummaryPanel(true);
    setIsLoadingSummary(true);

    try {
      // Step 1: End sailing session in database
      console.log('Calling endSession with sessionId:', sessionIdToEnd);
      let sessionSummary: Record<string, unknown>;

      try {
        sessionSummary = await auth.endSession(sessionIdToEnd);
        console.log('Sailing session ended with summary:', sessionSummary);
      } catch (sessionError) {
        console.error('Error ending session, using fallback data:', sessionError);
        // Use default values if session ending fails
        sessionSummary = {
          duration_seconds: sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) : 0,
          focus_seconds: 0,
          drift_seconds: 0,
          drift_count: 0,
          focus_percentage: 0
        };
      }

      // Validate session summary data
      if (!sessionSummary || typeof sessionSummary !== 'object') {
        console.warn('Invalid session summary received:', sessionSummary);
        // Use default values if session summary is invalid
        sessionSummary = {
          duration_seconds: sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) : 0,
          focus_seconds: 0,
          drift_seconds: 0,
          drift_count: 0,
          focus_percentage: 0
        };
        console.log('Using default session summary:', sessionSummary);
      }

      // Step 2: Trigger Spline animation
      await triggerSplineSessionAnimation('end');

      // Step 3: Clean up Realtime channel, media streams, and heartbeat
      cleanupRealtimeChannel();
      cleanupMediaStreams();
      stopHeartbeat();

      // Step 4: Generate AI summary
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sailing-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          taskId: selectedTask?.id,
          sessionData: {
            sessionId: sessionIdToEnd,
            taskTitle: selectedTask?.title,
            taskCategory: getPriorityText(selectedTask?.priority || 2),
            startTime: sessionStartTime?.toISOString(),
            endTime: new Date().toISOString(),
            durationSeconds: sessionSummary.duration_seconds,
            focusSeconds: sessionSummary.focus_seconds,
            driftSeconds: sessionSummary.drift_seconds,
            driftCount: sessionSummary.drift_count,
            focusPercentage: sessionSummary.focus_percentage,
            ...sessionSummary
          }
        })
      });

      if (response.ok) {
        const summaryResponse = await response.json();
        console.log('Voyage summary generated successfully:', summaryResponse);

        // Set the summary data
        setSummaryData({
          imageUrl: summaryResponse.imageUrl,
          summaryText: summaryResponse.summaryText
        });
      } else {
        console.error('Failed to generate voyage summary:', response.status, response.statusText);
        // Show fallback summary with session data
        const duration = Math.floor((Number(sessionSummary.duration_seconds) || 0) / 60);
        const focus = Number(sessionSummary.focus_percentage) || 0;
        setSummaryData({
          imageUrl: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
          summaryText: `Your voyage has been completed successfully! Duration: ${duration} minutes, Focus: ${focus}%`
        });
      }

      // Step 5: Reset additional session state
      setSessionStartTime(null);

    } catch (error) {
      console.error('Error ending sailing session:', error);
      setSessionError(error instanceof Error ? error.message : 'Failed to end sailing session');

      // Show error state or fallback summary
      setSummaryData({
        imageUrl: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
        summaryText: 'Your voyage has been completed, but we were unable to generate a detailed summary at this time.'
      });

      // Reset additional session state on error
      setSessionStartTime(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCloseSummary = () => {
    setShowSummaryPanel(false);
    setSummaryData(undefined);
    // Reset any remaining session state when closing summary
    setSessionStartTime(null);
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

                {/* Session Status */}
                {isSessionActive && (
                  <div className="mb-4 p-3 bg-gradient-to-br from-green-500/20 via-green-400/15 to-green-600/25 
                                  backdrop-blur-md rounded-xl border border-green-400/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-100 font-inter text-sm">
                        Sailing session active • {sessionStartTime && `Started ${sessionStartTime.toLocaleTimeString()}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Session Error */}
                {sessionError && (
                  <div className="mb-4 p-3 bg-gradient-to-br from-red-500/20 via-red-400/15 to-red-600/25 
                                  backdrop-blur-md rounded-xl border border-red-400/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-red-100 font-inter text-sm">
                        {sessionError}
                      </span>
                    </div>
                  </div>
                )}

                {/* Permissions Status */}
                {hasPermissions && (
                  <div className="mb-4 p-3 bg-gradient-to-br from-blue-500/20 via-blue-400/15 to-blue-600/25 
                                  backdrop-blur-md rounded-xl border border-blue-400/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-blue-100 font-inter text-sm">
                        Media permissions granted
                      </span>
                    </div>
                  </div>
                )}

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
                          disabled={selectedTask.completed || isStartingSession}
                          className={`w-full px-6 py-3 rounded-xl transition-all duration-300 
                                      font-inter font-medium text-base backdrop-blur-md
                                      border flex items-center justify-center gap-2
                                      transform hover:scale-[1.02] active:scale-[0.98]
                                      ${selectedTask.completed || isStartingSession
                              ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-400/30 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-400/30 to-purple-400/30 hover:from-blue-400/40 hover:to-purple-400/40 text-white border-white/25 hover:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]'
                            }`}
                        >
                          {isStartingSession ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Starting Session...
                            </>
                          ) : (
                            <>
                              <Sail className="w-5 h-5" />
                              {selectedTask.completed ? 'Task Completed' : 'Start Journey'}
                            </>
                          )}
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
        sessionId={currentSessionId}
        isSessionActive={isSessionActive}
        isMicMuted={isMicMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={toggleMic}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
      />

      {/* Sailing Summary Panel - full screen modal */}
      <SailingSummaryPanel
        isVisible={showSummaryPanel}
        onClose={handleCloseSummary}
        summaryData={summaryData}
        isLoading={isLoadingSummary}
      />

      {/* Permission Panel - for requesting media permissions */}
      <PermissionPanel
        isVisible={showPermissionPanel}
        onClose={() => {
          setShowPermissionPanel(false);
          // Only start session if we have permissions and no session is active
          if (hasPermissions && !isSessionActive && !isStartingSession) {
            setTimeout(() => {
              startSailingSession();
            }, 200);
          }
        }}
        onPermissionsGranted={handlePermissionsGranted}
      />

      {/* Video Preview - Camera */}
      <VideoPreview
        stream={videoStream}
        type="camera"
        isVisible={isVideoOn}
        onClose={toggleVideo}
        className="top-4 right-4"
      />

      {/* Video Preview - Screen Share */}
      <VideoPreview
        stream={screenStream}
        type="screen"
        isVisible={isScreenSharing}
        onClose={toggleScreenShare}
        className="top-4 left-4"
      />

      {/* Seagull Panel - AI Intervention for Deep Drift */}
      <SeagullPanel
        isVisible={showSeagullPanel}
        onClose={() => {
          setShowSeagullPanel(false);
          setSeagullMessage('');
        }}
        message={seagullMessage}
      />
    </>
  );
};