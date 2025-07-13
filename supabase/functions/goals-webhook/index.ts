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

    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    let userToken: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7)
    }

    // Initialize Supabase client with service role for database operations
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // If goal_text is provided, store it in the database
    if (payload.goal) {
      // Validate goal_text is not empty
      if (!payload.goal.trim()) {
        return new Response(
          JSON.stringify({ error: 'Goal text cannot be empty' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // Get user from JWT token
      if (!userToken) {
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
              Authorization: `Bearer ${userToken}`
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
      
      // Insert the goal into the Goals table
      const { data: goalData, error: goalError } = await serviceRoleClient
        .from('goals')
        .insert({
          user_id: user.id,
          goal_text: payload.goal.trim()
        })
      
      if (goalError) {
        console.error('Error inserting goal:', goalError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save goal',
            message: goalError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      console.log('Goal saved successfully:', goalData)
      
      // Trigger the Spline webhook after saving the goal
      try {
        const splineWebhookToken = Deno.env.get('SPLINE_GOAL_WEBHOOK_TOKEN')
        if (!splineWebhookToken) {
          console.warn('SPLINE_GOAL_WEBHOOK_TOKEN environment variable is not set')
        }
        
        const splineResponse = await fetch('https://hooks.spline.design/gpRFQacPBZs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': splineWebhookToken || 'QgxEuHaAD0fyTDdEAYvVH_ynObU2SUnWdip86Gb1RJE'
          },
          body: JSON.stringify({ number: 0 })
        })
        
        const splineData = await splineResponse.json()
        console.log('Spline webhook response:', splineData)
        
        // Return success response with Spline webhook result
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Goal saved and Spline webhook triggered',
            goalSaved: true,
            splineWebhookResult: splineData
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } catch (error) {
        console.error('Error triggering Spline webhook:', error)
        // Still return success for the goal saving part
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Goal saved but Spline webhook failed',
            goalSaved: true,
            splineWebhookError: error.message
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // If no goal_text is provided, proceed with the original functionality
    // to trigger the life goals modal on the frontend
    
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