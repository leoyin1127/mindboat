/// <reference types="https://deno.land/x/types/index.d.ts" />

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import the handler function for testing
// Note: This would need to be refactored in the main file to export the handler
// For now, we'll test via HTTP requests

interface TestUser {
  id: string
  device_fingerprint: string
  guiding_star: string
}

interface TestSession {
  id: string
  user_id: string
  task_id: string | null
  state: string
}

interface TestTask {
  id: string
  user_id: string
  title: string
  description: string
}

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: Deno.env.get('SUPABASE_URL') || 'http://localhost:54321',
  supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  functionUrl: 'http://localhost:54321/functions/v1/session-heartbeat',
  difyApiUrl: Deno.env.get('DIFY_API_URL') || 'https://api.dify.ai/v1/workflows/run',
}

// Mock base64 image data for testing (tiny 1x1 pixel PNG)
const MOCK_IMAGE_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

// Global test state
let supabase: any
let testUsers: TestUser[] = []
let testSessions: TestSession[] = []
let testTasks: TestTask[] = []
let uploadedImageUrls: string[] = []
let originalFetch: typeof globalThis.fetch

// Mock Dify API responses
const mockDifyResponses = {
  drifting: {
    data: {
      outputs: {
        result: JSON.stringify({
          is_drifting: true,
          actual_current_task: 'Browsing social media',
          reasons: 'User is looking at social media instead of working on their task',
          user_mood: 'distracted',
          mood_reason: 'Seems to be procrastinating'
        })
      }
    }
  },
  focused: {
    data: {
      outputs: {
        result: JSON.stringify({
          is_drifting: false,
          actual_current_task: 'Working on documentation',
          reasons: 'User is actively working on their assigned task',
          user_mood: 'focused',
          mood_reason: 'Engaged with work material'
        })
      }
    }
  },
  error: new Error('Dify API service unavailable')
}

// Test helper functions
async function setupTestEnvironment() {
  console.log('🧪 Setting up test environment...')
  
  supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey)
  
  // Store original fetch for restoration later
  originalFetch = globalThis.fetch
  
  // Clear any existing test data
  await teardownTestData()
}

async function teardownTestEnvironment() {
  console.log('🧹 Tearing down test environment...')
  
  // Restore original fetch
  globalThis.fetch = originalFetch
  
  // Clean up all test data
  await teardownTestData()
}

async function teardownTestData() {
  if (!supabase) return

  try {
    // Clean up uploaded images from storage
    for (const url of uploadedImageUrls) {
      await cleanupImageFromUrl(url)
    }
    uploadedImageUrls = []

    // Clean up database records (in order due to foreign key constraints)
    if (testSessions.length > 0) {
      await supabase
        .from('drift_events')
        .delete()
        .in('session_id', testSessions.map(s => s.id))
    }

    if (testSessions.length > 0) {
      await supabase
        .from('sailing_sessions')
        .delete()
        .in('id', testSessions.map(s => s.id))
    }

    if (testTasks.length > 0) {
      await supabase
        .from('tasks')
        .delete()
        .in('id', testTasks.map(t => t.id))
    }

    if (testUsers.length > 0) {
      await supabase
        .from('users')
        .delete()
        .in('id', testUsers.map(u => u.id))
    }

    // Reset arrays
    testUsers = []
    testSessions = []
    testTasks = []
    
    console.log('✅ Test data cleaned up successfully')
  } catch (error) {
    console.error('❌ Error during test cleanup:', error)
  }
}

async function createTestUser(): Promise<TestUser> {
  const userId = crypto.randomUUID()
  const fingerprint = `test-${Date.now()}-${Math.random()}`
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      device_fingerprint: fingerprint,
      guiding_star: 'Complete my important project successfully',
      display_name: 'Test User',
      preferences: {},
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test user: ${error.message}`)
  
  const testUser = {
    id: userId,
    device_fingerprint: fingerprint,
    guiding_star: 'Complete my important project successfully'
  }
  
  testUsers.push(testUser)
  return testUser
}

async function createTestTask(userId: string): Promise<TestTask> {
  const taskId = crypto.randomUUID()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: taskId,
      user_id: userId,
      title: 'Write documentation',
      description: 'Create comprehensive documentation for the project',
      status: 'in_progress',
      priority: 2
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test task: ${error.message}`)
  
  const testTask = {
    id: taskId,
    user_id: userId,
    title: 'Write documentation',
    description: 'Create comprehensive documentation for the project'
  }
  
  testTasks.push(testTask)
  return testTask
}

