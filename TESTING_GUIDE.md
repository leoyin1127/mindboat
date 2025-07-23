# Testing Guide: Continuous Conversation Feature

## 🎯 **How to Test the Continuous Conversation Implementation**

### **Prerequisites**
1. Start the development server: `npm run dev`
2. Open the application in your browser (usually http://localhost:5175)
3. Ensure microphone permissions are granted

### **Test Scenario 1: Basic Continuous Conversation**

1. **Trigger SeagullPanel**: Click the "🐦 Talk to Seagull" button in the bottom-right corner
2. **Observe initialization**: 
   - Panel opens with conversation header showing "Turn 1"
   - Auto-restart toggle shows "🔄 Auto" (enabled)
   - Status shows "Ready to listen" with yellow microphone icon
3. **Start conversation**: Speak into your microphone
   - Status changes to "Listening..." with green mic icon
   - Audio level bars turn green and respond to your voice
4. **Wait for AI response**: 
   - Status changes to "Speaking..." with blue pulse animation
   - AI responds with TTS audio
5. **Observe auto-restart**: 
   - After AI finishes speaking, status returns to "Ready to listen"
   - Conversation automatically resumes listening (1.5 second delay)
   - Turn counter increments to "Turn 2"
6. **Continue conversation**: Speak again to test multiple turns
7. **Test manual close**: Click the X button to end conversation

### **Test Scenario 2: Auto-Restart Toggle**

1. **Start conversation**: Follow steps 1-4 from Scenario 1
2. **Disable auto-restart**: Click the "🔄 Auto" button (should change to "🔄 Manual")
3. **Observe behavior**: After AI response, conversation does NOT automatically restart
4. **Re-enable auto-restart**: Click "🔄 Manual" to change back to "🔄 Auto"
5. **Verify restart**: Conversation should now auto-restart after next AI response

### **Test Scenario 3: Conversation Timeout**

1. **Start conversation**: Follow steps 1-3 from Scenario 1
2. **Wait without speaking**: Leave the panel open for 45+ seconds without interaction
3. **Observe timeout**: Panel should automatically close after timeout
4. **Verify cleanup**: No audio should be playing, microphone should be released

### **Test Scenario 4: Drift Intervention Continuous Conversation**

1. **Start a sailing session**: Click "🚀 Start Journey" button first
2. **Trigger drift intervention**: The system should automatically trigger SeagullPanel during drift
3. **Test conversation**: Follow the same conversation flow as Scenario 1
4. **Verify context**: AI should reference drift/focus in responses

### **UI Elements to Verify**

#### **Conversation Header**
- Turn counter: "Turn X" increments with each exchange
- Conversation ID: Shows partial ID when established
- Auto-restart toggle: "🔄 Auto" / "🔄 Manual" toggles properly

#### **Status Indicators**
| State | Icon | Color | Bars |
|-------|------|-------|------|
| Listening | Mic | Green | Green animated |
| Speaking | Blue pulse | Blue | Blue animated |
| Waiting | Mic-off | Yellow | Yellow static |
| Error | Status text | Red | Red static |

#### **Conversation State**
- Exchange counter: Shows "• X exchanges" after first turn
- Message display: Shows latest AI response
- Close button: Changes to red on hover, shows exchange count in tooltip

### **Backend Verification**

Check browser console for:
1. **Conversation initialization**: "🎯 Initializing new conversation session"
2. **Turn tracking**: "🗣️ Sending turn X of conversation (ID: ...)"
3. **Context persistence**: "💬 New conversation ID established: ..."
4. **Auto-restart**: "🔄 TTS completed, checking for auto-restart..."
5. **Audio handling**: "🔊 Playing TTS audio response"

### **Expected Behavior**

✅ **Continuous Flow**: User speaks → AI responds → Auto-restart → User speaks → ...  
✅ **Context Memory**: AI remembers previous turns in conversation  
✅ **Visual Feedback**: Clear indication of conversation state at all times  
✅ **User Control**: Can toggle auto-restart and manually close  
✅ **Timeout Safety**: Conversations don't run indefinitely  
✅ **Error Recovery**: Graceful handling of audio/network errors  

### **Known Issues & Troubleshooting**

1. **Microphone permissions**: Ensure browser allows microphone access
2. **Audio codec**: WebM/Opus support required for recording
3. **Backend connectivity**: Verify Supabase functions are deployed and accessible
4. **TTS playback**: Some browsers may block autoplay, require user interaction first

### **Performance Verification**

- **Response time**: AI responses should typically arrive within 2-5 seconds
- **Audio quality**: TTS should be clear and properly timed
- **Memory usage**: No memory leaks during extended conversations
- **CPU usage**: Audio processing should not cause UI lag

This implementation successfully provides the continuous conversation experience specified in FR-2.3 and FR-2.4 requirements!