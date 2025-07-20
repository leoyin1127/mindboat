import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Helper function to convert data URL to Blob
function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/data:(.+);base64/)?.[1] || 'image/jpeg';
  const bytes = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
  return new Blob([
    bytes
  ], {
    type: mime
  });
}
// NEW: Helper function to upload image directly to Dify
async function uploadImageToDify(imageB64, userId, type, difyApiUrl, difyApiKey) {
  try {
    // 1. Convert base64 Data URL to a Blob
    const imageBlob = dataUrlToBlob(imageB64);
    console.log(`📤 Uploading ${type} image to Dify - Size: ${(imageBlob.size / 1024 / 1024).toFixed(2)} MB`);
    // Size guard - reject if over 3 MB
    if (imageBlob.size > 3 * 1024 * 1024) {
      throw new Error(`Image too large: ${(imageBlob.size / 1024 / 1024).toFixed(2)} MB (max 3 MB)`);
    }
    // 2. Construct the Dify file upload URL
    const uploadUrl = `${difyApiUrl}files/upload`;
    console.log('uploadUrl', uploadUrl);
    console.log('difyApiURL', difyApiUrl);
    console.log('difyApiKey', difyApiKey);
    // console.log(111111, Deno.env.get('DIFY_API_URL'));
    // 3. Create FormData with the image and user identifier
    const formData = new FormData();
    formData.append('file', imageBlob, `${type}-${Date.now()}.png`);
    formData.append('user', `user_${userId}`);
    // 4. Upload to Dify
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dify file upload failed (${response.status}): ${errorText}`);
    }
    const result = await response.json();
    console.log(`✅ ${type} image uploaded successfully to Dify with ID: ${result.id}`);
    return result;
  } catch (error) {
    console.error(`❌ Dify upload failed for ${type} image:`, error);
    return null;
  }
}
// COMMENTED OUT: Helper function to upload image to Supabase Storage and return public URL
// async function uploadImageToStorage(
//   supabase: any, 
//   imageB64: string, 
//   userId: string, 
//   type: 'camera' | 'screen'
// ): Promise<string | null> {
//   try {
//     // 1. Convert base64 Data URL to a Blob (reusing existing dataUrlToBlob)
//     const imageBlob = dataUrlToBlob(imageB64)
//     
//     console.log(`📤 Uploading ${type} image to storage - Size: ${(imageBlob.size / 1024 / 1024).toFixed(2)} MB`)
//     
//     // Size guard - reject if over 3 MB
//     if (imageBlob.size > 3 * 1024 * 1024) {
//       throw new Error(`Image too large: ${(imageBlob.size / 1024 / 1024).toFixed(2)} MB (max 3 MB)`)
//     }
//     
//     // 2. Define a unique, organized file path
//     const filePath = `${userId}/${type}-${Date.now()}.png`
//     // 3. Upload the file to Supabase Storage
//     const { error: uploadError } = await supabase.storage
//       .from('heartbeat-images')
//       .upload(filePath, imageBlob)
//     if (uploadError) {
//       console.error(`Storage upload failed for ${type}:`, uploadError)
//       return null
//     }
//     // 4. Get the public URL of the successfully uploaded file
//     const { data } = supabase.storage
//       .from('heartbeat-images')
//       .getPublicUrl(filePath)
//     console.log(`✅ ${type} image uploaded successfully to: ${data.publicUrl}`)
//     return data.publicUrl
//   } catch (error) {
//     console.error(`❌ Storage upload failed for ${type} image:`, error)
//     return null
//   }
// }
// COMMENTED OUT: Helper function to clean up uploaded images in case of Dify API failure
// async function cleanupUploadedImages(supabase: any, imageUrls: string[]) {
//   for (const url of imageUrls) {
//     if (!url) continue
//     try {
//       // Extract file path from public URL
//       const urlParts = url.split('/storage/v1/object/public/heartbeat-images/')
//       if (urlParts.length > 1) {
//         const filePath = urlParts[1]
//         await supabase.storage
//           .from('heartbeat-images')
//           .remove([filePath])
//         console.log(`🧹 Cleaned up image: ${filePath}`)
//       }
//     } catch (error) {
//       console.error('Error cleaning up image:', error)
//     }
//   }
// }
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('supabaseUrl', supabaseUrl);
    console.log('supabaseServiceKey', supabaseServiceKey);
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get Dify API configuration
    const difyApiUrl = Deno.env.get('DIFY_API_URL');
    const difyApiKey = Deno.env.get('DIFY_API_KEY');
    if (!difyApiUrl || !difyApiKey) {
      throw new Error('Dify API configuration missing');
    }
    // Parse JSON body
    const body = await req.json();
    const { sessionId, cameraImage, screenImage } = body;
    console.log('📊 DEBUG: Received heartbeat data:', {
      sessionId,
      hasCamera: !!cameraImage,
      hasScreen: !!screenImage,
      cameraSize: cameraImage ? `${Math.round(cameraImage.length / 1024)}KB` : 'N/A',
      screenSize: screenImage ? `${Math.round(screenImage.length / 1024)}KB` : 'N/A'
    });
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    if (!cameraImage && !screenImage) {
      throw new Error('At least one image (camera or screen) is required');
    }
    console.log('📊 Processing heartbeat for session:', sessionId);
    
    // Step 0: Fetch previous drift state to track transitions
    const { data: lastDriftEvent, error: lastDriftError } = await supabase
      .from('drift_events')
      .select('is_drifting')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const wasPreviouslyDrifting = lastDriftEvent?.is_drifting || false;
    console.log('📊 Previous drift state:', wasPreviouslyDrifting);
    
    // Step 1: Fetch session context from database
    const { data: sessionData, error: sessionError } = await supabase.from('sailing_sessions').select(`
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
      `).eq('id', sessionId).single();
    if (sessionError || !sessionData) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }
    const userGoal = sessionData.users?.guiding_star || 'No specific goal set';
    const taskName = sessionData.tasks?.title || 'No specific task';
    const taskDescription = sessionData.tasks?.description || '';
    const userId = sessionData.user_id;
    console.log('📋 Step 1: Session context:', {
      userGoal,
      taskName,
      sessionId
    });
    // Step 2: Upload images directly to Dify and get file IDs
    const uploadPromises = [];
    if (cameraImage) {
      console.log('Uploading camera image to Dify');
      uploadPromises.push(uploadImageToDify(cameraImage, userId, 'camera', difyApiUrl, difyApiKey));
    } else {
      console.log('No camera image');
      uploadPromises.push(Promise.resolve(null));
    }
    if (screenImage) {
      console.log('Uploading screen image to Dify');
      uploadPromises.push(uploadImageToDify(screenImage, userId, 'screen', difyApiUrl, difyApiKey));
    } else {
      console.log('No screen image');
      uploadPromises.push(Promise.resolve(null));
    }
    const [difyCameraFile, difyScreenFile] = await Promise.all(uploadPromises);
    console.log('📤 Step 2: Images uploaded to Dify:', {
      cameraFileId: difyCameraFile?.id,
      screenFileId: difyScreenFile?.id
    });
    // Check if we have any valid uploads
    if (!difyCameraFile && !difyScreenFile) {
      console.warn('⚠️ No images uploaded successfully to Dify, returning default focused state');
      // Log a drift event with no media available
      const { error: insertError } = await supabase.from('drift_events').insert({
        session_id: sessionId,
        user_id: userId,
        is_drifting: false,
        drift_reason: 'No media available for analysis',
        actual_task: taskName,
        user_mood: null,
        mood_reason: null,
        intervention_triggered: false
      });
      if (insertError) {
        console.error('Error inserting drift event:', insertError);
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Step 3: Call Dify API for focus analysis using file IDs
    const difyPayload = {
      inputs: {
        goal_text: userGoal,
        task_name: taskName,
        task_name2: taskDescription,
        // Use the file IDs from the Dify upload response in correct array format
        ...difyCameraFile?.id && {
          user_video_image: [
            {
              transfer_method: "local_file",
              upload_file_id: difyCameraFile.id,
              type: "image"
            }
          ]
        },
        ...difyScreenFile?.id && {
          screenshot_image: [
            {
              transfer_method: "local_file",
              upload_file_id: difyScreenFile.id,
              type: "image"
            }
          ]
        }
      },
      response_mode: 'blocking',
      user: `user_${userId}`
    };
    console.log('🤖 Step 3: Calling Dify API with payload:', JSON.stringify(difyPayload, null, 2));
    let difyResult;
    // Note: No need to track uploaded URLs for cleanup since files are managed by Dify
    try {
      const url = `${difyApiUrl}workflows/run`;
      const difyResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(difyPayload)
      });
      if (!difyResponse.ok) {
        const errorText = await difyResponse.text();
        throw new Error(`Dify API error: ${difyResponse.status} - ${errorText}`);
      }
      difyResult = await difyResponse.json();
      console.log('🤖 Dify response:', JSON.stringify(difyResult, null, 2));
      console.log('🤖 Dify response data:', JSON.stringify(difyResult.data, null, 2));
      console.log('🤖 Dify response outputs:', JSON.stringify(difyResult.data?.outputs, null, 2));
    } catch (difyError) {
      console.error('❌ Dify API call failed:', difyError);
      // COMMENTED OUT: Clean up uploaded images since Dify call failed
      // await cleanupUploadedImages(supabase, uploadedUrls)
      // Return a fallback response
      const fallbackResponse = {
        success: true,
        is_drifting: false,
        drift_reason: 'Analysis service unavailable - assuming focused',
        actual_task: taskName,
        user_mood: null,
        mood_reason: null,
        message: 'Heartbeat processed but analysis unavailable - assuming focused'
      };
      // Log drift event with fallback data
      await supabase.from('drift_events').insert({
        session_id: sessionId,
        user_id: userId,
        is_drifting: false,
        drift_reason: 'Analysis service unavailable',
        actual_task: taskName,
        user_mood: null,
        mood_reason: null,
        intervention_triggered: false
      });
      return new Response(JSON.stringify(fallbackResponse), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Parse Dify response
    let analysisResult;
    try {
      console.log('📋 Parsing Dify response...');
      console.log('📋 difyResult.data exists:', !!difyResult.data);
      console.log('📋 difyResult.data.outputs exists:', !!difyResult.data?.outputs);
      console.log('📋 difyResult.data.outputs.text exists:', !!difyResult.data?.outputs?.text);
      console.log('📋 difyResult.data.outputs.text type:', typeof difyResult.data?.outputs?.text);
      // Extract result from Dify's text output format
      if (difyResult.data?.outputs?.text) {
        console.log('📋 Found text output, starting extraction...');
        const textOutput = difyResult.data.outputs.text;
        console.log('📋 Raw text output:', textOutput);
        try {
          // Remove markdown code block markers and extract JSON
          let jsonString = textOutput;
          // Remove ```json at the beginning and ``` at the end
          if (jsonString.includes('```json')) {
            jsonString = jsonString.replace(/```json\s*\n?/, '');
            console.log('📋 After removing ```json:', jsonString);
          }
          if (jsonString.includes('```')) {
            jsonString = jsonString.replace(/\n?\s*```$/, '');
            console.log('📋 After removing ```:', jsonString);
          }
          console.log('📋 Final JSON string to parse:', JSON.stringify(jsonString));
          // Parse the cleaned JSON
          analysisResult = JSON.parse(jsonString.trim());
          console.log('📋 Successfully parsed JSON:', analysisResult);
        } catch (textParseError) {
          console.error('❌ Error parsing text output:', textParseError);
          throw new Error(`Failed to parse text output: ${textParseError.message}`);
        }
      } else if (difyResult.data?.outputs?.result) {
        // Fallback: check for result field
        const result = difyResult.data.outputs.result;
        console.log('📋 Found result in data.outputs.result:', typeof result, result);
        if (typeof result === 'string') {
          analysisResult = JSON.parse(result);
        } else if (typeof result === 'object') {
          analysisResult = result;
        } else {
          throw new Error('Result is neither string nor object');
        }
      } else if (difyResult.outputs?.result) {
        // Alternative structure: outputs.result
        const result = difyResult.outputs.result;
        console.log('📋 Found result in outputs.result:', typeof result, result);
        if (typeof result === 'string') {
          analysisResult = JSON.parse(result);
        } else {
          analysisResult = result;
        }
      } else if (difyResult.data?.outputs) {
        // Check if the entire outputs object contains our expected fields
        const outputs = difyResult.data.outputs;
        console.log('📋 Checking outputs object:', outputs);
        if (outputs.is_drifting !== undefined) {
          analysisResult = outputs;
        } else {
          throw new Error('No valid result structure found in outputs');
        }
      } else {
        console.error('📋 No valid response structure found. Available keys:', Object.keys(difyResult));
        throw new Error('Invalid Dify response format - no recognized structure');
      }
      console.log('📋 Successfully parsed analysis result:', analysisResult);
      // Validate required fields
      if (analysisResult.is_drifting === undefined || !analysisResult.actual_current_task || !analysisResult.reasons) {
        console.warn('📋 Missing required fields in analysis result:', analysisResult);
        throw new Error('Analysis result missing required fields');
      }
    } catch (parseError) {
      console.error('❌ Error parsing Dify response:', parseError);
      console.error('❌ Raw Dify result:', JSON.stringify(difyResult, null, 2));
      // Fallback: assume user is focused if parsing fails
      analysisResult = {
        is_drifting: false,
        actual_current_task: taskName,
        reasons: `Analysis parsing failed: ${parseError.message}`,
        user_mood: null,
        mood_reason: null
      };
    }
    // Step 4: Log to drift_events table
    const { error: insertError } = await supabase.from('drift_events').insert({
      session_id: sessionId,
      user_id: userId,
      is_drifting: analysisResult.is_drifting,
      drift_reason: analysisResult.reasons,
      actual_task: analysisResult.actual_current_task,
      user_mood: analysisResult.user_mood || null,
      mood_reason: analysisResult.mood_reason || null,
      intervention_triggered: false
    });
    if (insertError) {
      console.error('Error inserting drift event:', insertError);
      throw insertError;
    }
    
    // Step 4.5: Update session drift statistics
    const isCurrentlyDrifting = analysisResult.is_drifting;
    const justStartedDrifting = !wasPreviouslyDrifting && isCurrentlyDrifting;
    const HEARTBEAT_INTERVAL_SECONDS = 30; // Heartbeat interval
    
    if (justStartedDrifting || isCurrentlyDrifting) {
      console.log('📊 Updating session drift statistics:', { justStartedDrifting, isCurrentlyDrifting });
      
      const updateData: any = {};
      
      // First, get current values to increment them
      const { data: currentSession } = await supabase
        .from('sailing_sessions')
        .select('drift_count, total_drift_seconds')
        .eq('id', sessionId)
        .single();
      
      if (justStartedDrifting) {
        // Increment drift_count only when starting a new drift
        updateData.drift_count = (currentSession?.drift_count || 0) + 1;
        console.log('📊 Incrementing drift count');
      }
      if (isCurrentlyDrifting) {
        // Add to total_drift_seconds every heartbeat while drifting
        updateData.total_drift_seconds = (currentSession?.total_drift_seconds || 0) + HEARTBEAT_INTERVAL_SECONDS;
        console.log('📊 Adding drift time:', HEARTBEAT_INTERVAL_SECONDS, 'seconds');
      }
      
      const { error: driftUpdateError } = await supabase
        .from('sailing_sessions')
        .update(updateData)
        .eq('id', sessionId);
      
      if (driftUpdateError) {
        console.error('Error updating session drift stats:', driftUpdateError);
      } else {
        console.log('✅ Session drift stats updated successfully');
      }
    }
    // Step 5: Update session state (keep as 'active' regardless of drift status)
    // Note: Drift status is tracked in drift_events table, session remains active
    const newSessionState = 'active';
    const { error: updateError } = await supabase.from('sailing_sessions').update({
      state: newSessionState
    }).eq('id', sessionId);
    if (updateError) {
      console.error('Error updating session state:', updateError);
    // Don't throw here - the drift event was logged successfully
    }
    const response = {
      success: true,
      is_drifting: analysisResult.is_drifting,
      drift_reason: analysisResult.reasons,
      actual_task: analysisResult.actual_current_task,
      user_mood: analysisResult.user_mood,
      mood_reason: analysisResult.mood_reason,
      message: analysisResult.is_drifting ? 'Drift detected - monitoring continues' : 'User focused - good work!'
    };
    console.log('✅ Heartbeat processed successfully:', response);
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Session heartbeat error:', error);
    const errorResponse = {
      success: false,
      error: error.message,
      message: 'Failed to process heartbeat'
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
