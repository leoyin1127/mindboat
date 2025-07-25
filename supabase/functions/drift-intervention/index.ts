/*
# Drift Intervention Edge Function - FR-2.4 Implementation

This Edge Function implements AI-powered drift intervention using Dify and ElevenLabs TTS.
It's triggered when users have been drifting for 5+ consecutive minutes.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/drift-intervention
- Method: POST
- Content-Type: application/json
- Body: JSON with session data and drift context
- Returns: AI intervention message with TTS audio

## Expected JSON body:
- session_id: string (UUID of active session)
- user_id: string (UUID of user)
- consecutive_drifts: number (number of consecutive drift minutes)
- drift_context: object (optional context about drift)
- test_mode: boolean (optional, for testing without actual drift)
*/

import { createClient } from 'npm:@supabase/supabase-js@2'
import { convertTextToSpeech, createAudioDataURL } from '../_shared/elevenlabs.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Dify API configuration for FR-2.4
const FR24_DIFY_API_URL = Deno.env.get('FR24_DIFY_API_URL') || 'http://164579e467f4.ngrok-free.app/v1'
const FR24_DIFY_API_KEY = Deno.env.get('FR24_DIFY_API_KEY') ?? ''

interface DriftInterventionRequest {
    session_id: string
    user_id: string
    consecutive_drifts: number
    drift_context?: {
        last_drift_reason?: string
        current_task?: string
        user_goal?: string
    }
    test_mode?: boolean
}

interface DriftInterventionResponse {
    success: boolean
    intervention_message: string
    audio_url?: string
    audio_data?: string
    tts_success: boolean
    tts_error?: string
    conversation_id?: string
    message_id?: string
    test_mode?: boolean
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

