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

    // Step 5: Generate basic session summary (DIFY integration moved to sailing-summary function)
    const summary = `Session completed successfully. Duration: ${Math.round(totalDuration/60)} minutes, Focus: ${focusPercentage}%`;

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