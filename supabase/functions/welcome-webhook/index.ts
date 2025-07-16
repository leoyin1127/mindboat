/*
# Welcome Webhook Edge Function

This Edge Function handles Spline API calls for the "Welcome Journey" feature.
When called, it triggers the welcome modal on the frontend.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/welcome-webhook
- Method: POST
- Triggers: Welcome modal with "Welcome Aboard" content
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WelcomeWebhookPayload {
  [key: string]: any;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Initialize Supabase client using environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set!')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the incoming JSON payload from the request, allow empty body
    let payload: WelcomeWebhookPayload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
        console.log('Received webhook with payload:', payload)
      } else {
        console.log('Received webhook with empty payload.')
      }
    } catch (e) {
      console.warn('Could not parse JSON payload, proceeding with empty payload.', e.message)
    }
    
    // Define the event name and the data for the frontend
    const eventName = 'show_welcome_modal'
    const eventData = {
      title: 'Welcome Aboard',
      description: 'The system uses sensors to monitor whether you are currently doing something important. When you do things related to your goals, different winds of intention will blow, pushing your little boat forward and helping you reach your destination.',
      modalType: 'welcome',
      timestamp: new Date().toISOString(),
      source: 'welcome-webhook',
      originalPayload: payload
    }

    console.log(`Inserting event '${eventName}' into 'frontend_events' table.`)

    // Insert a record into the 'frontend_events' table.
    const { data, error } = await supabase
      .from('frontend_events')
      .insert({
        event_name: eventName,
        event_data: eventData,
      })
      .select()

    // Handle potential errors during insertion
    if (error) {
      console.error('Error inserting event into Supabase:', error)
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Event inserted successfully:', data)

    // Return a success response back to the caller (e.g., Spline)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Event triggered successfully in the frontend.',
        triggeredEvent: {
          eventName: eventName,
          modalType: eventData.modalType,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    // Catch any other errors (e.g., JSON parsing, missing env vars)
    console.error('An unexpected error occurred in the Edge Function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})