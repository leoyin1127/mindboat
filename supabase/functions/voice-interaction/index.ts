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
const DIFY_API_URL = 'http://164579e467f4.ngrok-free.app/v1/chat-messages'
const DIFY_API_KEY = 'app-jM5m0R1bhDkZWsga8FAMy7Ub'

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

    // Parse FormData
    const formData = await req.formData()

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

    // Step 1: Convert audio to text using Web Speech API (client-side)
    // For now, we'll use a placeholder text since Web Speech API is client-side
    // In a real implementation, you'd use a server-side STT service

    // Extract text query from FormData if provided (for testing)
    const textQuery = formData.get('query') as string | null
    const userQuery = textQuery || "I need help staying focused on my task"

    console.log('User query:', userQuery)

    // Step 2: Process with Dify AI chat
    console.log('🤖 Calling Dify AI chat...')

    const difyPayload = {
      inputs: {},
      query: userQuery,
      user: `user-${crypto.randomUUID()}`,
      conversation_id: '',
      response_mode: 'streaming'
    }

    const difyResponse = await fetch(DIFY_API_URL, {
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
    let conversationId = ''
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
                conversationId = data.conversation_id || ''
                messageId = data.id || ''
              } else if (data.event === 'message_end') {
                // Final message data
                const messageData = JSON.parse(data.data)
                aiAnswer = messageData.answer || aiAnswer
                conversationId = messageData.conversation_id || conversationId
                messageId = messageData.id || messageId
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

    // Step 5: Prepare final response
    const processingResult = {
      success: true,
      messageId: messageId || crypto.randomUUID(),
      conversationId: conversationId,
      timestamp: new Date().toISOString(),
      audioReceived: {
        size: audioFile.size,
        type: audioFile.type,
        duration: metadata.duration
      },
      metadata: metadata,
      aiResponse: {
        text: aiAnswer,
        confidence: 0.95,
        intent: 'seagull_assistance',
        audioData: ttsResult.audioData || null,
        audioUrl: ttsResult.audioData ? createAudioDataURL(ttsResult.audioData) : null,
        ttsSuccess: ttsResult.success,
        ttsError: ttsResult.error || null
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