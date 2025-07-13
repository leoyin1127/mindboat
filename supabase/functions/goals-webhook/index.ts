/*
# Goals Webhook Edge Function

This Edge Function handles life goal submissions and Spline API calls for the "Life Goals" feature.
When called with a goal_text, it stores the goal in the database and triggers the Spline webhook.
When called without a goal_text, it triggers the life goals modal on the frontend.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/goals-webhook
- Method: POST
- Headers: Authorization: Bearer <JWT>
- Body (for goal submission): { "goal_text": "User's life goal" }
- Response: JSON with success status and message
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GoalsWebhookPayload {
  goal?: string;
  [key: string]: any;
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
    let payload: GoalsWebhookPayload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON payload',
          message: error.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('=== GOALS WEBHOOK CALLED ===')
    console.log('Payload received:', JSON.stringify(payload, null, 2))
    console.log('Timestamp:', new Date().toISOString())

    // Initialize Supabase client with service role for database operations
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // This function only handles UI event broadcasting, not data saving
    // Life goals are saved via auth.setGuidingStar() in the frontend
    
    // Create the goals event data
    const eventData = {
      type: 'spline_goals_trigger',
      payload: {
        ...payload,
        number: 1, // Explicitly set for compatibility
        modalType: 'goals',
        uiAction: 'show_goals',
        message: 'Life Goal Setting',
        apiEndpoint: 'goals-webhook',
        timestamp: new Date().toISOString(),
        source: 'goals-webhook'
      },
      timestamp: new Date().toISOString(),
      source: 'spline'
    }

    console.log('=== BROADCASTING GOALS EVENT ===')
    console.log('Event data:', JSON.stringify(eventData, null, 2))

    // Broadcast to realtime channel
    const channel = serviceRoleClient.channel('spline-events')
    
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'spline_interaction',
      payload: eventData
    })

    console.log('Broadcast result:', broadcastResult)

    // Prepare goals-specific response
    const apiResponse = {
      success: true,
      status: 'goals',
      message: 'Life Goal Setting',
      action: 'show_goals_modal',
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      content: {
        title: 'What are your life goals?',
        description: 'Share your inner dreams and aspirations',
        type: 'goals',
        modalType: 'goals'
      },
      receivedPayload: payload,
      processedAs: {
        eventType: 'spline_goals_trigger',
        modalType: 'goals',
        uiAction: 'show_goals'
      }
    }

    console.log('=== GOALS API RESPONSE ===')
    console.log(JSON.stringify(apiResponse, null, 2))

    return new Response(
      JSON.stringify(apiResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN GOALS WEBHOOK ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'goals-webhook'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})