async function createTestSession(userId: string, taskId?: string): Promise<TestSession> {
  const sessionId = crypto.randomUUID()
  
  const { data, error } = await supabase
    .from('sailing_sessions')
    .insert({
      id: sessionId,
      user_id: userId,
      task_id: taskId || null,
      state: 'active',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test session: ${error.message}`)
  
  const testSession = {
    id: sessionId,
    user_id: userId,
    task_id: taskId || null,
    state: 'active'
  }
  
  testSessions.push(testSession)
  return testSession
}

async function cleanupImageFromUrl(imageUrl: string) {
  if (!imageUrl) return
  
  try {
    const urlParts = imageUrl.split('/storage/v1/object/public/heartbeat-images/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage
        .from('heartbeat-images')
        .remove([filePath])
      console.log(`🧹 Cleaned up test image: ${filePath}`)
    }
  } catch (error) {
    console.error('Error cleaning up test image:', error)
  }
}

function mockDifyApiResponse(responseType: 'drifting' | 'focused' | 'error') {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Only mock Dify API calls
    const urlString = typeof input === 'string' ? input : 
                     input instanceof URL ? input.toString() :
                     input instanceof Request ? input.url : ''
    
    if (!urlString.includes('dify') && !urlString.includes('workflows/run')) {
      return originalFetch(input, init)
    }
    
    console.log('🎭 Mocking Dify API call with response type:', responseType)
    
    if (responseType === 'error') {
      throw mockDifyResponses.error
    }
    
    const mockResponse = responseType === 'drifting' 
      ? mockDifyResponses.drifting 
      : mockDifyResponses.focused
    
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function callHeartbeatFunction(payload: any): Promise<Response> {
  return await fetch(TEST_CONFIG.functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_CONFIG.supabaseKey}`
    },
    body: JSON.stringify(payload)
  })
}

async function verifyDriftEventExists(sessionId: string, expectedDrifting: boolean): Promise<boolean> {
  const { data, error } = await supabase
    .from('drift_events')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_drifting', expectedDrifting)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error verifying drift event:', error)
    return false
  }

  return data && data.length > 0
}

async function verifyImagesInStorage(expectedCount: number): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('heartbeat-images')
    .list('', { limit: 100 })

  if (error) {
    console.error('Error listing storage files:', error)
    return []
  }

  // Filter for recent test images (within last 5 minutes)
  const recentImages = data.filter(file => {
    const fileTime = new Date(file.updated_at || file.created_at).getTime()
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    return fileTime > fiveMinutesAgo
  })

  // Store URLs for cleanup
  const imageUrls = recentImages.map(file => 
    `${TEST_CONFIG.supabaseUrl}/storage/v1/object/public/heartbeat-images/${file.name}`
  )
  uploadedImageUrls.push(...imageUrls)

  return imageUrls
}

// Test Cases

Deno.test({
  name: "Setup Test Environment",
  async fn() {
    await setupTestEnvironment()
    assertExists(supabase)
    console.log('✅ Test environment setup complete')
  }
})

Deno.test({
  name: "Test Case 1: Happy Path - User is Drifting",
  async fn() {
    console.log('🧪 Running Test Case 1: User is Drifting')
    
    // Setup
    const testUser = await createTestUser()
    const testTask = await createTestTask(testUser.id)
    const testSession = await createTestSession(testUser.id, testTask.id)
    
    // Mock Dify to return drifting response
    mockDifyApiResponse('drifting')
    
    // Execute
    const response = await callHeartbeatFunction({
      sessionId: testSession.id,
      cameraImage: MOCK_IMAGE_B64,
      screenImage: MOCK_IMAGE_B64
    })
    
    // Assert response
    assertEquals(response.status, 200)
    
    const responseData = await response.json()
    assertEquals(responseData.success, true)
    assertEquals(responseData.is_drifting, true)
    assertStringIncludes(responseData.drift_reason, 'social media')
    assertEquals(responseData.actual_task, 'Browsing social media')
    
    // Assert drift event was created
    const driftEventExists = await verifyDriftEventExists(testSession.id, true)
    assertEquals(driftEventExists, true)
    
    // Assert images are stored
    const storedImages = await verifyImagesInStorage(2)
    assertEquals(storedImages.length, 2)
    
    console.log('✅ Test Case 1 passed: User drifting detected correctly')
  }
})

Deno.test({
  name: "Test Case 2: Happy Path - User is Focused",
  async fn() {
    console.log('🧪 Running Test Case 2: User is Focused')
    
    // Setup
    const testUser = await createTestUser()
    const testTask = await createTestTask(testUser.id)
    const testSession = await createTestSession(testUser.id, testTask.id)
    
    // Mock Dify to return focused response
    mockDifyApiResponse('focused')
    
    // Execute
    const response = await callHeartbeatFunction({
      sessionId: testSession.id,
      cameraImage: MOCK_IMAGE_B64,
      screenImage: MOCK_IMAGE_B64
    })
    
    // Assert response
    assertEquals(response.status, 200)
    
    const responseData = await response.json()
    assertEquals(responseData.success, true)
    assertEquals(responseData.is_drifting, false)
    assertStringIncludes(responseData.drift_reason, 'actively working')
    assertEquals(responseData.actual_task, 'Working on documentation')
    
    // Assert drift event was created
    const driftEventExists = await verifyDriftEventExists(testSession.id, false)
    assertEquals(driftEventExists, true)
    
    // Assert images are stored and not cleaned up
    const storedImages = await verifyImagesInStorage(2)
    assertEquals(storedImages.length, 2)
    
    console.log('✅ Test Case 2 passed: User focus detected correctly')
  }
})

