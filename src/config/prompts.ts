/**
 * LLM Prompts Configuration
 * 
 * IMPORTANT: You can customize these prompts to improve distraction detection accuracy
 * and destination generation quality. Each prompt is clearly marked for easy modification.
 */

// ============================================================================
// DESTINATION GENERATION PROMPTS
// ============================================================================

/**
 * CUSTOMIZABLE: Main prompt for generating destinations from user tasks
 * 
 * This prompt transforms user tasks into creative, inspiring destination names.
 * You can modify this to change the style, language, or creativity level.
 */
export const DESTINATION_GENERATION_PROMPT = `
Transform this user task into a magical sailing destination:

Task: "{task}"

Return a JSON object with:
- destinationName: A creative, inspiring destination name (preferably in Chinese, but English is fine)
- description: A poetic 2-sentence description of this place
- relatedApps: Array of 3-5 relevant applications/websites that would be used for this task
- colorTheme: A hex color that represents this destination

Examples:
- Task: "Write research paper" → "学术大陆" (Academic Continent)
- Task: "Learn piano" → "艺术琴泉" (Artistic Piano Springs)  
- Task: "Build app" → "代码峡湾" (Code Fjords)

Make it magical and inspiring while being practical. Focus on creating a sense of adventure and purpose.
`.trim();

/**
 * CUSTOMIZABLE: Prompt for suggesting related applications
 * 
 * This helps the system understand what apps/websites are relevant to each task type.
 * Modify this to include more specific tools or change the categorization logic.
 */
export const RELATED_APPS_PROMPT = `
For the task "{task}", suggest 5 relevant applications, websites, or tools that would typically be used.
Consider both professional tools and commonly used applications.
Return as a simple array of app names.

Examples:
- Research: ["Zotero", "Google Scholar", "Notion", "Word", "Mendeley"]
- Programming: ["VS Code", "GitHub", "Terminal", "Stack Overflow", "Docker"]
- Design: ["Figma", "Adobe Creative Suite", "Sketch", "Canva", "Pinterest"]
`.trim();

// ============================================================================
// CAMERA DISTRACTION DETECTION PROMPTS
// ============================================================================

/**
 * CUSTOMIZABLE: Main prompt for analyzing camera images to detect if user is present and focused
 * 
 * This prompt is sent to Gemini along with camera images to determine if the user
 * is present and appears to be focused on their work.
 * 
 * You can modify this to:
 * - Change sensitivity levels
 * - Add specific behaviors to look for
 * - Adjust for different work environments
 */
export const CAMERA_ANALYSIS_PROMPT = `
Analyze this camera image to determine if the user is present and appears focused on their work.

Look for:
1. Is there a person visible in the image?
2. Is the person facing toward the camera/screen (indicating they're looking at their work)?
3. Are they in a focused posture (sitting upright, attention on screen)?
4. Are there obvious signs of distraction (looking away, talking on phone, etc.)?

Current user goal: "{userGoal}"
Current task: "{currentTask}"

Return a JSON response with:
{
  "personPresent": boolean,
  "appearsFocused": boolean,
  "confidenceLevel": number (0-100),
  "observations": "Brief description of what you see",
  "distractionIndicators": ["list", "of", "any", "distraction", "signs"]
}

Be practical and avoid false positives. Brief moments of looking away or adjusting position are normal.
`.trim();

// ============================================================================
// SCREENSHOT CONTENT ANALYSIS PROMPTS
// ============================================================================

/**
 * CUSTOMIZABLE: Main prompt for analyzing screenshots to detect if content is relevant to the user's goal
 * 
 * This prompt analyzes what's currently on the user's screen to determine if they're
 * working on their intended task or if they've been distracted.
 * 
 * You can modify this to:
 * - Add specific websites/apps to always consider as distracting
 * - Adjust relevance criteria
 * - Handle specific work contexts better
 */
