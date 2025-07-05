/*
# Seagull Webhook Edge Function

This Edge Function handles Spline API calls for the "Seagull Voice Assistant" feature.
When called, it triggers the seagull panel with automatic voice interaction on the frontend.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/seagull-webhook
- Method: POST
- Triggers: SeagullPanel with automatic voice interaction
- Expected payload: {"numbaer5": 0} (as per your curl command)
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SeagullWebhookPayload {
  numbaer5?: number;
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
    let payload: SeagullWebhookPayload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
      }
    } catch (error) {
      // If JSON parsing fails, continue with empty payload
      console.log('No JSON payload or invalid JSON, continuing with empty payload')
    }

    console.log('=== SEAGULL WEBHOOK CALLED ===')
    console.log('Payload received:', JSON.stringify(payload, null, 2))
    console.log('Timestamp:', new Date().toISOString())
    console.log('Expected numbaer5 value:', payload.numbaer5)

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
        apiEndpoint: 'seagull-webhook',
        timestamp: new Date().toISOString(),
        source: 'seagull-webhook',
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
      receivedPayload: payload,
      processedAs: {
        eventType: 'spline_seagull_trigger',
        modalType: 'seagull',
        uiAction: 'show_seagull',
        voiceActivated: true
      }
    }

    console.log('=== SEAGULL API RESPONSE ===')
    console.log(JSON.stringify(apiResponse, null, 2))

    return new Response(
      JSON.stringify(apiResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN SEAGULL WEBHOOK ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'seagull-webhook'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})