Deno.test({
  name: "Test Case 3: Error Handling - Dify API Fails",
  async fn() {
    console.log('🧪 Running Test Case 3: Dify API Fails')
    
    // Setup
    const testUser = await createTestUser()
    const testTask = await createTestTask(testUser.id)
    const testSession = await createTestSession(testUser.id, testTask.id)
    
    // Mock Dify to throw an error
    mockDifyApiResponse('error')
    
    // Execute
    const response = await callHeartbeatFunction({
      sessionId: testSession.id,
      cameraImage: MOCK_IMAGE_B64,
      screenImage: MOCK_IMAGE_B64
    })
    
    // Assert response
    assertEquals(response.status, 200) // Function should handle gracefully
    
    const responseData = await response.json()
    assertEquals(responseData.success, true)
    assertEquals(responseData.is_drifting, false) // Fallback to focused
    assertStringIncludes(responseData.drift_reason, 'Analysis service unavailable')
    assertStringIncludes(responseData.message, 'analysis unavailable')
    
    // Assert drift event was created with fallback data
    const driftEventExists = await verifyDriftEventExists(testSession.id, false)
    assertEquals(driftEventExists, true)
    
    // Give a moment for cleanup to happen
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Assert images were cleaned up due to Dify failure
    const storedImages = await verifyImagesInStorage(0)
    assertEquals(storedImages.length, 0)
    
    console.log('✅ Test Case 3 passed: Dify API failure handled gracefully')
  }
})

Deno.test({
  name: "Test Case 4: Input Validation - Invalid Request",
  async fn() {
    console.log('🧪 Running Test Case 4: Input Validation')
    
    // Test missing sessionId
    let response = await callHeartbeatFunction({
      cameraImage: MOCK_IMAGE_B64,
      screenImage: MOCK_IMAGE_B64
    })
    
    assertEquals(response.status, 500)
    let responseData = await response.json()
    assertEquals(responseData.success, false)
    assertStringIncludes(responseData.error, 'Session ID is required')
    
    // Test missing images
    response = await callHeartbeatFunction({
      sessionId: 'test-session-id'
    })
    
    assertEquals(response.status, 500)
    responseData = await response.json()
    assertEquals(responseData.success, false)
    assertStringIncludes(responseData.error, 'At least one image')
    
    // Test invalid sessionId
    response = await callHeartbeatFunction({
      sessionId: 'non-existent-session',
      cameraImage: MOCK_IMAGE_B64
    })
    
    assertEquals(response.status, 500)
    responseData = await response.json()
    assertEquals(responseData.success, false)
    assertStringIncludes(responseData.error, 'Session not found')
    
    console.log('✅ Test Case 4 passed: Input validation working correctly')
  }
})

Deno.test({
  name: "Test Case 5: Single Image Upload (Camera Only)",
  async fn() {
    console.log('🧪 Running Test Case 5: Camera Only')
    
    // Setup
    const testUser = await createTestUser()
    const testTask = await createTestTask(testUser.id)
    const testSession = await createTestSession(testUser.id, testTask.id)
    
    // Mock Dify to return focused response
    mockDifyApiResponse('focused')
    
    // Execute with only camera image
    const response = await callHeartbeatFunction({
      sessionId: testSession.id,
      cameraImage: MOCK_IMAGE_B64
    })
    
    // Assert response
    assertEquals(response.status, 200)
    const responseData = await response.json()
    assertEquals(responseData.success, true)
    
    // Assert only one image is stored
    const storedImages = await verifyImagesInStorage(1)
    assertEquals(storedImages.length, 1)
    
    console.log('✅ Test Case 5 passed: Single image upload handled correctly')
  }
})

Deno.test({
  name: "Test Case 6: Large Image Rejection",
  async fn() {
    console.log('🧪 Running Test Case 6: Large Image Rejection')
    
    // Setup
    const testUser = await createTestUser()
    const testTask = await createTestTask(testUser.id)
    const testSession = await createTestSession(testUser.id, testTask.id)
    
    // Create a large base64 image (over 3MB when decoded)
    const largeImageB64 = 'data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024) // ~4MB base64 -> ~3MB binary
    
    // Execute
    const response = await callHeartbeatFunction({
      sessionId: testSession.id,
      cameraImage: largeImageB64,
      screenImage: MOCK_IMAGE_B64
    })
    
    // Should still work but with fallback behavior for oversized images
    assertEquals(response.status, 200)
    const responseData = await response.json()
    assertEquals(responseData.success, true)
    
    // Should have fallen back to "no media available" behavior
    assertStringIncludes(responseData.drift_reason, 'No media available')
    
    console.log('✅ Test Case 6 passed: Large image rejection handled correctly')
  }
})

Deno.test({
  name: "Teardown Test Environment",
  async fn() {
    await teardownTestEnvironment()
    console.log('✅ Test environment teardown complete')
  }
}) 