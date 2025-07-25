# FR2.4 Implementation Test Guide

## Prerequisites
1. Ensure you have drift events in the database
2. Set up the FR24_DIFY_API_KEY environment variable
3. Ensure FR24_DIFY_API_URL is configured (defaults to ngrok URL)

## Testing Steps

### 1. Check Configuration
Visit the debug endpoint to verify FR2.4 is configured:
```
GET https://[your-project].supabase.co/functions/v1/voice-interaction/debug
```

Expected response should show:
```json
{
  "env": {
    "FR24_CONFIG": {
      "FR24_DIFY_API_URL": "http://164579e467f4.ngrok-free.app/v1",
      "FR24_DIFY_API_KEY": "SET"
    }
  }
}
```

### 2. Trigger Drift Intervention
The system should automatically trigger drift interventions when:
- User is detected as drifting (heartbeat monitoring)
- SplineEventHandler receives drift intervention events

### 3. Test Drift Intervention Voice Call
When a drift intervention is triggered, the voice-interaction function should:

1. **Detect drift context**: `context_type: 'drift_intervention'`
2. **Use FR2.4 API**: Switch to FR24_DIFY_API_URL and FR24_DIFY_API_KEY
3. **Format FR2.4 payload**:
   ```json
   {
     "inputs": {
       "heartbeat_record": "HEARTBEAT SUMMARY: X records analyzed...",
       "user_goal": "become an ai engineer",
       "UUID": "user_id_here"
     },
     "query": "1",
     "user": "user_id",
     "response_mode": "streaming"
   }
   ```
4. **Call FR2.4 endpoint**: `POST http://164579e467f4.ngrok-free.app/v1/chat-messages`

### 4. Expected Logs
Look for these logs in the console:
```
🔄 Building FR2.4 payload for drift intervention
🔍 Aggregating heartbeat records for FR2.4
📤 FR2.4 Payload summary: {...}
📤 Dify API request: { "apiVersion": "FR2.4", ... }
```

### 5. Verify Data Flow
The heartbeat aggregation should:
- Query `drift_events` table for recent records (last 30 minutes)
- Format them as timestamped activity records
- Include both DISTRACTED and FOCUSED states
- Provide summary statistics

## Environment Variables Needed
Add these to your Supabase project:
```
FR24_DIFY_API_KEY=your_fr24_api_key_here
FR24_DIFY_API_URL=http://164579e467f4.ngrok-free.app/v1
```

## Troubleshooting
- If no heartbeat records: Ensure you have drift_events in the database
- If wrong API called: Check context_type is 'drift_intervention'
- If 400 error: Verify FR2.4 API key and URL are correct
- If no drift detection: Ensure heartbeat monitoring is running