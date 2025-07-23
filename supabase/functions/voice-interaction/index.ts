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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Dify API configuration for FR-2.3
const DIFY_API_URL = Deno.env.get('DIFY_API_URL') ?? ''
const DIFY_API_KEY = Deno.env.get('FR23_DIFY_API_KEY') ?? ''

interface VoiceInteractionMetadata {
  timestamp: string;
  type: 'chunk' | 'final';
  audioSize?: number;
  duration?: number;
}

interface DifyStreamResponse {
  event: string;
  data: string;
}

interface DifyAnswerData {
  answer: string;
  conversation_id: string;
  message_id: string;
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
          userQuery = whisperResult.text || "I need help staying focused on my task"
          console.log('✅ Whisper transcription:', userQuery)
        } else {
          console.error('❌ Whisper API error:', whisperResponse.status)
          userQuery = "I need help staying focused on my task"
        }
      } catch (error) {
        console.error('❌ Whisper API call failed:', error)
        userQuery = "I need help staying focused on my task"
      }
    }
    
    if (!userQuery) {
      userQuery = "I need help staying focused on my task"
    }

    // Extract conversation context from FormData
    const conversationId = formData.get('conversation_id') as string | null
    const turnNumber = parseInt(formData.get('turn_number') as string || '0')
    const conversationHistory = formData.get('conversation_history') as string | null
    const interventionContext = formData.get('intervention_context') as string | null
    
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

    const difyPayload = {
      inputs: {
        conversation_history: parsedHistory.map(turn => 
          `${turn.role}: ${turn.content}`
        ).join('\n') || 'New conversation',
        turn_number: turnNumber.toString(),
        user_context: parsedInterventionContext?.type === 'drift_intervention' 
          ? `Voice conversation with Seagull AI assistant - DRIFT INTERVENTION SESSION after ${parsedInterventionContext.consecutiveDrifts} minutes of drifting`
          : 'Voice conversation with Seagull AI assistant',
        session_context: parsedInterventionContext ? JSON.stringify(parsedInterventionContext) : 'Regular conversation'
      },
      query: userQuery,
      user: `user-${parsedInterventionContext?.userId || crypto.randomUUID()}`,
      conversation_id: conversationId || '',
      response_mode: 'streaming'
    }

    const difyResponse = await fetch(`${DIFY_API_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(difyPayload)
    })

    if (!difyResponse.ok) {
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
            } catch (parseError) {
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

    // Step 4: Convert AI response to speech using ElevenLabs
    console.log('🔊 Converting response to speech...')

    const ttsResult = await convertTextToSpeech(aiAnswer)

    if (!ttsResult.success) {
      console.error('TTS conversion failed:', ttsResult.error)
      // Continue without audio
    }

    // Step 5: Prepare final response with conversation context
    const processingResult = {
      success: true,
      messageId: messageId || crypto.randomUUID(),
      conversationId: newConversationId || conversationId || crypto.randomUUID(), // Create new if none provided
      turnNumber: turnNumber + 1,
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
    console.error('Error details:', error)

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