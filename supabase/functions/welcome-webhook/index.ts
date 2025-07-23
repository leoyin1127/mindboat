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
  user_id?: string;
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

    // Try to get user_id from multiple sources
    let user_id = payload.user_id
    
    console.log('🔍 Payload user_id:', user_id)
    console.log('🔍 Headers x-user-id:', req.headers.get('x-user-id'))
    
    // If not provided in payload, try to extract from headers or other sources
    if (!user_id) {
      // Option 1: From custom header
      user_id = req.headers.get('x-user-id')
      console.log('📥 No user_id in payload, extracted from headers:', user_id)
    }
    
    // Option 2: Get the most recent active user from the database
    if (!user_id) {
      console.log('🔍 No user_id found, trying to get most recent active user...')
      try {
        const { data: recentUser, error } = await supabase
          .from('users')
          .select('id')
          .order('last_seen_at', { ascending: false })
          .limit(1)
          .single()
        
        if (!error && recentUser) {
          user_id = recentUser.id
          console.log('📥 Using most recent active user:', user_id)
        }
      } catch (e) {
        console.log('❌ Could not fetch recent user:', e.message)
      }
    }
    
    // Final check
    if (!user_id) {
      console.warn('⚠️ No user_id found in payload, headers, or database!')
    } else {
      console.log('✅ Using user_id:', user_id)
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

    console.log(`Inserting event '${eventName}' into 'frontend_events' table with user_id: ${user_id}`)

    // Insert a record into the 'frontend_events' table.
    const insertData = {
      event_name: eventName,
      event_data: eventData,
      user_id: user_id, // Use extracted user_id
    }
    
    console.log('📝 Insert data:', insertData)
    
    const { data, error } = await supabase
      .from('frontend_events')
      .insert(insertData)
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