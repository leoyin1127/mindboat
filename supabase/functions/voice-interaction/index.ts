/*
# Voice Interaction Edge Function - FR-2.3 Implementation

This Edge Function implements the "Ask Seagull" conversational voice chat feature.
It receives audio from the SeagullPanel, processes it with Dify AI, and returns TTS audio.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/voice-interaction
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with audio file and metadata
- Returns: AI response with TTS audio

## Expected FormData fields:
- audio: Blob (audio file in webm format)
- timestamp: string (ISO timestamp)
- type: 'chunk' | 'final' (indicates if this is a streaming chunk or final audio)
- query: string (optional text query instead of audio)
*/

import { convertTextToSpeech, createAudioDataURL } from '../_shared/elevenlabs.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Dify API configuration for FR-2.3
const DIFY_API_URL = Deno.env.get('DIFY_API_URL') ?? ''
// Try FR23_DIFY_API_KEY first, fallback to generic DIFY_API_KEY
const DIFY_API_KEY = Deno.env.get('FR23_DIFY_API_KEY') || Deno.env.get('DIFY_API_KEY') || ''

interface VoiceInteractionMetadata {
  timestamp: string;
  type: 'chunk' | 'final';
  audioSize?: number;
  duration?: number;
}

// Removed unused interfaces - streaming parsing is handled inline

