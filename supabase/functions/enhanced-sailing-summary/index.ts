import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EnhancedSummaryRequest {
  voyageId: string;
  includeVisualElements: boolean;
  includeVoiceRecordings: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { voyageId, includeVisualElements = true, includeVoiceRecordings = false } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get voyage data
    const { data: voyage, error: voyageError } = await supabase
      .from('voyages')
      .select(`
        *,
        destinations (
          destination_name,
          description,
          color_theme
        ),
        distraction_events (*)
      `)
      .eq('id', voyageId)
      .single()

    if (voyageError) throw voyageError

    // Calculate voyage stats
    const duration = voyage.end_time 
      ? Math.floor((new Date(voyage.end_time).getTime() - new Date(voyage.start_time).getTime()) / 1000)
      : 0

    const distractionCount = voyage.distraction_events?.length || 0

    // Enhanced summary generation with min-d specific elements
    const category = voyage.destinations?.description || 'general'
    const taskTitle = voyage.destinations?.destination_name || 'Unknown Destination'

    // Generate image URL based on task category
    const imageUrls = {
      writing: [
        'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800',
      ],
      design: [
        'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800',
      ],
      learning: [
        'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=800',
      ],
      default: [
        'https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=800',
      ]
    }

    const categoryImages = imageUrls[category] || imageUrls.default
    const selectedImage = categoryImages[Math.floor(Math.random() * categoryImages.length)]

    // Enhanced summary text with min-d narrative style
    const summaryTemplates = [
      `Your voyage to ${taskTitle} lasted ${Math.floor(duration / 60)} minutes. Through ${distractionCount} gentle course corrections, you maintained focus on your destination. The Seagull observed your determination and noted it in their diary.`,
      `Today you sailed ${Math.floor(duration / 60)} minutes toward ${taskTitle}. Despite ${distractionCount} distractions pulling at your sails, you found your way back to the lighthouse's guiding light. Your companion seagull has insights to share.`,
      `A ${Math.floor(duration / 60)}-minute journey through the waters of ${taskTitle}. You navigated ${distractionCount} storms of distraction with grace. The ocean remembers every stroke of your oar.`
    ]

    const summaryText = summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)]

    // Include voice recordings if requested
    let voiceRecordings = []
    if (includeVoiceRecordings) {
      const { data: recordings } = await supabase
        .from('voice_recordings')
        .select('*')
        .eq('voyage_id', voyageId)
      
      voiceRecordings = recordings || []
    }

    const response = {
      imageUrl: selectedImage,
      summaryText,
      sessionData: {
        duration: `${Math.floor(duration / 60)}m`,
        taskTitle,
        taskCategory: category,
        distractionCount,
      },
      voiceRecordings: includeVoiceRecordings ? voiceRecordings : undefined,
      splineInteractionData: voyage.spline_interaction_data || {}
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Enhanced summary generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})