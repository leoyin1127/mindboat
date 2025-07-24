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

interface DifyWorkflowResponse {
  task_id: string;
  workflow_run_id: string;
  data: {
    id: string;
    workflow_id: string;
    status: string;
    outputs: {
      text: string;
    };
    error?: string;
    elapsed_time: number;
    total_tokens: number;
    total_steps: number;
    created_at: number;
    finished_at: number;
  };
}

interface SessionEndResponse {
  success: boolean;
  sessionId: string;
  stats: SessionStats;
  summary: string;
  error?: string;
}

// Helper function to collect session data for DIFY workflow
async function collectSessionData(supabase: any, sessionId: string): Promise<{conversation: string, heartbeat: string, task_motivation: string}> {
  // Get AI conversations
  const { data: conversations, error: convError } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // Get drift events (heartbeat logs)
  const { data: driftEvents, error: driftError } = await supabase
    .from('drift_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // Get task motivation
  const { data: sessionInfo, error: sessionError } = await supabase
    .from('sailing_sessions')
    .select(`
      *,
      tasks!inner(title, description, motivation)
    `)
    .eq('id', sessionId)
    .single();

  // Format conversations
  let conversationText = "No conversations recorded";
  if (conversations && conversations.length > 0) {
    conversationText = conversations
      .map(conv => `${conv.role}: ${conv.message}`)
      .join('\n');
  }

  // Format drift events (heartbeat logs)
  let heartbeatText = "No drift events recorded";
  if (driftEvents && driftEvents.length > 0) {
    heartbeatText = driftEvents
      .map(event => `${new Date(event.created_at).toISOString()}: ${event.is_drifting ? 'DRIFT' : 'FOCUS'} - ${event.description || 'No description'}`)
      .join('\n');
  }

  // Format task motivation
  let taskMotivation = "No task motivation found";
  if (sessionInfo && !sessionError && sessionInfo.tasks) {
    const task = sessionInfo.tasks;
    taskMotivation = `Title: ${task.title || 'Untitled'}\nDescription: ${task.description || 'No description'}\nMotivation: ${task.motivation || 'No motivation provided'}`;
  }

  return {
    conversation: conversationText,
    heartbeat: heartbeatText,
    task_motivation: taskMotivation
  };
}

// Helper function to call DIFY workflow for session summary
async function generateSessionSummary(sessionData: {conversation: string, heartbeat: string, task_motivation: string}, userId: string): Promise<string> {
  const difyApiUrl = Deno.env.get('DIFY_API_URL');
  const difyApiKey = Deno.env.get('FR311_DIFY_API_KEY');

  if (!difyApiUrl || !difyApiKey) {
    console.warn('DIFY API not configured, using fallback summary');
    return "Session completed successfully. DIFY workflow not configured for detailed analysis.";
  }

  try {
    const workflowUrl = `${difyApiUrl}/v1/workflows/run`;
    
    const difyResponse = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          conversation: sessionData.conversation,
          heartbeat: sessionData.heartbeat,
          task_motivation: sessionData.task_motivation
        },
        response_mode: "streaming",
        user: userId
      })
    });

    if (difyResponse.ok) {
      const difyData: DifyWorkflowResponse = await difyResponse.json();
      
      if (difyData.data && difyData.data.outputs && difyData.data.outputs.text) {
        return difyData.data.outputs.text;
      }
      
      return "Session analysis completed, but no summary text was generated.";
    } else {
      console.error('DIFY workflow failed:', await difyResponse.text());
      return "Session completed. Unable to generate detailed summary at this time.";
    }
  } catch (error) {
    console.error('DIFY workflow error:', error);
    return "Session completed successfully. Summary generation encountered an error.";
  }
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

    // Step 5: Collect session data and generate summary via DIFY workflow
    const collectedData = await collectSessionData(supabase, sessionId);
    const summary = await generateSessionSummary(collectedData, userId);

    console.log('=== SESSION SUMMARY ===');
    console.log('Summary:', summary);

    // Step 6: Prepare response
    const response: SessionEndResponse = {
      success: true,
      sessionId,
      stats,
      summary
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
      summary: "Unable to generate session summary due to an error. Please try again.",
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