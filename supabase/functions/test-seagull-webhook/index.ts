/*
# Test Seagull Webhook Edge Function

This Edge Function is for testing the seagull panel functionality.
It broadcasts a seagull event to the realtime channel.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/test-seagull-webhook
- Method: POST
- Triggers: Seagull panel with voice interaction
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Parse the request body (optional)
    let payload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
      }
    } catch (error) {
      // If JSON parsing fails, continue with empty payload
      console.log('No JSON payload or invalid JSON, continuing with empty payload')
    }

    console.log('=== TEST SEAGULL WEBHOOK CALLED ===')
    console.log('Payload received:', JSON.stringify(payload, null, 2))
    console.log('Timestamp:', new Date().toISOString())

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the seagull event data
    const eventData = {
      type: 'spline_seagull_trigger',
      payload: {
        ...payload,
        modalType: 'seagull',
        uiAction: 'show_seagull',
        message: 'Captain Voice Assistant Activated',
        apiEndpoint: 'test-seagull-webhook',
        timestamp: new Date().toISOString(),
        source: 'test-seagull-webhook',
        voiceInteraction: true,
        seagullMessage: "Captain, it seems we've veered off course. Let me check on our current situation."
      },
      timestamp: new Date().toISOString(),
      source: 'spline'
    }

    console.log('=== BROADCASTING SEAGULL EVENT ===')
    console.log('Event data:', JSON.stringify(eventData, null, 2))

    // Broadcast to realtime channel
    const channel = supabase.channel('spline-events')
    
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'spline_interaction',
      payload: eventData
    })

    console.log('Broadcast result:', broadcastResult)

    // Prepare seagull-specific response
    const apiResponse = {
      success: true,
      status: 'seagull_activated',
      message: 'Captain Voice Assistant Activated',
      action: 'show_seagull_panel',
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      content: {
        title: "Captain's Voice Assistant",
        description: "Automatic voice interaction initiated",
        type: 'seagull',
        modalType: 'seagull',
        voiceInteraction: true,
        seagullMessage: "Captain, it seems we've veered off course. Let me check on our current situation."
      },
      receivedPayload: payload
    }

    console.log('=== TEST SEAGULL API RESPONSE ===')
    console.log(JSON.stringify(apiResponse, null, 2))

    return new Response(
      JSON.stringify(apiResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN TEST SEAGULL WEBHOOK ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'test-seagull-webhook'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})