import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DifyResponse {
  is_drifting: boolean;
  actual_current_task: string;
  reasons: string;
  user_mood?: string | null;
  mood_reason?: string | null;
}

interface SessionHeartbeatResponse {
  success: boolean;
  is_drifting: boolean;
  reason: string;
  actual_task: string;
  user_mood?: string | null;
  mood_reason?: string | null;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Dify API configuration
    const difyApiUrl = Deno.env.get('DIFY_API_URL')
    const difyApiKey = Deno.env.get('DIFY_API_KEY')

    if (!difyApiUrl || !difyApiKey) {
      throw new Error('Dify API configuration missing')
    }

    // Parse form data
    const formData = await req.formData()
    const sessionId = formData.get('sessionId') as string
    const cameraImage = formData.get('cameraImage') as File
    const screenImage = formData.get('screenImage') as File

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    if (!cameraImage && !screenImage) {
      throw new Error('At least one image (camera or screen) is required')
    }

    console.log('📊 Processing heartbeat for session:', sessionId)

    // Step 1: Fetch session context from database
    const { data: sessionData, error: sessionError } = await supabase
      .from('sailing_sessions')
      .select(`
        id,
        user_id,
        task_id,
        state,
        users (
          id,
          guiding_star
        ),
        tasks (
          id,
          title,
          description
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      throw new Error(`Session not found: ${sessionError?.message}`)
    }

    const userGoal = sessionData.users?.guiding_star || 'No specific goal set'
    const taskName = sessionData.tasks?.title || 'No specific task'
    const taskDescription = sessionData.tasks?.description || ''

    console.log('📋 Session context:', { userGoal, taskName, sessionId })

    // Step 2: Upload images to temporary storage
    const timestamp = Date.now()
    const userId = sessionData.user_id
    
    let cameraImageUrl = ''
    let screenImageUrl = ''

    if (cameraImage) {
      const cameraPath = `${userId}/${sessionId}/camera_${timestamp}.jpg`
      const { data: cameraUpload, error: cameraError } = await supabase.storage
        .from('heartbeat-temp-media')
        .upload(cameraPath, cameraImage, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (cameraError) {
        console.error('Camera upload error:', cameraError)
      } else {
        const { data: cameraUrlData } = supabase.storage
          .from('heartbeat-temp-media')
          .getPublicUrl(cameraPath)
        cameraImageUrl = cameraUrlData.publicUrl
        console.log('📷 Camera image uploaded:', cameraImageUrl)
      }
    }

    if (screenImage) {
      const screenPath = `${userId}/${sessionId}/screen_${timestamp}.jpg`
      const { data: screenUpload, error: screenError } = await supabase.storage
        .from('heartbeat-temp-media')
        .upload(screenPath, screenImage, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (screenError) {
        console.error('Screen upload error:', screenError)
      } else {
        const { data: screenUrlData } = supabase.storage
          .from('heartbeat-temp-media')
          .getPublicUrl(screenPath)
        screenImageUrl = screenUrlData.publicUrl
        console.log('🖥️ Screen image uploaded:', screenImageUrl)
      }
    }

    // Step 3: Call Dify API for focus analysis
    const difyPayload = {
      inputs: {
        user_goal: userGoal,
        task_name: taskName,
        task_description: taskDescription,
        ...(cameraImageUrl && {
          user_video_image: {
            transfer_method: 'remote_url',
            url: cameraImageUrl,
            type: 'image'
          }
        }),
        ...(screenImageUrl && {
          screenshot_image: {
            transfer_method: 'remote_url', 
            url: screenImageUrl,
            type: 'image'
          }
        })
      },
      response_mode: 'blocking',
      user: `user_${userId}`
    }

    console.log('🤖 Calling Dify API with payload:', JSON.stringify(difyPayload, null, 2))

    const difyResponse = await fetch(difyApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(difyPayload)
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      throw new Error(`Dify API error: ${difyResponse.status} - ${errorText}`)
    }

    const difyResult = await difyResponse.json()
    console.log('🤖 Dify response:', difyResult)

    // Parse Dify response
    let analysisResult: DifyResponse
    
    try {
      // Try to parse as direct JSON first
      if (typeof difyResult.data?.outputs?.result === 'string') {
        analysisResult = JSON.parse(difyResult.data.outputs.result)
      } else if (difyResult.data?.outputs?.result) {
        analysisResult = difyResult.data.outputs.result
      } else {
        throw new Error('Invalid Dify response format')
      }
    } catch (parseError) {
      console.error('Error parsing Dify response:', parseError)
      // Fallback: assume user is focused if parsing fails
      analysisResult = {
        is_drifting: false,
        actual_current_task: taskName,
        reasons: 'Analysis unavailable - assuming focused',
        user_mood: null,
        mood_reason: null
      }
    }

    // Step 4: Log to drift_events table
    const { error: insertError } = await supabase
      .from('drift_events')
      .insert({
        session_id: sessionId,
        user_id: userId,
        is_drifting: analysisResult.is_drifting,
        reason: analysisResult.reasons,
        actual_task: analysisResult.actual_current_task,
        user_mood: analysisResult.user_mood || null,
        mood_reason: analysisResult.mood_reason || null,
        intervention_triggered: false
      })

    if (insertError) {
      console.error('Error inserting drift event:', insertError)
      throw insertError
    }

    // Step 5: Update session state
    const newSessionState = analysisResult.is_drifting ? 'drifting' : 'active'
    
    const { error: updateError } = await supabase
      .from('sailing_sessions')
      .update({ state: newSessionState })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session state:', updateError)
      // Don't throw here - the drift event was logged successfully
    }

    // Step 6: Schedule cleanup of uploaded images (optional - lifecycle policy handles this)
    // We could implement a cleanup function here, but the bucket lifecycle policy is more reliable

    const response: SessionHeartbeatResponse = {
      success: true,
      is_drifting: analysisResult.is_drifting,
      reason: analysisResult.reasons,
      actual_task: analysisResult.actual_current_task,
      user_mood: analysisResult.user_mood,
      mood_reason: analysisResult.mood_reason,
      message: analysisResult.is_drifting 
        ? 'Drift detected - monitoring continues' 
        : 'User focused - good work!'
    }

    console.log('✅ Heartbeat processed successfully:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ Session heartbeat error:', error)
    
    const errorResponse = {
      success: false,
      error: error.message,
      message: 'Failed to process heartbeat'
    }

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 