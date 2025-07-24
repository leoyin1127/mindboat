/*
# Sailing Summary Edge Function

This Edge Function generates sailing summary data including an image URL and summary text.
It's called when a user ends their voyage to provide reflection and insights.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/sailing-summary
- Method: POST
- Body: { taskId: string, sessionData: object }
- Returns: { imageUrl: string, summaryText: string }
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SailingSummaryRequest {
  taskId: string;
  sessionData: {
    startTime: string;
    taskTitle: string;
    taskCategory: string;
    sessionId?: string;
    [key: string]: any;
  };
}

interface SailingSummaryResponse {
  imageUrl: string;
  summaryText: string;
}

// Helper function to collect session data for DIFY workflow
async function collectSessionData(supabase: any, sessionId: string): Promise<{conversation: string, heartbeat: string, task_motivation: string}> {
  // Get AI conversations
  const { data: conversations, error: convError } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // Get drift events (heartbeat logs)
  const { data: driftEvents, error: driftError } = await supabase
    .from('drift_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // Get task motivation
  const { data: sessionInfo, error: sessionError } = await supabase
    .from('sailing_sessions')
    .select(`
      *,
      tasks!inner(title, description, motivation)
    `)
    .eq('id', sessionId)
    .single();

  // Format conversations
  let conversationText = "No conversations recorded";
  if (conversations && conversations.length > 0) {
    conversationText = conversations
      .map(conv => `${conv.role}: ${conv.message}`)
      .join('\n');
  }

  // Format drift events (heartbeat logs)
  let heartbeatText = "No drift events recorded";
  if (driftEvents && driftEvents.length > 0) {
    heartbeatText = driftEvents
      .map(event => `${new Date(event.created_at).toISOString()}: ${event.is_drifting ? 'DRIFT' : 'FOCUS'} - ${event.description || 'No description'}`)
      .join('\n');
  }

  // Format task motivation
  let taskMotivation = "No task motivation found";
  if (sessionInfo && !sessionError && sessionInfo.tasks) {
    const task = sessionInfo.tasks;
    taskMotivation = `Title: ${task.title || 'Untitled'}\nDescription: ${task.description || 'No description'}\nMotivation: ${task.motivation || 'No motivation provided'}`;
  }

  return {
    conversation: conversationText,
    heartbeat: heartbeatText,
    task_motivation: taskMotivation
  };
}

// Helper function to call DIFY workflow for session summary
async function generateSessionSummary(sessionData: {conversation: string, heartbeat: string, task_motivation: string}, userId: string): Promise<string> {
  const difyApiUrl = Deno.env.get('DIFY_API_URL');
  const difyApiKey = Deno.env.get('FR311_DIFY_API_KEY');

  if (!difyApiUrl || !difyApiKey) {
    console.warn('DIFY API not configured, using fallback summary');
    return "Session completed successfully. DIFY workflow not configured for detailed analysis.";
  }

  try {
    const workflowUrl = `${difyApiUrl}/v1/workflows/run`;
    
    const difyResponse = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          conversation: sessionData.conversation,
          heartbeat: sessionData.heartbeat,
          task_motivation: sessionData.task_motivation
        },
        response_mode: "streaming",
        user: userId
      })
    });

    if (difyResponse.ok) {
      const responseText = await difyResponse.text();
      console.log('DIFY Raw Response:', responseText);
      
      try {
        // First try parsing as direct JSON
        const jsonData = JSON.parse(responseText);
        console.log('DIFY Parsed JSON:', jsonData);
        
        if (jsonData.session_conclusion) {
          console.log('Found session_conclusion:', jsonData.session_conclusion);
          return jsonData.session_conclusion;
        }
        
        // Fallback to other possible output fields
        if (jsonData.data?.outputs?.text) {
          console.log('Found data.outputs.text:', jsonData.data.outputs.text);
          return jsonData.data.outputs.text;
        }
        
        console.log('No recognized output field found in JSON');
        return "Session analysis completed, but no summary text was generated.";
        
      } catch (directParseError) {
        console.log('Direct JSON parse failed, trying SSE format...');
        
        // Parse SSE format - extract JSON from data: lines
        const lines = responseText.split('\n');
        let finalResult = null;
        let textChunks = []; // Collect text_chunk events
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.substring(6)); // Remove "data: " prefix
              console.log('SSE Event:', jsonData.event, 'Keys:', Object.keys(jsonData));
              
              // Collect text_chunk events to build the complete response
              if (jsonData.event === 'text_chunk' && jsonData.data?.text) {
                console.log('Found text_chunk:', jsonData.data.text.substring(0, 100) + '...');
                textChunks.push(jsonData.data.text);
              }
              // Look for workflow_finished event with data.outputs
              else if (jsonData.event === 'workflow_finished' && jsonData.data?.outputs?.session_conclusion) {
                console.log('Found workflow_finished with session_conclusion');
                finalResult = jsonData.data.outputs.session_conclusion;
              }
              // Look for direct session_conclusion
              else if (jsonData.session_conclusion) {
                console.log('Found direct session_conclusion');
                finalResult = jsonData.session_conclusion;
              }
              // Look for node_finished events with outputs.text (like the LLM output)
              else if (jsonData.event === 'node_finished' && jsonData.data?.outputs?.text) {
                console.log('Found node_finished with text output');
                // This might be intermediate output, but save it as fallback
                if (!finalResult) {
                  finalResult = jsonData.data.outputs.text;
                }
              }
              // Fallback to other possible output fields
              else if (jsonData.data?.outputs?.text) {
                console.log('Found fallback data.outputs.text');
                if (!finalResult) {
                  finalResult = jsonData.data.outputs.text;
                }
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
        
        // If we collected text chunks, combine them as the final result
        console.log('Total text chunks collected:', textChunks.length);
        if (textChunks.length > 0) {
          console.log('Using combined text_chunks, total chunks:', textChunks.length);
          finalResult = textChunks.join('');
        }
        
        console.log('Final result length:', finalResult ? finalResult.length : 0);
        return finalResult || "Session analysis completed, but no summary text was generated.";
      }
    } else {
      console.error('DIFY workflow failed:', await difyResponse.text());
      return "Session completed. Unable to generate detailed summary at this time.";
    }
  } catch (error) {
    console.error('DIFY workflow error:', error);
    return "Session completed successfully. Summary generation encountered an error.";
  }
}

// Mock data for different task categories
const mockSummaryData = {
  writing: {
    imageUrls: [
      'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    summaryTemplates: [
      "Today, you sailed {duration} hours toward the continent of your thesis. Along the way, you were easily drawn to social media notifications, spending {distraction_time} minutes on it. If you'd like to dive deeper into your reflections, check out the Seagull's Human Observation Log. Keep it up—the journey itself is the reward!",
      "Your writing voyage lasted {duration} hours today. You navigated through {task_title} with determination, though email distractions pulled you off course for {distraction_time} minutes. The Seagull's Human Observation Log holds deeper insights into your creative process.",
      "A productive {duration}-hour journey through the seas of {task_title}. You showed great focus, with only brief detours to check your phone for {distraction_time} minutes. Your dedication to the writing craft is evident—explore more in the Seagull's Human Observation Log."
    ]
  },
  design: {
    imageUrls: [
      'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    summaryTemplates: [
      "Your design journey spanned {duration} hours today, crafting beautiful interfaces for {task_title}. Creative inspiration led you to browse design galleries for {distraction_time} minutes—sometimes wandering feeds the soul. Dive deeper into your creative process with the Seagull's Human Observation Log.",
      "A {duration}-hour voyage through the realm of {task_title} design. Your artistic vision remained strong, with only {distraction_time} minutes spent exploring color palettes online. The Seagull's Human Observation Log captures more about your creative flow.",
      "Today's {duration}-hour design expedition for {task_title} was filled with innovation. You stayed remarkably focused, with just {distraction_time} minutes of inspiration-seeking on design platforms. Check the Seagull's Human Observation Log for deeper creative insights."
    ]
  },
  learning: {
    imageUrls: [
      'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    summaryTemplates: [
      "Your learning voyage lasted {duration} hours, diving deep into {task_title}. Knowledge-seeking led you to explore related tutorials for {distraction_time} minutes—curiosity is a navigator's best friend. The Seagull's Human Observation Log holds more learning insights.",
      "A focused {duration}-hour journey through {task_title} concepts. Your dedication to understanding was impressive, with only {distraction_time} minutes spent on supplementary research. Explore your learning patterns in the Seagull's Human Observation Log.",
      "Today's {duration}-hour educational expedition through {task_title} showed great progress. You maintained excellent concentration, with brief {distraction_time}-minute detours to clarify concepts. The Seagull's Human Observation Log reveals more about your learning style."
    ]
  },
  personal: {
    imageUrls: [
      'https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    summaryTemplates: [
      "Your personal growth journey spanned {duration} hours today, focusing on {task_title}. Mindful moments included {distraction_time} minutes of gentle mind-wandering—sometimes the soul needs to breathe. The Seagull's Human Observation Log captures your inner voyage.",
      "A meaningful {duration}-hour journey of {task_title} practice. Your commitment to self-care was evident, with only {distraction_time} minutes of peaceful distraction. Discover more about your personal growth in the Seagull's Human Observation Log.",
      "Today's {duration}-hour personal development voyage through {task_title} was transformative. You showed remarkable presence, with just {distraction_time} minutes of gentle mental wandering. The Seagull's Human Observation Log holds deeper reflections."
    ]
  }
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

    // Parse the request body
    let requestData: SailingSummaryRequest
    try {
      requestData = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('=== SAILING SUMMARY REQUEST ===')
    console.log('Request data:', JSON.stringify(requestData, null, 2))

    // Initialize Supabase client (for future database operations)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract session data
    const { taskId, sessionData } = requestData
    const { taskTitle, taskCategory, durationSeconds, focusSeconds, driftSeconds, driftCount, sessionId } = sessionData

    // Calculate actual session duration from real data
    const actualDurationSeconds = Number(durationSeconds) || 0
    const actualFocusSeconds = Number(focusSeconds) || 0
    const actualDriftSeconds = Number(driftSeconds) || 0
    const actualDriftCount = Number(driftCount) || 0

    // Convert to hours and minutes for display
    const sessionDurationHours = (actualDurationSeconds / 3600)
    const driftTimeMinutes = Math.floor(actualDriftSeconds / 60)

    console.log('=== ACTUAL SESSION DATA ===')
    console.log('Duration (seconds):', actualDurationSeconds)
    console.log('Duration (hours):', sessionDurationHours.toFixed(2))
    console.log('Focus (seconds):', actualFocusSeconds)
    console.log('Drift (seconds):', actualDriftSeconds)
    console.log('Drift (minutes):', driftTimeMinutes)
    console.log('Drift count:', actualDriftCount)
    console.log('Session ID:', sessionId)

    // Get category-specific data or default to writing
    const categoryData = mockSummaryData[taskCategory as keyof typeof mockSummaryData] || mockSummaryData.writing

    // Select random image
    const randomImageIndex = Math.floor(Math.random() * categoryData.imageUrls.length)
    const selectedImageUrl = categoryData.imageUrls[randomImageIndex]

    // Generate AI-powered summary using DIFY workflow
    let summaryText = "Your voyage has been completed, but we were unable to generate a detailed summary at this time.";
    
    if (sessionId) {
      console.log('Generating DIFY summary for session:', sessionId);
      try {
        // Collect session data for DIFY analysis
        const collectedData = await collectSessionData(supabase, sessionId);
        console.log('Collected session data:', collectedData);
        
        // Get user ID for DIFY
        const { data: sessionInfo } = await supabase
          .from('sailing_sessions')
          .select('users!inner(id)')
          .eq('id', sessionId)
          .single();
        
        const userId = sessionInfo?.users?.id || 'anonymous';
        console.log('User ID for DIFY:', userId);
        
        // Generate summary via DIFY workflow
        summaryText = await generateSessionSummary(collectedData, userId);
        console.log('DIFY summary generated:', summaryText.substring(0, 200) + '...');
        
      } catch (error) {
        console.error('Error generating DIFY summary:', error);
        // Keep fallback summary text
      }
    } else {
      console.warn('No sessionId provided, using fallback summary');
    }

    // Prepare response
    const response: SailingSummaryResponse = {
      imageUrl: selectedImageUrl,
      summaryText: summaryText
    }

    console.log('=== SAILING SUMMARY RESPONSE ===')
    console.log('Response:', JSON.stringify(response, null, 2))

    // TODO: In a real implementation, you might:
    // 1. Store the session data in the database
    // 2. Generate or fetch actual journey visualization images
    // 3. Use AI to generate personalized summary text
    // 4. Track user progress and patterns over time

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN SAILING SUMMARY ===')
    console.error('Error details:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'sailing-summary'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})