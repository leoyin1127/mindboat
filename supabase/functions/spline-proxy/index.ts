/*
# Spline Proxy Edge Function

This Edge Function acts as a proxy to call the Spline webhook API from the backend,
avoiding CORS issues when calling from the frontend.

## Usage
- URL: https://[your-project].supabase.co/functions/v1/spline-proxy
- Method: POST
- Body: { webhookUrl: string, payload: object } (for flexible webhook calls)
- Returns: Response from Spline API
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SplineProxyRequest {
  webhookUrl?: string;
  payload?: any;
  // Legacy support for direct payload
  number?: number;
  numbaer2?: number;
  // New fields for tracking
  callingPanel?: string;
  purpose?: string;
  [key: string]: any;
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second
const TIMEOUT_MS = 10000; // 10 seconds

// Utility function to create timeout with AbortController
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

// Utility function to wait with exponential backoff
function waitWithBackoff(attempt: number): Promise<void> {
  const delay = INITIAL_DELAY * Math.pow(2, attempt);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Retry function with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout controller for this attempt
      const timeoutController = createTimeoutController(TIMEOUT_MS);
      
      // Merge the timeout signal with any existing signal
      const signal = options.signal 
        ? AbortSignal.any([options.signal, timeoutController.signal])
        : timeoutController.signal;

      console.log(`Attempt ${attempt + 1}/${maxRetries + 1} - Calling: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal
      });

      // If we get a response, return it (even if it's an error status)
      console.log(`Attempt ${attempt + 1} successful - Status: ${response.status}`);
      return response;

    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);

      // If this is the last attempt, don't wait
      if (attempt < maxRetries) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await waitWithBackoff(attempt);
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new Error('All retry attempts failed');
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
    let requestData: SplineProxyRequest
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

    console.log('=== SPLINE PROXY REQUEST ===')
    console.log('🎯 Called by:', requestData.callingPanel || 'UNKNOWN_PANEL')
    console.log('🎯 Purpose:', requestData.purpose || 'UNKNOWN_PURPOSE')
    console.log('Request data:', JSON.stringify(requestData, null, 2))
    console.log('Timestamp:', new Date().toISOString())

    // Determine webhook URL and payload
    let webhookUrl: string
    let payload: any

    if (requestData.webhookUrl && requestData.payload) {
      // New flexible format
      webhookUrl = requestData.webhookUrl
      payload = requestData.payload
    } else {
      // Legacy format - default to original webhook
      webhookUrl = 'https://hooks.spline.design/gpRFQacPBZs'
      payload = requestData
    }

    // Make the request to Spline webhook with retry logic
    try {
      console.log('Calling Spline webhook with retry logic:', webhookUrl)
      console.log('With payload:', JSON.stringify(payload, null, 2))
      console.log(`Retry configuration: ${MAX_RETRIES} retries, ${TIMEOUT_MS}ms timeout`)
      
      const splineResponse = await fetchWithRetry(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'QgxEuHaAD0fyTDdEAYvVH_ynObU2SUnWdip86Gb1RJE',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Final Spline response status:', splineResponse.status)
      console.log('Final Spline response headers:', Object.fromEntries(splineResponse.headers.entries()))

      // Get response data
      let splineData
      const contentType = splineResponse.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        splineData = await splineResponse.json()
      } else {
        splineData = await splineResponse.text()
      }

      console.log('Final Spline response data:', splineData)

      // Prepare our response
      const proxyResponse = {
        success: splineResponse.ok,
        status: splineResponse.status,
        statusText: splineResponse.statusText,
        timestamp: new Date().toISOString(),
        callingPanel: requestData.callingPanel || 'UNKNOWN_PANEL',
        purpose: requestData.purpose || 'UNKNOWN_PURPOSE',
        requestData: requestData,
        webhookUrl: webhookUrl,
        sentPayload: payload,
        splineResponse: splineData,
        headers: Object.fromEntries(splineResponse.headers.entries()),
        retryAttempts: 'Applied retry logic with exponential backoff'
      }

      console.log('=== SPLINE PROXY RESPONSE ===')
      console.log(JSON.stringify(proxyResponse, null, 2))

      return new Response(
        JSON.stringify(proxyResponse),
        {
          status: splineResponse.ok ? 200 : splineResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } catch (splineError) {
      console.error('=== ERROR CALLING SPLINE WEBHOOK (AFTER RETRIES) ===')
      console.error('Spline error:', splineError)
      
      // Determine if this was a timeout or other error
      const isTimeout = splineError.name === 'AbortError' || splineError.message.includes('timeout');
      const errorType = isTimeout ? 'timeout' : 'network_error';
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to call Spline webhook after retries',
          errorType: errorType,
          message: splineError.message,
          timestamp: new Date().toISOString(),
          requestData: requestData,
          webhookUrl: webhookUrl,
          retryConfig: {
            maxRetries: MAX_RETRIES,
            timeoutMs: TIMEOUT_MS,
            initialDelay: INITIAL_DELAY
          }
        }),
        {
          status: isTimeout ? 504 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('=== ERROR IN SPLINE PROXY ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        endpoint: 'spline-proxy'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})