Deno.serve(async (req: Request) => {
  // Debug endpoint to check configuration
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/debug')) {
    return new Response(
      JSON.stringify({
        env: {
          DIFY_API_URL: Deno.env.get('DIFY_API_URL') || 'NOT_SET',
          FR23_DIFY_API_KEY: Deno.env.get('FR23_DIFY_API_KEY') ? 'SET' : 'NOT_SET',
          hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
          hasElevenLabs: !!Deno.env.get('ELEVENLABS_API_KEY')
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

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

    console.log('=== VOICE INTERACTION REQUEST ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Content-Type:', req.headers.get('content-type'))

    // Parse FormData with error handling
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (error) {
      console.error('Failed to parse FormData:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Body can not be decoded as form data',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          endpoint: 'voice-interaction'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract audio file and metadata
    const audioFile = formData.get('audio') as File | null
    const timestamp = formData.get('timestamp') as string | null
    const type = formData.get('type') as 'chunk' | 'final' | null

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log received data
    console.log('=== AUDIO DATA RECEIVED ===')
    console.log('Audio file size:', audioFile.size, 'bytes')
    console.log('Audio file type:', audioFile.type)
    console.log('Audio file name:', audioFile.name)
    console.log('Timestamp:', timestamp)
    console.log('Type:', type)

    // Convert audio to ArrayBuffer for processing (if needed)
    const audioBuffer = await audioFile.arrayBuffer()
    console.log('Audio buffer length:', audioBuffer.byteLength)

    // Prepare metadata
    const metadata: VoiceInteractionMetadata = {
      timestamp: timestamp || new Date().toISOString(),
      type: type || 'chunk',
      audioSize: audioFile.size,
      duration: audioBuffer.byteLength / (16000 * 2) // Rough estimate for 16kHz 16-bit audio
    }

    console.log('=== PROCESSING AUDIO ===')
    console.log('Metadata:', JSON.stringify(metadata, null, 2))

    // For audio chunks, just acknowledge receipt and return quickly
    if (type === 'chunk') {
      console.log('📦 Audio chunk received, storing for later processing')
      return new Response(
        JSON.stringify({
          success: true,
          type: 'chunk_received',
          timestamp: metadata.timestamp,
          size: metadata.audioSize
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Step 1: Convert audio to text using OpenAI Whisper API
    let userQuery = formData.get('query') as string | null
    
    if (!userQuery && audioFile.size > 0) {
      console.log('🎵 Converting audio to text with OpenAI Whisper...')
      
      const whisperFormData = new FormData()
      whisperFormData.append('file', audioFile, 'audio.webm')
      whisperFormData.append('model', 'whisper-1')
      
      try {
        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          },
          body: whisperFormData
        })
        
        if (whisperResponse.ok) {
          const whisperResult = await whisperResponse.json()
          userQuery = whisperResult.text?.trim() || ''
          console.log('✅ Whisper transcription:', userQuery || '[empty/unclear speech]')
        } else {
          const errorText = await whisperResponse.text()
          console.error('❌ Whisper API error:', whisperResponse.status, errorText)
          // This is a real API error - should be shown to user
          throw new Error(`Whisper API error ${whisperResponse.status}: ${errorText}`)
        }
      } catch (error) {
        console.error('❌ Whisper API call failed:', error)
        // This is a real error that should be shown to the user
        return new Response(
          JSON.stringify({ 
            error: 'Speech recognition failed',
            message: error instanceof Error ? error.message : 'Unable to process audio. Please try again.',
            timestamp: new Date().toISOString(),
            requiresRetry: true
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }
    
    // Always proceed with whatever we have - let AI handle empty/unclear speech
    // userQuery could be empty string if no speech was detected - that's fine
    console.log('📝 Final user query for AI:', userQuery || '[empty speech - letting AI handle]')
    
    // Ensure userQuery is a valid string and sanitize it
    if (typeof userQuery !== 'string') {
      userQuery = ''
    } else {
      // Remove any potential null bytes or control characters that might break JSON
      userQuery = userQuery.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim()
    }

    // Extract conversation context from FormData
    const conversationId = formData.get('conversation_id') as string | null
    const turnNumber = parseInt(formData.get('turn_number') as string || '0')
    const conversationHistory = formData.get('conversation_history') as string | null
    const interventionContext = formData.get('intervention_context') as string | null
    
    // Extract new context information
    const contextType = formData.get('context_type') as string | null
    const contextData = formData.get('context_data') as string | null
    
    console.log('=== CONVERSATION CONTEXT ===')
    console.log('User query:', userQuery)
    console.log('Conversation ID:', conversationId || 'new conversation')
    console.log('Turn number:', turnNumber)
    console.log('Has conversation history:', !!conversationHistory)
    console.log('Is drift intervention:', !!interventionContext)
    
    // Parse conversation history for context
    let parsedHistory = []
    if (conversationHistory) {
      try {
        parsedHistory = JSON.parse(conversationHistory)
        console.log('Conversation history turns:', parsedHistory.length)
      } catch (e) {
        console.warn('Failed to parse conversation history:', e)
      }
    }
    
    // Parse intervention context if available
    let parsedInterventionContext = null
    if (interventionContext) {
      try {
        parsedInterventionContext = JSON.parse(interventionContext)
        console.log('Drift intervention context:', parsedInterventionContext)
      } catch (e) {
        console.warn('Failed to parse intervention context:', e)
      }
    }

    // Step 2: Process with Dify AI chat with conversation context
    console.log('🤖 Calling Dify AI chat with conversation context...')
    
    // Check if Dify API is configured
    if (!DIFY_API_URL || !DIFY_API_KEY) {
      console.error('❌ Dify API not configured:', { 
        hasUrl: !!DIFY_API_URL, 
        hasKey: !!DIFY_API_KEY,
        url: DIFY_API_URL || 'missing'
      })
      throw new Error('Dify API configuration missing')
    }
    
    // Log the environment for debugging
    console.log('🔧 Dify configuration:', {
      apiUrl: DIFY_API_URL,
      hasApiKey: !!DIFY_API_KEY,
      keyEnvVar: 'FR23_DIFY_API_KEY',
      apiKeyLength: DIFY_API_KEY.length,
      apiKeyPrefix: DIFY_API_KEY.substring(0, 10) + '...',
      fullUrl: `${DIFY_API_URL.replace(/\/$/, '')}/v1/chat-messages`
    })

    // Extract user_id early to use in Dify payload
    const userIdFromForm = formData.get('user_id') as string
    const sessionIdFromForm = formData.get('session_id') as string
    
    const difyPayload: any = {
      inputs: {
        user_tasks: contextType === 'drift_intervention' 
          ? `DRIFT INTERVENTION: User has been distracted. Context: ${contextData || 'Help user refocus'}`
          : '',
        Memory: parsedHistory.length > 0
          ? parsedHistory.map(turn => 
              `${turn.role}: ${turn.content}`
            ).join('\n')
          : ''
      },
      query: userQuery || '',
      user: userIdFromForm || parsedInterventionContext?.userId || 'anonymous',
      response_mode: 'streaming'
    }
    
    // Only include conversation_id if this is not the first turn
    // Dify will generate its own conversation_id on the first message
    if (conversationId && conversationId.trim() !== '' && turnNumber > 0) {
      difyPayload.conversation_id = conversationId
      console.log('📝 Using conversation ID for turn', turnNumber, ':', conversationId)
    } else if (turnNumber === 0) {
      console.log('🆕 First turn - letting Dify generate conversation ID')
    } else {
      console.log('⚠️ No conversation ID provided by frontend')
    }

    // Remove any trailing slash from DIFY_API_URL
    const cleanApiUrl = DIFY_API_URL.replace(/\/$/, '')
    
    // IMPORTANT: Check if the URL already includes /v1
    const finalUrl = cleanApiUrl.endsWith('/v1/chat-messages') 
      ? cleanApiUrl 
      : cleanApiUrl.endsWith('/v1')
        ? `${cleanApiUrl}/chat-messages`
        : `${cleanApiUrl}/v1/chat-messages`
    
    console.log('📤 Dify API request:', {
      url: finalUrl,
      originalUrl: DIFY_API_URL,
      cleanedUrl: cleanApiUrl,
      hasApiKey: !!DIFY_API_KEY,
      apiKeyPrefix: DIFY_API_KEY.substring(0, 10) + '...',
      payload: JSON.stringify(difyPayload, null, 2),
      userQuery: userQuery,
      userQueryLength: userQuery?.length || 0,
      hasTranscription: !!userQuery,
      whisperProcessed: audioFile.size > 0
    })
    
    const difyResponse = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify(difyPayload)
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error('❌ Dify API error response:', {
        status: difyResponse.status,
        statusText: difyResponse.statusText,
        errorBody: errorText,
        requestUrl: `${cleanApiUrl}/v1/chat-messages`,
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payloadSummary: {
          hasQuery: !!difyPayload.query,
          queryLength: difyPayload.query?.length || 0,
          hasConversationId: !!difyPayload.conversation_id,
          user: difyPayload.user
        }
      })
      throw new Error(`Dify API error: ${difyResponse.status} - ${difyResponse.statusText}`)
    }

    // Step 3: Parse streaming response
    const reader = difyResponse.body?.getReader()
    const decoder = new TextDecoder()
    let aiAnswer = ''
    let newConversationId = ''
    let messageId = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.event === 'message') {
                aiAnswer += data.answer || ''
                newConversationId = data.conversation_id || ''
                messageId = data.id || ''
              } else if (data.event === 'message_end') {
                // message_end event has the data directly, not nested
                newConversationId = data.conversation_id || newConversationId
                messageId = data.message_id || data.id || messageId
                // aiAnswer is already accumulated from message events
                break
              }
            } catch {
              console.warn('Failed to parse Dify response line:', line)
            }
          }
        }
      }
    }

    if (!aiAnswer.trim()) {
      aiAnswer = "I'm here to help you stay focused, Captain. What would you like to know?"
    }

    console.log('✅ Dify AI response:', aiAnswer.substring(0, 100) + '...')

    // Step 4: Store conversation in database
    console.log('💾 Storing conversation to database...')
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract user_id and session_id from intervention context or headers
    let userId = parsedInterventionContext?.userId || userIdFromForm || req.headers.get('x-user-id')
    let sessionId = parsedInterventionContext?.sessionId || sessionIdFromForm || req.headers.get('x-session-id')
    
    // If still no user ID, this is an error - we need proper user tracking
    if (!userId) {
      console.error('❌ No user ID provided - cannot store conversation')
      return new Response(
        JSON.stringify({ 
          error: 'User identification required',
          message: 'Cannot store conversation without user ID',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Prepare full conversation history including current turn
    const fullConversationHistory = [...parsedHistory]
    
    // Add current user turn
    fullConversationHistory.push({
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString()
    })
    
    // Add current AI response
    fullConversationHistory.push({
      role: 'assistant', 
      content: aiAnswer,
      timestamp: new Date().toISOString()
    })

    // Store/update conversation in database using UPSERT strategy
    // Use the conversation ID provided by frontend (or the one we generated in response)
    const effectiveConversationId = conversationId || newConversationId
    
    try {
      // If we have a conversation ID, try to update existing record first
      if (effectiveConversationId) {
        const { data: existingConversation } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('context->>conversation_id', effectiveConversationId)
          .single()
        
        if (existingConversation) {
          // Update existing conversation
          const { error: updateError } = await supabase
            .from('ai_conversations')
            .update({
              messages: fullConversationHistory,
              context: {
                conversation_id: effectiveConversationId,
                turn_number: turnNumber + 1,
                audio_duration: metadata.duration,
                audio_size: metadata.audioSize,
                intervention_context: parsedInterventionContext,
                whisper_transcription: userQuery !== formData.get('query'),
                last_updated: new Date().toISOString()
              }
            })
            .eq('id', existingConversation.id)
          
          if (updateError) {
            console.error('❌ Failed to update conversation:', updateError)
          } else {
            console.log('✅ Conversation updated successfully')
          }
        } else {
          // Create new conversation record
          const { error: insertError } = await supabase
            .from('ai_conversations')
            .insert({
              user_id: userId,
              session_id: sessionId,
              messages: fullConversationHistory,
              context: {
                conversation_id: effectiveConversationId,
                turn_number: turnNumber + 1,
                audio_duration: metadata.duration,
                audio_size: metadata.audioSize,
                intervention_context: parsedInterventionContext,
                whisper_transcription: userQuery !== formData.get('query')
              }
            })
          
          if (insertError) {
            console.error('❌ Failed to insert conversation:', insertError)
          } else {
            console.log('✅ New conversation created successfully')
          }
        }
      } else {
        // No conversation ID, create new record
        const { error: insertError } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: userId,
            session_id: sessionId,
            messages: fullConversationHistory,
            context: {
              conversation_id: crypto.randomUUID(),
              turn_number: turnNumber + 1,
              audio_duration: metadata.duration,
              audio_size: metadata.audioSize,
              intervention_context: parsedInterventionContext,
              whisper_transcription: userQuery !== formData.get('query')
            }
          })
        
        if (insertError) {
          console.error('❌ Failed to insert new conversation:', insertError)
        } else {
          console.log('✅ New conversation created successfully')
        }
      }
    } catch (error) {
      console.error('❌ Database storage error:', error)
    }

    // Step 5: Convert AI response to speech using ElevenLabs
    console.log('🔊 Converting response to speech...')
    
    let ttsResult = { success: false, error: null as string | null, audioData: null as string | null }
    
    try {
      ttsResult = await convertTextToSpeech(aiAnswer)
      
      if (!ttsResult.success) {
        console.error('TTS conversion failed:', ttsResult.error)
        // Continue without audio
      }
    } catch (ttsError) {
      console.error('TTS conversion error:', ttsError)
      ttsResult.error = ttsError instanceof Error ? ttsError.message : 'TTS conversion failed'
    }

    // Step 6: Prepare final response with conversation context
    const processingResult = {
      success: true,
      messageId: messageId || crypto.randomUUID(),
      conversationId: newConversationId || conversationId, // Use Dify's conversation ID if available, otherwise use the one sent by frontend
      turnNumber: turnNumber + 1, // Return the next turn number for the frontend
      timestamp: new Date().toISOString(),
      audioReceived: {
        size: audioFile.size,
        type: audioFile.type,
        duration: metadata.duration
      },
      metadata: metadata,
      transcription: userQuery, // In real implementation, this would be STT result
      conversationContext: {
        totalTurns: turnNumber + 1,
        isNewConversation: !conversationId,
        hasHistory: parsedHistory.length > 0
      },
      aiResponse: {
        text: aiAnswer,
        confidence: 0.95,
        intent: 'seagull_assistance',
        audioData: ttsResult.audioData || null,
        audioUrl: ttsResult.audioData ? createAudioDataURL(ttsResult.audioData) : null,
        ttsSuccess: ttsResult.success,
        ttsError: ttsResult.error || null,
        responseToTurn: turnNumber
      }
    }

    console.log('=== VOICE INTERACTION RESPONSE ===')
    console.log(JSON.stringify(processingResult, null, 2))

    return new Response(
      JSON.stringify(processingResult),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN VOICE INTERACTION ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Full error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'voice-interaction'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})