        // Parse JSON body
        let body: DriftInterventionRequest
        try {
            body = await req.json()
        } catch (error) {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON payload' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        console.log('=== DRIFT INTERVENTION REQUEST ===')
        console.log('Request body:', {
            session_id: body.session_id,
            user_id: body.user_id,
            consecutive_drifts: body.consecutive_drifts,
            test_mode: body.test_mode || false,
            drift_context: body.drift_context
        })

        const { session_id, user_id, consecutive_drifts, drift_context, test_mode = false } = body

        // Validate input
        if (!session_id || !user_id || !consecutive_drifts) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: session_id, user_id, consecutive_drifts' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Step 1: Gather context from database
        const { data: sessionData, error: sessionError } = await supabase
            .from('sailing_sessions')
            .select(`
        id,
        user_id,
        task_id,
        state,
        started_at,
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
            .eq('id', session_id)
            .single()

        if (sessionError || !sessionData) {
            console.error('Session not found:', sessionError)
            return new Response(
                JSON.stringify({ error: 'Session not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Step 2: Prepare context for Dify API
        const userGoal = sessionData.users?.guiding_star || 'No specific goal set'
        const taskTitle = sessionData.tasks?.title || 'No specific task'
        const taskDescription = sessionData.tasks?.description || ''
        const sessionDuration = sessionData.started_at ?
            Math.floor((Date.now() - new Date(sessionData.started_at).getTime()) / 60000) : 0

        // Get recent drift events for more context
        const { data: recentDrifts } = await supabase
            .from('drift_events')
            .select('drift_reason, actual_task, created_at')
            .eq('session_id', session_id)
            .eq('is_drifting', true)
            .order('created_at', { ascending: false })
            .limit(5)

        const heartbeatRecord = recentDrifts?.map(drift =>
            `${drift.created_at}: ${drift.drift_reason} (doing: ${drift.actual_task})`
        ).join('\n') || 'No recent drift history'

        // Step 3: Prepare FR2.4 Dify API payload
        const difyPayload = {
            inputs: {
                heartbeat_record: heartbeatRecord, // Correct field name per FR2.4 docs
                user_goal: userGoal,
                UUID: user_id.substring(0, 256) // Ensure max 256 chars as per FR2.4 docs
            },
            query: `I was distracted while working just now and it took some effort to bring me back on track. I've been drifting for ${consecutive_drifts} minutes consecutively.`,
            user: user_id,
            response_mode: 'streaming'
        }

        // Check if FR2.4 API is configured
        if (!FR24_DIFY_API_KEY) {
            console.error('❌ FR24_DIFY_API_KEY not configured')
            return new Response(
                JSON.stringify({ error: 'FR2.4 API key not configured' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        console.log('🤖 Calling FR2.4 Dify AI for drift intervention...')
        console.log('Dify payload:', JSON.stringify(difyPayload, null, 2))

        // Step 4: Call FR2.4 Dify API
        const apiUrl = `${FR24_DIFY_API_URL.replace(/\/$/, '')}/chat-messages`
        console.log('🔗 Calling FR2.4 API:', apiUrl)
        
        const difyResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FR24_DIFY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(difyPayload)
        })

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text()
            console.error('Dify API error:', difyResponse.status, errorText)
            throw new Error(`Dify API error: ${difyResponse.status} - ${errorText}`)
        }

        // Step 5: Parse streaming response
        const reader = difyResponse.body?.getReader()
        const decoder = new TextDecoder()
        let interventionMessage = ''
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
                                interventionMessage += data.answer || ''
                                conversationId = data.conversation_id || ''
                                messageId = data.id || ''
                            } else if (data.event === 'message_end') {
                                // Final message data
                                const messageData = JSON.parse(data.data)
                                interventionMessage = messageData.answer || interventionMessage
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

        // Fallback message if AI response is empty
        if (!interventionMessage.trim()) {
            interventionMessage = `Captain, I've noticed you've been drifting for ${consecutive_drifts} minutes. Let's get back on course and focus on ${taskTitle}. You're doing great - just need to steer back towards your goal!`
        }

        console.log('✅ Dify AI intervention response:', interventionMessage.substring(0, 100) + '...')

        // Step 6: Convert to speech using ElevenLabs
        console.log('🔊 Converting intervention to speech...')
        const ttsResult = await convertTextToSpeech(interventionMessage)

        // Step 7: Log the intervention
        if (!test_mode) {
            const { error: logError } = await supabase
                .from('ai_conversations')
                .insert({
                    user_id: user_id,
                    session_id: session_id,
                    messages: [
                        {
                            role: 'system',
                            content: `Drift intervention triggered after ${consecutive_drifts} consecutive minutes`,
                            timestamp: new Date().toISOString()
                        },
                        {
                            role: 'assistant',
                            content: interventionMessage,
                            timestamp: new Date().toISOString()
                        }
                    ],
                    context: {
                        consecutive_drifts,
                        task_title: taskTitle,
                        user_goal: userGoal,
                        session_duration: sessionDuration,
                        drift_context: drift_context
                    }
                })

            if (logError) {
                console.error('Failed to log intervention:', logError)
            }
        }

        // Step 8: Prepare response
        const response: DriftInterventionResponse = {
            success: true,
            intervention_message: interventionMessage,
            audio_url: ttsResult.audioData ? createAudioDataURL(ttsResult.audioData) : undefined,
            audio_data: ttsResult.audioData,
            tts_success: ttsResult.success,
            tts_error: ttsResult.error,
            conversation_id: conversationId,
            message_id: messageId,
            test_mode: test_mode
        }

        console.log('=== DRIFT INTERVENTION RESPONSE ===')
        console.log('Response:', {
            success: response.success,
            message_length: response.intervention_message.length,
            has_audio: !!response.audio_data,
            tts_success: response.tts_success,
            test_mode: response.test_mode
        })

        return new Response(
            JSON.stringify(response),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )

    } catch (error) {
        console.error('=== ERROR IN DRIFT INTERVENTION ===')
        console.error('Error details:', error)

        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                endpoint: 'drift-intervention'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
}) 