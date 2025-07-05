/*
# Journey Webhook Edge Function

This Edge Function handles Spline API calls for the "Journey Panel" feature.
When called, it triggers the journey panel on the frontend.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/journey-webhook
- Method: POST
- Triggers: Journey panel with task dashboard
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface JourneyWebhookPayload {
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
    let payload: JourneyWebhookPayload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
      }
    } catch (error) {
      // If JSON parsing fails, continue with empty payload
      console.log('No JSON payload or invalid JSON, continuing with empty payload')
    }

    console.log('=== JOURNEY WEBHOOK CALLED ===')
    console.log('Payload received:', JSON.stringify(payload, null, 2))
    console.log('Timestamp:', new Date().toISOString())

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the journey event data
    const eventData = {
      type: 'spline_journey_trigger',
      payload: {
        ...payload,
        number: 3, // Explicitly set for compatibility
        modalType: 'journey',
        uiAction: 'show_journey',
        message: 'Journey Panel',
        apiEndpoint: 'journey-webhook',
        timestamp: new Date().toISOString(),
        source: 'journey-webhook'
      },
      timestamp: new Date().toISOString(),
      source: 'spline'
    }

    console.log('=== BROADCASTING JOURNEY EVENT ===')
    console.log('Event data:', JSON.stringify(eventData, null, 2))

    // Broadcast to realtime channel
    const channel = supabase.channel('spline-events')
    
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'spline_interaction',
      payload: eventData
    })

    console.log('Broadcast result:', broadcastResult)

    // Prepare journey-specific response
    const apiResponse = {
      success: true,
      status: 'journey',
      message: 'Journey Panel',
      action: 'show_journey_panel',
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      content: {
        title: 'Journey Dashboard',
        description: 'Navigate your goals with intention',
        type: 'journey',
        modalType: 'journey'
      },
      receivedPayload: payload,
      processedAs: {
        eventType: 'spline_journey_trigger',
        modalType: 'journey',
        uiAction: 'show_journey'
      }
    }

    console.log('=== JOURNEY API RESPONSE ===')
    console.log(JSON.stringify(apiResponse, null, 2))

    return new Response(
      JSON.stringify(apiResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN JOURNEY WEBHOOK ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'journey-webhook'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})