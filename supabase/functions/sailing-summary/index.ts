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
    [key: string]: any;
  };
}

interface SailingSummaryResponse {
  imageUrl: string;
  summaryText: string;
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
    const { taskTitle, taskCategory } = sessionData

    // Calculate session duration (mock calculation)
    const sessionDuration = Math.random() * 3 + 0.5 // 0.5 to 3.5 hours
    const distractionTime = Math.floor(Math.random() * 60 + 10) // 10 to 70 minutes

    // Get category-specific data or default to writing
    const categoryData = mockSummaryData[taskCategory as keyof typeof mockSummaryData] || mockSummaryData.writing

    // Select random image and summary template
    const randomImageIndex = Math.floor(Math.random() * categoryData.imageUrls.length)
    const randomTemplateIndex = Math.floor(Math.random() * categoryData.summaryTemplates.length)

    const selectedImageUrl = categoryData.imageUrls[randomImageIndex]
    const selectedTemplate = categoryData.summaryTemplates[randomTemplateIndex]

    // Replace template variables
    const summaryText = selectedTemplate
      .replace(/{duration}/g, sessionDuration.toFixed(1))
      .replace(/{task_title}/g, taskTitle)
      .replace(/{distraction_time}/g, distractionTime.toString())

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