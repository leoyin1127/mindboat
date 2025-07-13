/*
# Sailing Session Edge Function

This Edge Function manages sailing sessions for the focus-feedback loop system.
It handles session creation, status updates, and real-time communication.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/sailing-session
- Method: POST
- Body: { action: 'start', deviceId: string, taskId: string } | { action: 'update', sessionId: string, status: string }
- Returns: Session data with real-time channel setup
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface StartSessionRequest {
  action: 'start';
  taskId: string;
  permissions?: {
    camera: boolean;
    screen: boolean;
    microphone: boolean;
  };
}

interface UpdateSessionRequest {
  action: 'update';
  sessionId: string;
  status: 'sailing' | 'drifting' | 'completed';
  sessionData?: any;
}

type SessionRequest = StartSessionRequest | UpdateSessionRequest;

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
    let requestData: SessionRequest
    try {
      requestData = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('=== SAILING SESSION REQUEST ===')
    console.log('Request data:', JSON.stringify(requestData, null, 2))

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (requestData.action === 'start') {
      // Start new sailing session
      const { taskId, permissions } = requestData

      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'taskId is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Get user from JWT token
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Initialize Supabase client with user auth
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      )

      // Get current user
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'User not authenticated' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Create new session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          status: 'sailing',
          session_data: {
            permissions: permissions || {},
            startedAt: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating session:', sessionError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create session',
            message: sessionError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      console.log('Session created:', sessionData)

      // Trigger Spline animation for start sailing
      try {
        const splineResponse = await fetch('https://hooks.spline.design/vS-vioZuERs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'QgxEuHaAD0fyTDdEAYvVH_ynObU2SUnWdip86Gb1RJE',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ numbaer2: 0 })
        })

        const splineResult = await splineResponse.json()
        console.log('Spline animation triggered:', splineResult)
      } catch (error) {
        console.error('Failed to trigger Spline animation:', error)
        // Don't fail the session creation if Spline fails
      }

      // Broadcast session start event
      const startEvent = {
        type: 'session_started',
        payload: {
          sessionId: sessionData.id,
          taskId: taskId,
          status: 'sailing',
          timestamp: new Date().toISOString()
        }
      }

      const channel = supabase.channel(`session-${sessionData.id}`)
      await channel.send({
        type: 'broadcast',
        event: 'session_update',
        payload: startEvent
      })

      // Return session data
      return new Response(
        JSON.stringify({
          success: true,
          sessionId: sessionData.id,
          status: sessionData.status,
          startTime: sessionData.start_time,
          channelName: `session-${sessionData.id}`,
          message: 'Sailing session started successfully'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } else if (requestData.action === 'update') {
      // Update existing session
      const { sessionId, status, sessionData } = requestData

      if (!sessionId || !status) {
        return new Response(
          JSON.stringify({ error: 'sessionId and status are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Update session in database
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      }

      if (status === 'completed') {
        updateData.end_time = new Date().toISOString()
      }

      if (sessionData) {
        updateData.session_data = sessionData
      }

      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating session:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update session',
            message: updateError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Broadcast session update event
      const updateEvent = {
        type: 'session_updated',
        payload: {
          sessionId: sessionId,
          status: status,
          timestamp: new Date().toISOString(),
          sessionData: sessionData
        }
      }

      const channel = supabase.channel(`session-${sessionId}`)
      await channel.send({
        type: 'broadcast',
        event: 'session_update',
        payload: updateEvent
      })

      return new Response(
        JSON.stringify({
          success: true,
          sessionId: sessionId,
          status: updatedSession.status,
          message: 'Session updated successfully'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "start" or "update"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('=== ERROR IN SAILING SESSION ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'sailing-session'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})