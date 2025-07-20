/*
# Session End Edge Function

This Edge Function handles session termination and comprehensive statistics calculation.
It marks the session as ended, calculates focus/drift metrics, and generates AI analysis.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/session-end
- Method: POST
- Body: { sessionId: string }
- Returns: SessionEndResponse with detailed stats and AI analysis
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SessionEndRequest {
  sessionId: string;
}

interface SessionStats {
  totalDuration: number;      // seconds
  sailingDuration: number;    // focused time
  driftingDuration: number;   // distracted time
  distractionCount: number;   // drift events
  focusPercentage: number;    // percentage of time focused
}

interface AIAnalysis {
  summary_title: string;
  overall_comment: string;
  distraction_analysis: string;
  improvement_tips: string[];
}

interface SessionEndResponse {
  success: boolean;
  sessionId: string;
  stats: SessionStats;
  ai_analysis: AIAnalysis;
  error?: string;
}

// Helper function to call Dify for AI analysis
async function generateAIAnalysis(sessionData: any): Promise<AIAnalysis> {
  const difyApiUrl = Deno.env.get('DIFY_API_URL');
  const difyApiKey = Deno.env.get('DIFY_API_KEY');

  if (!difyApiUrl || !difyApiKey) {
    console.warn('Dify API not configured, using fallback analysis');
    return {
      summary_title: "Session Complete",
      overall_comment: `You completed a ${Math.round(sessionData.totalDuration / 60)}-minute focus session with ${sessionData.focusPercentage}% focus time.`,
      distraction_analysis: sessionData.distractionCount > 0 
        ? `You experienced ${sessionData.distractionCount} distraction periods totaling ${Math.round(sessionData.driftingDuration / 60)} minutes.`
        : "You maintained excellent focus throughout your session.",
      improvement_tips: sessionData.focusPercentage < 70 
        ? ["Try using a timer for shorter focused bursts", "Consider eliminating nearby distractions", "Take short breaks between focus sessions"]
        : ["Great focus! Keep up this momentum", "Consider extending your session length gradually"]
    };
  }

  try {
    const difyResponse = await fetch(`${difyApiUrl}/v1/completion-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          session_duration: Math.round(sessionData.totalDuration / 60),
          focus_percentage: sessionData.focusPercentage,
          distraction_count: sessionData.distractionCount,
          drift_time: Math.round(sessionData.driftingDuration / 60),
          task_title: sessionData.taskTitle || "your task"
        },
        response_mode: "blocking",
        user: sessionData.userId
      })
    });

    if (difyResponse.ok) {
      const difyData = await difyResponse.json();
      
      // Parse Dify response - assuming it returns structured analysis
      const analysis = difyData.answer;
      
      return {
        summary_title: "AI-Generated Session Analysis",
        overall_comment: analysis.overall_comment || `You completed a ${Math.round(sessionData.totalDuration / 60)}-minute session.`,
        distraction_analysis: analysis.distraction_analysis || "Session analysis complete.",
        improvement_tips: analysis.improvement_tips || ["Keep up the great work!"]
      };
    }
  } catch (error) {
    console.error('Dify API error:', error);
  }

  // Fallback if Dify fails
  return {
    summary_title: "Session Complete",
    overall_comment: `You completed a ${Math.round(sessionData.totalDuration / 60)}-minute focus session with ${sessionData.focusPercentage}% focus time.`,
    distraction_analysis: sessionData.distractionCount > 0 
      ? `You experienced ${sessionData.distractionCount} distraction periods totaling ${Math.round(sessionData.driftingDuration / 60)} minutes.`
      : "You maintained excellent focus throughout your session.",
    improvement_tips: sessionData.focusPercentage < 70 
      ? ["Try shorter focused sessions", "Remove nearby distractions", "Use the Pomodoro technique"]
      : ["Excellent focus!", "Consider longer sessions", "Keep up this momentum"]
  };
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse the request body
    let requestData: SessionEndRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { sessionId } = requestData;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('=== SESSION END REQUEST ===');
    console.log('Session ID:', sessionId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Get session data and mark as ended
    const { data: sessionData, error: sessionError } = await supabase.rpc('end_sailing_session', {
      session_uuid: sessionId
    });

    if (sessionError) {
      console.error('Error ending session:', sessionError);
      throw new Error(`Failed to end session: ${sessionError.message}`);
    }

    console.log('Session ended successfully:', sessionData);

    // Step 2: Calculate detailed statistics from drift_events
    const { data: driftEvents, error: driftError } = await supabase
      .from('drift_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (driftError) {
      console.error('Error fetching drift events:', driftError);
    }

    // Step 3: Calculate statistics
    let totalDuration = Number(sessionData?.duration_seconds) || 0;
    let sailingDuration = Number(sessionData?.focus_seconds) || 0;
    let driftingDuration = Number(sessionData?.drift_seconds) || 0;
    let distractionCount = Number(sessionData?.drift_count) || 0;

    // If we have drift events, recalculate for more accuracy
    if (driftEvents && driftEvents.length > 0) {
      distractionCount = driftEvents.filter(event => event.is_drifting).length;
      
      // Calculate drift duration based on drift events
      let currentDriftStart: Date | null = null;
      let totalDriftTime = 0;
      
      for (const event of driftEvents) {
        const eventTime = new Date(event.created_at);
        
        if (event.is_drifting && !currentDriftStart) {
          // Start of drift period
          currentDriftStart = eventTime;
        } else if (!event.is_drifting && currentDriftStart) {
          // End of drift period
          totalDriftTime += eventTime.getTime() - currentDriftStart.getTime();
          currentDriftStart = null;
        }
      }
      
      // If session ended during drift, account for that
      if (currentDriftStart && totalDuration > 0) {
        const sessionEndTime = new Date(driftEvents[0].created_at);
        sessionEndTime.setSeconds(sessionEndTime.getSeconds() + totalDuration);
        totalDriftTime += sessionEndTime.getTime() - currentDriftStart.getTime();
      }
      
      driftingDuration = Math.round(totalDriftTime / 1000); // Convert to seconds
    }

    // Ensure focus time calculation is correct
    sailingDuration = Math.max(0, totalDuration - driftingDuration);
    const focusPercentage = totalDuration > 0 ? Math.round((sailingDuration / totalDuration) * 100) : 0;

    const stats: SessionStats = {
      totalDuration,
      sailingDuration,
      driftingDuration,
      distractionCount,
      focusPercentage
    };

    console.log('=== CALCULATED STATS ===');
    console.log('Stats:', stats);

    // Step 4: Get additional session context for AI analysis
    const { data: sessionInfo, error: sessionInfoError } = await supabase
      .from('sailing_sessions')
      .select(`
        *,
        tasks!inner(title, description),
        users!inner(id, guiding_star)
      `)
      .eq('id', sessionId)
      .single();

    let taskTitle = 'your task';
    let userId = 'anonymous';
    if (sessionInfo && !sessionInfoError) {
      taskTitle = sessionInfo.tasks?.title || 'your task';
      userId = sessionInfo.users?.id || 'anonymous';
    }

    // Step 5: Generate AI analysis
    const ai_analysis = await generateAIAnalysis({
      ...stats,
      taskTitle,
      userId,
      sessionId
    });

    console.log('=== AI ANALYSIS ===');
    console.log('Analysis:', ai_analysis);

    // Step 6: Prepare response
    const response: SessionEndResponse = {
      success: true,
      sessionId,
      stats,
      ai_analysis
    };

    console.log('=== SESSION END RESPONSE ===');
    console.log('Response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== ERROR IN SESSION END ===');
    console.error('Error details:', error);

    const errorResponse: SessionEndResponse = {
      success: false,
      sessionId: '',
      stats: {
        totalDuration: 0,
        sailingDuration: 0,
        driftingDuration: 0,
        distractionCount: 0,
        focusPercentage: 0
      },
      ai_analysis: {
        summary_title: "Error",
        overall_comment: "Unable to generate session summary",
        distraction_analysis: "Session data unavailable",
        improvement_tips: ["Please try again"]
      },
      error: error.message
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}) 