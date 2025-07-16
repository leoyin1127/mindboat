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
  drift_reason: string;
  actual_task: string;
  user_mood?: string | null;
  mood_reason?: string | null;
  message: string;
}

// Helper function to convert data URL to Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/data:(.+);base64/)?.[1] || 'image/jpeg'
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

// Helper function to upload image to Supabase Storage and return public URL
async function uploadImageToStorage(
  supabase: any, 
  imageB64: string, 
  userId: string, 
  type: 'camera' | 'screen'
): Promise<string | null> {
  try {
    // 1. Convert base64 Data URL to a Blob (reusing existing dataUrlToBlob)
    const imageBlob = dataUrlToBlob(imageB64)
    
    console.log(`📤 Uploading ${type} image to storage - Size: ${(imageBlob.size / 1024 / 1024).toFixed(2)} MB`)
    
    // Size guard - reject if over 3 MB
    if (imageBlob.size > 3 * 1024 * 1024) {
      throw new Error(`Image too large: ${(imageBlob.size / 1024 / 1024).toFixed(2)} MB (max 3 MB)`)
    }
    
    // 2. Define a unique, organized file path
    const filePath = `${userId}/${type}-${Date.now()}.png`

    // 3. Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('heartbeat-images')
      .upload(filePath, imageBlob)

    if (uploadError) {
      console.error(`Storage upload failed for ${type}:`, uploadError)
      return null
    }

    // 4. Get the public URL of the successfully uploaded file
    const { data } = supabase.storage
      .from('heartbeat-images')
      .getPublicUrl(filePath)
      
    console.log(`✅ ${type} image uploaded successfully to: ${data.publicUrl}`)
    return data.publicUrl
    
  } catch (error) {
    console.error(`❌ Storage upload failed for ${type} image:`, error)
    return null
  }
}

// Helper function to clean up uploaded images in case of Dify API failure
async function cleanupUploadedImages(supabase: any, imageUrls: string[]) {
  for (const url of imageUrls) {
    if (!url) continue
    try {
      // Extract file path from public URL
      const urlParts = url.split('/storage/v1/object/public/heartbeat-images/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage
          .from('heartbeat-images')
          .remove([filePath])
        console.log(`🧹 Cleaned up image: ${filePath}`)
      }
    } catch (error) {
      console.error('Error cleaning up image:', error)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify Supabase client is initialized correctly
    try {
      // Simple health check query
      const { data, error } = await supabase.from('_health').select('*').limit(1)
      if (error) {
        console.warn('Supabase client health check failed:', error.message)、
        throw new Error(error.message)
        // Continue execution as the table might not exist, but client could still be working
      } else {
        console.log('✅ Supabase client initialized successfully')
      }
    } catch (healthCheckError) {
      console.warn('Supabase client health check error:', healthCheckError)
      throw new Error('Supabase client Health Check Error')
      // Continue execution as this is just a verification step
    }

    // Get Dify API configuration
    const difyApiUrl = Deno.env.get('DIFY_API_URL')
    const difyApiKey = Deno.env.get('DIFY_API_KEY')

    if (!difyApiUrl || !difyApiKey) {
      throw new Error('Dify API configuration missing')
    }

    // Parse JSON body
    const body = await req.json()
    const { sessionId, cameraImage, screenImage } = body

    console.log('📊 DEBUG: Received heartbeat data:', {
      sessionId,
      hasCamera: !!cameraImage,
      hasScreen: !!screenImage,
      cameraSize: cameraImage ? `${Math.round(cameraImage.length / 1024)}KB` : 'N/A',
      screenSize: screenImage ? `${Math.round(screenImage.length / 1024)}KB` : 'N/A'
    })

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

    console.log('📋 Step 1: Session context:', { userGoal, taskName, sessionId })

    // Step 2: Upload images to Supabase Storage and get public URLs
    const uploadPromises: Promise<string | null>[] = []
    if (cameraImage) {
      console.log('Uploading camera image')
      uploadPromises.push(uploadImageToStorage(supabase, cameraImage, `user_${userId}`, 'camera'))
    } else {
      console.log('No camera image')
      uploadPromises.push(Promise.resolve(null))
    }
    
    if (screenImage) {
      console.log('Uploading screen image')
      uploadPromises.push(uploadImageToStorage(supabase, screenImage, `user_${userId}`, 'screen'))
    } else {
      console.log('No screen image')
      uploadPromises.push(Promise.resolve(null))
    }

    const [cameraImageUrl, screenImageUrl] = await Promise.all(uploadPromises)
    
    console.log('📤 Step 2: Images uploaded to storage:', { cameraImageUrl, screenImageUrl })

    // Check if we have any valid uploads
    if (!cameraImageUrl && !screenImageUrl) {
      console.warn('⚠️ No images uploaded successfully, returning default focused state')
      
      // Log a drift event with no media available
      const { error: insertError } = await supabase
        .from('drift_events')
        .insert({
          session_id: sessionId,
          user_id: userId,
          is_drifting: false,
          drift_reason: 'No media available for analysis',
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
        drift_reason: 'No media available for analysis',
        actual_task: taskName,
        user_mood: null,
        mood_reason: null,
        message: 'Heartbeat received but no media available - assuming focused'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Step 3: Call Dify API for focus analysis using image URLs
    const difyPayload = {
      inputs: {
        goal_text: userGoal,
        task_name: taskName,
        task_name2: taskDescription,
        ...(cameraImageUrl && { user_video_image: cameraImageUrl }),
        ...(screenImageUrl && { screenshot_image: screenImageUrl })
      },
      response_mode: 'blocking',
      user: `user_${userId}`
    }

    console.log('🤖 Step 3: Calling Dify API with payload:', JSON.stringify(difyPayload, null, 2))

    let difyResult
    let uploadedUrls = [cameraImageUrl, screenImageUrl].filter((url): url is string => Boolean(url))

    try {
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

      difyResult = await difyResponse.json()
      console.log('🤖 Dify response:', difyResult)

    } catch (difyError) {
      console.error('❌ Dify API call failed:', difyError)
      
      // Clean up uploaded images since Dify call failed
      await cleanupUploadedImages(supabase, uploadedUrls)
      
      // Return a fallback response
      const fallbackResponse: SessionHeartbeatResponse = {
        success: true,
        is_drifting: false,
        drift_reason: 'Analysis service unavailable - assuming focused',
        actual_task: taskName,
        user_mood: null,
        mood_reason: null,
        message: 'Heartbeat processed but analysis unavailable - assuming focused'
      }

      // Log drift event with fallback data
      await supabase
        .from('drift_events')
        .insert({
          session_id: sessionId,
          user_id: userId,
          is_drifting: false,
          drift_reason: 'Analysis service unavailable',
          actual_task: taskName,
          user_mood: null,
          mood_reason: null,
          intervention_triggered: false
        })

      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

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
        drift_reason: analysisResult.reasons,
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
      drift_reason: analysisResult.reasons,
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