/*
# Goals Webhook Edge Function

This Edge Function handles Spline API calls for the "Life Goals" feature.
When called, it triggers the life goals modal on the frontend.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/goals-webhook
- Method: POST
- Triggers: Life goals modal with goal input form
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GoalsWebhookPayload {
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

    // Parse the request body (optional for this endpoint)
    let payload: GoalsWebhookPayload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
      }
    } catch (error) {
      // If JSON parsing fails, continue with empty payload
      console.log('No JSON payload or invalid JSON, continuing with empty payload')
    }

    console.log('=== GOALS WEBHOOK CALLED ===')
    console.log('Payload received:', JSON.stringify(payload, null, 2))
    console.log('Timestamp:', new Date().toISOString())

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
    const channel = supabase.channel('spline-events')
    
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