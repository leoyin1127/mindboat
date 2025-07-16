# Session Heartbeat Function Tests

This directory contains comprehensive tests for the `session-heartbeat` Supabase Edge Function, following the implementation plan to test image storage, Dify API integration, and database updates without frontend operations.

## Prerequisites

1. **Local Supabase Environment**
   ```bash
   # Start local Supabase stack
   supabase start
   ```

2. **Environment Variables**
   Ensure these environment variables are set in your local environment:
   ```bash
   export SUPABASE_URL="http://localhost:54321"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export DIFY_API_URL="your-dify-api-url"
   export DIFY_API_KEY="your-dify-api-key"
   ```

3. **Database Setup**
   Make sure your local database has the required tables:
   - `users`
   - `tasks`
   - `sailing_sessions`
   - `drift_events`
   - Storage bucket: `heartbeat-images`

## Running the Tests

### Run All Tests
```bash
cd supabase/functions/session-heartbeat
deno test --allow-net --allow-env index.test.ts
```

### Run with Verbose Output
```bash
deno test --allow-net --allow-env --reporter=verbose index.test.ts
```

### Run Specific Test
```bash
deno test --allow-net --allow-env --filter="Test Case 1" index.test.ts
```

## Test Coverage

### Test Case 1: Happy Path - User is Drifting
- **Purpose**: Verify complete workflow when Dify detects user distraction
- **Tests**:
  - Function returns 200 OK with `is_drifting: true`
  - Drift event created in database with correct data
  - Camera and screen images stored in Supabase Storage
  - Response contains accurate drift analysis from Dify

### Test Case 2: Happy Path - User is Focused
- **Purpose**: Verify workflow when user is on-task
- **Tests**:
  - Function returns 200 OK with `is_drifting: false`
  - Drift event created with focused state
  - Images successfully stored and preserved
  - Response contains focus confirmation

### Test Case 3: Error Handling - Dify API Fails
- **Purpose**: Ensure graceful handling of external API failures
- **Tests**:
  - Function returns 200 OK with fallback behavior
  - Drift event created with "analysis unavailable" reason
  - Images are cleaned up after Dify failure
  - No data corruption in database

### Test Case 4: Input Validation - Invalid Request
- **Purpose**: Verify proper input validation
- **Tests**:
  - Missing `sessionId` returns 500 with clear error
  - Missing images returns 500 with descriptive message
  - Invalid `sessionId` returns 500 with "Session not found" error
  - No database operations occur for invalid inputs

### Test Case 5: Single Image Upload (Camera Only)
- **Purpose**: Test partial image uploads
- **Tests**:
  - Function works with only camera image
  - Single image stored correctly
  - Dify API receives available image data
  - Response indicates successful processing

### Test Case 6: Large Image Rejection
- **Purpose**: Test image size validation
- **Tests**:
  - Oversized images (>3MB) are rejected
  - Function falls back to "no media available" behavior
  - No storage of invalid images
  - Graceful error handling without crashes

## Test Architecture

### Mocking Strategy
- **Dify API**: Mocked using global fetch override
- **Database**: Real local Supabase instance for integration testing
- **Storage**: Real Supabase Storage for file upload verification

### Setup & Teardown
- **Setup**: Creates test users, tasks, and sessions before each test
- **Teardown**: Automatically cleans up all test data and uploaded files
- **Isolation**: Each test runs in isolation with fresh data

### Helper Functions
- `createTestUser()`: Creates a test user with realistic data
- `createTestTask()`: Creates a test task linked to a user
- `createTestSession()`: Creates an active sailing session
- `verifyDriftEventExists()`: Confirms database record creation
- `verifyImagesInStorage()`: Validates file uploads to Storage
- `mockDifyApiResponse()`: Controls Dify API responses for testing

## Mock Data

### Test Images
- Uses tiny 1x1 pixel PNG as base64 for fast, reliable testing
- Large image test uses 4MB base64 string to trigger size limits

### Dify Responses
- **Drifting**: Returns social media distraction scenario
- **Focused**: Returns active work confirmation
- **Error**: Simulates API service unavailability

## Expected Behavior

### Successful Test Run
```
🧪 Setting up test environment...
✅ Test environment setup complete
🧪 Running Test Case 1: User is Drifting
🎭 Mocking Dify API call with response type: drifting
✅ Test Case 1 passed: User drifting detected correctly
...
🧹 Tearing down test environment...
✅ Test environment teardown complete
```

### Error Scenarios
Tests are designed to catch:
- Database connection issues
- Storage permission problems
- API configuration errors
- Data consistency issues

## Troubleshooting

### Common Issues

1. **"Session not found" errors**
   - Ensure local Supabase is running
   - Check database migrations are applied

2. **Storage upload failures**
   - Verify `heartbeat-images` bucket exists
   - Check storage policies allow uploads

3. **Environment variable issues**
   - Confirm all required environment variables are set
   - Verify service role key has proper permissions

4. **Dify API configuration**
   - Tests mock Dify, so actual API credentials not required
   - Real Dify URL still needed for URL pattern matching

### Debug Mode
Add verbose logging by setting:
```bash
export DEBUG=true
deno test --allow-net --allow-env index.test.ts
```

## Integration Notes

These tests verify the complete integration chain:
1. **HTTP Request** → Session Heartbeat Function
2. **Database Query** → Session context retrieval
3. **File Upload** → Supabase Storage
4. **API Call** → Dify analysis (mocked)
5. **Database Insert** → Drift event logging
6. **HTTP Response** → Client response

This ensures the function works correctly in the full application context without requiring frontend interaction. 