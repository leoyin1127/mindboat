/*
# Session Start Edge Function

This Edge Function handles starting a new sailing session.
It creates a session record in the database and returns the sessionId for WebSocket connection.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/session-start
- Method: POST
- Body: { "userId": "string", "taskId": "string" }
- Returns: { "sessionId": "string", "startTime": "string", "status": "sailing" }
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SessionStartRequest {
  userId: string;
  taskId: string;
}

interface SessionStartResponse {
  sessionId: string;
  startTime: string;
  status: string;
  taskId: string;
  userId: string;
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
    let requestData: SessionStartRequest
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

    const { userId, taskId } = requestData

    // Validate required fields
    if (!userId || !taskId) {
      return new Response(
        JSON.stringify({ error: 'userId and taskId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('=== SESSION START REQUEST ===')
    console.log('Request data:', JSON.stringify(requestData, null, 2))
    console.log('Timestamp:', new Date().toISOString())

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create session record in database
    // Note: Using voyages table since it matches the existing schema structure
    const startTime = new Date().toISOString()
    const sessionId = crypto.randomUUID()

    const { data: sessionData, error: sessionError } = await supabase
      .from('voyages')
      .insert({
        id: sessionId,
        user_id: userId,
        destination_id: taskId, // Using destination_id as taskId for now
        start_time: startTime,
        status: 'active', // Maps to 'sailing' in the frontend
        visual_state: 'sailing',
        voice_recording_enabled: true,
        precision_level: 'second'
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

    console.log('Session created successfully:', sessionData)

    // Prepare response
    const response: SessionStartResponse = {
      sessionId: sessionData.id,
      startTime: sessionData.start_time,
      status: 'sailing',
      taskId: taskId,
      userId: userId
    }

    console.log('=== SESSION START RESPONSE ===')
    console.log('Response:', JSON.stringify(response, null, 2))

    // TODO: Here you would also:
    // 1. Initialize the dual-track monitoring system
    // 2. Set up WebSocket connection endpoint for this session
    // 3. Start background data collection processes
    // 4. Initialize the "slow track" analysis pipeline

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN SESSION START ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'session-start'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})