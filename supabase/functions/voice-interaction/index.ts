/*
# Voice Interaction Edge Function

This Edge Function serves as the backend interface for receiving recorded audio data 
from the SeagullPanel's continuous voice interaction system.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/voice-interaction
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with audio file and metadata
- Returns: Success response (placeholder for AI processing)

## Expected FormData fields:
- audio: Blob (audio file in webm format)
- timestamp: string (ISO timestamp)
- type: 'chunk' | 'final' (indicates if this is a streaming chunk or final audio)
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface VoiceInteractionMetadata {
  timestamp: string;
  type: 'chunk' | 'final';
  audioSize?: number;
  duration?: number;
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

    // TODO: Here you would integrate with your AI voice processing system
    // For example:
    // 1. Convert audio format if needed
    // 2. Send to speech-to-text service
    // 3. Process with AI dialogue system
    // 4. Generate response audio
    // 5. Stream back to client

    // Placeholder response - replace with actual AI processing
    const processingResult = {
      success: true,
      messageId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      audioReceived: {
        size: audioFile.size,
        type: audioFile.type,
        duration: metadata.duration
      },
      metadata: metadata,
      processing: {
        status: 'received',
        message: 'Audio data received and logged successfully',
        nextStep: 'Send to AI processing pipeline'
      },
      // Placeholder for AI response
      aiResponse: {
        text: "I've received your voice input, Captain. Processing your request...",
        confidence: 0.95,
        intent: 'navigation_check',
        responseAudio: null // Would contain generated audio URL in real implementation
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