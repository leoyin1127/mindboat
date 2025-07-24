import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DriftSession {
  session_id: string;
  user_id: string;
  consecutive_drifts: number;
  latest_drift_id: string;
}

interface MonitorResponse {
  success: boolean;
  message: string;
  interventions_triggered: number;
  sessions_checked: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Starting deep drift monitoring check...')

    // Step 1: Find all active sessions that have recent drift events
    // First get active sessions
    const { data: activeSessions, error: sessionError } = await supabase
      .from('sailing_sessions')
      .select('id, user_id, state')
      .eq('state', 'active')

    if (sessionError) {
      throw new Error(`Error fetching active sessions: ${sessionError.message}`)
    }

    if (!activeSessions || activeSessions.length === 0) {
      console.log('✅ No active sessions found')
      return new Response(JSON.stringify({
        success: true,
        message: 'No active sessions to monitor',
        interventions_triggered: 0,
        sessions_checked: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Check all active sessions for drift events
    console.log(`📊 Checking ${activeSessions.length} active sessions for drift events`)

    let interventionsTriggered = 0
    const sessionsToCheck: DriftSession[] = []

    // Step 2: For each active session, check for drift events
    for (const session of activeSessions) {
      // Get the last 5 drift events for this session, ordered by most recent first
      const { data: recentDrifts, error: driftError } = await supabase
        .from('drift_events')
        .select('id, is_drifting, intervention_triggered, created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (driftError) {
        console.error(`Error fetching drift events for session ${session.id}:`, driftError)
        continue
      }

      if (!recentDrifts || recentDrifts.length === 0) {
        console.log(`No drift events found for session ${session.id}`)
        continue
      }

      // Count consecutive drifts from the most recent event backwards
      let consecutiveDrifts = 0
      for (const drift of recentDrifts) {
        if (drift.is_drifting) {
          consecutiveDrifts++
        } else {
          break // Stop counting if we hit a non-drift event
        }
      }

      console.log(`Session ${session.id}: ${consecutiveDrifts} consecutive drifts`)

      // Step 3: Check if intervention should be triggered
      // Check if there's already an active Seagull panel for this session
      const { data: existingEvent, error: eventError } = await supabase
        .from('frontend_events')
        .select('id, created_at')
        .eq('user_id', session.user_id)
        .eq('event_name', 'show_seagull_modal')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (!eventError && existingEvent) {
        console.log(`Session ${session.id}: Seagull intervention already active (triggered ${existingEvent.created_at})`)
        continue // Skip this session - intervention already active
      }
      
      // Look for ANY drift event that hasn't triggered an intervention yet
      for (const drift of recentDrifts) {
        if (drift.is_drifting && !drift.intervention_triggered) {
          console.log(`Session ${session.id}: Found untriggered drift event ${drift.id}`)
          sessionsToCheck.push({
            session_id: session.id,
            user_id: session.user_id,
            consecutive_drifts: consecutiveDrifts,
            latest_drift_id: drift.id
          })
          break // Only trigger one intervention per session per run
        }
      }
    }

    // Step 4: Trigger interventions for qualifying sessions
    for (const sessionInfo of sessionsToCheck) {
      try {
        console.log(`🚨 Triggering intervention for session ${sessionInfo.session_id} (${sessionInfo.consecutive_drifts} consecutive drifts)`)

        // Step 4.1: Call the new drift-intervention function with TTS
        const interventionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/drift-intervention`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            user_id: sessionInfo.user_id,
            consecutive_drifts: sessionInfo.consecutive_drifts,
            test_mode: false
          })
        })

        let interventionData: any = null
        if (interventionResponse.ok) {
          interventionData = await interventionResponse.json()
          console.log(`✅ AI intervention generated for session ${sessionInfo.session_id}`)
        } else {
          console.error(`Failed to generate AI intervention for session ${sessionInfo.session_id}:`, interventionResponse.status)
          // Continue with fallback broadcast
        }

        // Step 4.2: Broadcast deep drift detection event on the session's Realtime channel
        const channelName = `session:${sessionInfo.session_id}`

        const { error: broadcastError } = await supabase
          .channel(channelName)
          .send({
            type: 'broadcast',
            event: 'deep_drift_detected',
            payload: {
              session_id: sessionInfo.session_id,
              user_id: sessionInfo.user_id,
              consecutive_drifts: sessionInfo.consecutive_drifts,
              message: interventionData?.intervention_message ||
                `Deep drift detected after ${sessionInfo.consecutive_drifts} consecutive minutes. AI intervention activated.`,
              audio_url: interventionData?.audio_url || null,
              audio_data: interventionData?.audio_data || null,
              tts_success: interventionData?.tts_success || false,
              timestamp: new Date().toISOString()
            }
          })

        if (broadcastError) {
          console.error(`Error broadcasting to channel ${channelName}:`, broadcastError)
          continue
        }

        // Step 4.3: Trigger Seagull panel by inserting into frontend_events
        const { error: frontendEventError } = await supabase
          .from('frontend_events')
          .insert({
            user_id: sessionInfo.user_id,
            event_name: 'show_seagull_modal',
            event_data: {
              modalType: 'seagull',
              seagullMessage: interventionData?.intervention_message ||
                `Captain, I've noticed you've been drifting for ${sessionInfo.consecutive_drifts} minutes. Let's get back on course together.`,
              isDriftIntervention: true,
              consecutiveDrifts: sessionInfo.consecutive_drifts,
              audio_url: interventionData?.audio_url || null,
              audio_data: interventionData?.audio_data || null,
              tts_success: interventionData?.tts_success || false,
              source: 'deep-drift-monitor'
            }
          })

        if (frontendEventError) {
          console.error(`Error inserting frontend event for session ${sessionInfo.session_id}:`, frontendEventError)
          // Continue with the process even if frontend event insertion fails
        } else {
          console.log(`✅ Frontend event inserted to trigger Seagull panel for session ${sessionInfo.session_id}`)
        }

        // Step 4.4: Mark the latest drift event as having triggered an intervention
        const { error: updateError } = await supabase
          .from('drift_events')
          .update({ intervention_triggered: true })
          .eq('id', sessionInfo.latest_drift_id)

        if (updateError) {
          console.error(`Error updating drift event ${sessionInfo.latest_drift_id}:`, updateError)
          continue
        }

        interventionsTriggered++
        console.log(`✅ Intervention triggered successfully for session ${sessionInfo.session_id}`)

      } catch (error) {
        console.error(`Error triggering intervention for session ${sessionInfo.session_id}:`, error)
      }
    }

    const response: MonitorResponse = {
      success: true,
      message: `Deep drift monitoring completed. ${interventionsTriggered} interventions triggered.`,
      interventions_triggered: interventionsTriggered,
      sessions_checked: activeSessions.length
    }

    console.log('✅ Deep drift monitoring completed:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ Deep drift monitoring error:', error)

    const errorResponse = {
      success: false,
      error: error.message,
      message: 'Failed to complete deep drift monitoring'
    }

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 