export const SCREENSHOT_ANALYSIS_PROMPT = `
Analyze this screenshot to determine if the current screen content is relevant to the user's work goal.

IMPORTANT: This screenshot may include both the main screen content AND a camera view (typically shown as a small video window). Please analyze BOTH:
1. The main screen content for work relevance
2. The camera view to check if the user is present and appears focused on their work

User's overall goal: "{userGoal}"
Current task/destination: "{currentTask}"
Related apps for this task: {relatedApps}

Look for in the MAIN SCREEN:
1. Are they using applications/websites related to their task?
2. Is the visible content relevant to their goal?
3. Are there signs of distraction (social media, entertainment, unrelated browsing)?
4. Is this a productive work environment?

Look for in the CAMERA VIEW (if present):
1. Is there a person visible in the camera view?
2. Is the person facing toward the camera/screen (indicating they're looking at their work)?
3. Are they in a focused posture (sitting upright, attention on screen)?
4. Are there obvious signs of distraction (looking away, talking on phone, using mobile device, etc.)?

Common distracting patterns to watch for:
- Social media sites (Facebook, Twitter, Instagram, TikTok, etc.)
- Video streaming (YouTube videos unrelated to work, Netflix, etc.)
- Online shopping
- News sites (unless research-related)
- Gaming websites/applications
- Messaging apps used excessively
- User not present in camera view when they should be working
- User looking at phone/mobile device instead of screen
- User facing away from screen or appearing distracted in camera view
- User eating or drinking while working (mild distraction)
- User in conversation with others (verbal distraction)
- Multiple unrelated browser tabs open
- Notification popups from social apps

Specific distraction types to identify:
- social_media: Facebook, Twitter, Instagram, TikTok, LinkedIn feed, etc.
- entertainment: YouTube (non-work), Netflix, gaming sites, music streaming
- shopping: Amazon, eBay, online stores, product browsing
- news_browsing: CNN, BBC, news sites (unless research-related)
- irrelevant_browsing: General off-topic web browsing
- phone_usage: User looking at or using mobile device
- looking_away: User's attention not on screen
- eating_drinking: User eating or drinking
- conversation: User talking to someone else
- notification_popup: Distracting notifications visible
- task_switching: Switching between multiple unrelated tasks

Return a JSON response with:
{
  "contentRelevant": boolean,
  "distractionType": "string (one of the specific types above, or null if no distraction)",
  "confidenceLevel": number (0-100),
  "detectedApps": ["list", "of", "visible", "apps/sites"],
  "distractionLevel": "none" | "mild" | "moderate" | "high",
  "reasoning": "Brief explanation of your assessment for both main screen and camera view",
  "suggestedAction": "continue" | "gentle_reminder" | "intervention_needed",
  "screenAnalysis": {
    "contentType": "description of main screen content (e.g., 'code editor', 'web browser', 'document')",
    "isProductiveContent": boolean,
    "screenObservations": "Brief description of what you see on the main screen"
  },
  "cameraAnalysis": {
    "personPresent": boolean,
    "appearsFocused": boolean,
    "cameraObservations": "Brief description of what you see in the camera view"
    "physicalDistraction": "string (eating_drinking, phone_usage, conversation, looking_away, or null)"
  }
  "alert": "Examples like 'I've seen that you have been off the road because of {distractionType}, do you want to return to the main course or start exploring?'"
}

Be practical - brief moments of checking messages, looking up references, or adjusting position are normal parts of work.
`.trim();

// ============================================================================
// BLACKLIST CONFIGURATION
// ============================================================================

/**
 * CUSTOMIZABLE: Apps and websites that should always be considered distracting
 * 
 * Add or remove items from this list based on your preferences.
 * The system will automatically detect these and trigger distraction alerts.
 */
export const DISTRACTION_BLACKLIST = [
  // Social Media
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 
  'snapchat.com', 'linkedin.com/feed', 'reddit.com',
  
  // Video & Entertainment
  'youtube.com/watch', 'netflix.com', 'hulu.com', 'disney.com',
  'twitch.tv', 'vimeo.com',
  
  // Shopping
  'amazon.com/s', 'amazon.com/dp', 'ebay.com', 'aliexpress.com',
  'etsy.com', 'shopify.com',
  
  // News (unless work-related)
  'cnn.com', 'bbc.com', 'news.google.com', 'reuters.com',
  'nytimes.com', 'washingtonpost.com',
  
  // Gaming
  'steam.com', 'epic.com', 'battle.net', 'minecraft.net',
  'roblox.com', 'fortnite.com',
  
  // Other Distracting Sites
  'buzzfeed.com', '9gag.com', 'imgur.com', 'pinterest.com/pin'
];

/**
 * CUSTOMIZABLE: Apps and websites that should always be considered productive
 * 
 * These will never trigger distraction alerts, even if they don't match
 * the specific task's related apps.
 */
export const PRODUCTIVITY_WHITELIST = [
  // Development
  'github.com', 'gitlab.com', 'stackoverflow.com', 'code.visualstudio.com',
  'localhost', '127.0.0.1',
  
  // Productivity Tools
  'notion.so', 'docs.google.com', 'drive.google.com', 'office.com',
  'trello.com', 'asana.com', 'slack.com',
  
  // Research & Learning
  'scholar.google.com', 'arxiv.org', 'jstor.org', 'pubmed.ncbi.nlm.nih.gov',
  'coursera.org', 'edx.org', 'khanacademy.org',
  
  // Design & Creative
  'figma.com', 'canva.com', 'adobe.com',
  
  // Email & Communication (work context)
  'gmail.com', 'outlook.com', 'calendar.google.com'
];

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

/**
 * CUSTOMIZABLE: Time thresholds for distraction detection
 * 
 * Adjust these values to make distraction detection more or less sensitive.
 * All values are in milliseconds.
 */
export const DISTRACTION_THRESHOLDS = {
  // How long someone can be away from camera/unfocused before it's considered a distraction
  CAMERA_ABSENCE_THRESHOLD: 5 * 60 * 1000, // 5 minutes (15s for testing)
  
  // How long someone can be on blacklisted content before it's considered a distraction  
  BLACKLIST_THRESHOLD: 5 * 60 * 1000, // 5 minutes (15s for testing)
  
  // How long someone can be on irrelevant content before it's considered a distraction
  IRRELEVANT_CONTENT_THRESHOLD: 5 * 60 * 1000, // 5 minutes (15s for testing)
  
  // How often to take and analyze screenshots
  SCREENSHOT_INTERVAL: 60 * 1000, // 60 seconds (now includes camera analysis)
  
  // Grace period for brief distractions (won't count as distraction if shorter)
  GRACE_PERIOD: 30 * 1000, // 30 seconds
};