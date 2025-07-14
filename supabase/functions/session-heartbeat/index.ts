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

// Helper function to upload a single image to Dify
async function uploadImageToDify(base64Image: string, userId: string, imageType: 'camera' | 'screen'): Promise<string | null> {
  const DIFY_API_KEY = Deno.env.get('DIFY_API_KEY')!
  const DIFY_API_URL = Deno.env.get('DIFY_API_URL')!

  try {
    console.log(`📤 Uploading ${imageType} image to Dify for user ${userId}`)
    
    // Convert base64 data URI to a Blob
    const fetchRes = await fetch(base64Image)
    const blob = await fetchRes.blob()
    
    console.log(`📊 Blob info - Type: ${blob.type}, Size: ${blob.size} bytes (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
    
    // Size guard - reject if over 1.5 MB
    if (blob.size > 1.5 * 1024 * 1024) {
      throw new Error(`Image too large: ${(blob.size / 1024 / 1024).toFixed(2)} MB (max 1.5 MB)`)
    }
    
    // Generate filename that matches blob MIME type
    const extension = blob.type === 'image/png' ? 'png'
                     : blob.type === 'image/webp' ? 'webp'
                     : 'jpg'
    const filename = `heartbeat_${imageType}.${extension}`
    
    const formData = new FormData()
    formData.append('file', blob, filename)
    formData.append('user', userId)
    
    console.log(`📋 FormData keys: ${Array.from(formData.keys()).join(', ')}, filename: ${filename}`)

    const response = await fetch(`${DIFY_API_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Dify file upload failed (${response.status}): ${errorText}`)
    }

    const result = await response.json()
    console.log(`✅ ${imageType} image uploaded successfully, file ID: ${result.id}`)
    return result.id
    
  } catch (difyErr) {
    console.error(`❌ Dify upload failed for ${imageType} image:`, difyErr)
    return null // Let heartbeat continue with other image
  }
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

    // Parse JSON body instead of FormData
    const body = await req.json()
    const { sessionId, cameraImage, screenImage } = body

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
    const userId = sessionData.user_id

    console.log('📋 Session context:', { userGoal, taskName, sessionId })

    // Step 2: Upload images directly to Dify
    const fileIds = await Promise.all([
      cameraImage ? uploadImageToDify(cameraImage, `user_${userId}`, 'camera') : Promise.resolve(null),
      screenImage ? uploadImageToDify(screenImage, `user_${userId}`, 'screen') : Promise.resolve(null),
    ])
    
    const [cameraFileId, screenFileId] = fileIds
    console.log('📤 Images uploaded to Dify:', { cameraFileId, screenFileId })

    // Check if we have any valid uploads
    if (!cameraFileId && !screenFileId) {
      console.warn('⚠️ No images uploaded successfully, returning default focused state')
      
      // Log a drift event with no media available
      const { error: insertError } = await supabase
        .from('drift_events')
        .insert({
          session_id: sessionId,
          user_id: userId,
          is_drifting: false,
          reason: 'No media available for analysis',
          actual_task: taskName,
          user_mood: null,
          mood_reason: null,
          intervention_triggered: false
        })

      if (insertError) {
        console.error('Error inserting drift event:', insertError)
      }

      return new Response(JSON.stringify({
        success: true,
        is_drifting: false,
        reason: 'No media available for analysis',
        actual_task: taskName,
        user_mood: null,
        mood_reason: null,
        message: 'Heartbeat received but no media available - assuming focused'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Step 3: Call Dify API for focus analysis using file IDs
    const difyPayload = {
      inputs: {
        user_goal: userGoal,
        task_name: taskName,
        task_description: taskDescription,
        ...(cameraFileId && {
          user_video_image: {
            transfer_method: 'local_file',
            upload_file_id: cameraFileId,
            type: 'image'
          }
        }),
        ...(screenFileId && {
          screenshot_image: {
            transfer_method: 'local_file', 
            upload_file_id: screenFileId,
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