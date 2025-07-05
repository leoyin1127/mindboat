# MindBoat Integrated - Deployment Guide

## Overview

This guide covers deploying the integrated MindBoat application, which combines:
- **MindBoat Core**: AI-powered focus tracking with voice interaction
- **Min-D 3D Interface**: Spline-based 3D sailing experience
- **Unified Architecture**: Seamless integration between 3D visuals and productivity features

## Prerequisites

### Required Services
1. **Supabase Project** - Database and Edge Functions
2. **Vercel Account** - Frontend deployment
3. **ElevenLabs API** - Voice synthesis (optional but recommended)
4. **Gemini API** - AI vision and text processing

### Required API Keys
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key (optional)
- `VITE_GEMINI_API_KEY` - Google Gemini API key
- `SUPABASE_SERVICE_ROLE_KEY` - For Edge Functions (server-side)

## Database Setup

### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Run Database Migrations
```bash
# Apply all migrations
supabase db push

# Or run individually
supabase migration up
```

### 3. Deploy Edge Functions
```bash
# Deploy all Edge Functions
supabase functions deploy

# Deploy specific functions
supabase functions deploy generate-destination
supabase functions deploy generate-reflection
supabase functions deploy spline-proxy
supabase functions deploy welcome-webhook
supabase functions deploy goals-webhook
supabase functions deploy journey-webhook
supabase functions deploy seagull-webhook
```

## Environment Variables

### Frontend (.env)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Services
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key

# Application Settings
VITE_APP_NAME=MindBoat
VITE_APP_VERSION=1.0.0
```

### Edge Functions (.env.local)
```env
# Server-side keys for Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## Deployment Steps

### 1. Frontend Deployment (Vercel)

```bash
# Build the application
npm run build

# Deploy to Vercel
npm install -g vercel
vercel --prod

# Or connect GitHub repository for automatic deployments
```

### 2. Vercel Configuration

Create `vercel.json`:
```json
{
  "builds": [
    {
      "src": "dist/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "VITE_GEMINI_API_KEY": "@gemini-api-key",
    "VITE_ELEVENLABS_API_KEY": "@elevenlabs-api-key"
  }
}
```

### 3. Set Environment Variables in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all required environment variables
3. Redeploy the application

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# The application is split into optimized chunks:
# - spline.js (~2MB) - 3D rendering engine
# - vendor.js (~250KB) - React and core libraries
# - index.js (~320KB) - Application code
# - stores.js (~5KB) - State management
# - ui.js (~22KB) - UI components
```

### 3D Performance Settings
- Scene automatically switches to background mode during sailing
- Camera detection can be disabled on low-end devices
- Voice features gracefully degrade without API keys

## Security Considerations

### Row Level Security (RLS)
All database tables have RLS enabled:
- Users can only access their own data
- Anonymous access is restricted to public functions
- Service role key is only used server-side

### API Key Security
- Frontend keys are public (anon key, client-side API keys)
- Service role key is server-side only
- API keys are validated before use

## Monitoring and Troubleshooting

### Common Issues

1. **3D Scene Not Loading**
   - Check browser WebGL support
   - Verify Spline URL is accessible
   - Check console for CORS errors

2. **Voice Features Not Working**
   - Verify microphone permissions
   - Check ElevenLabs API key
   - Ensure HTTPS deployment (required for microphone)

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure Edge Functions are deployed

### Performance Monitoring
```javascript
// Built-in performance monitoring
console.log('Spline scene loaded in:', loadTime + 'ms');
console.log('Voice service initialized:', voiceStatus);
console.log('Camera detection active:', cameraEnabled);
```

## Feature Flags

The application gracefully handles missing features:
- **No ElevenLabs API**: Voice synthesis disabled, speech recognition still works
- **No Gemini API**: AI features disabled, manual destination creation available
- **No Camera**: Distraction detection via tab switching only
- **No WebGL**: 3D scene shows fallback message

## Scaling Considerations

### Database
- Supabase handles up to 500MB free tier
- Consider upgrading for production usage
- Enable database backups

### Edge Functions
- 500,000 function invocations/month on free tier
- Monitor usage in Supabase dashboard
- Consider caching for high-traffic endpoints

### Storage
- Voice recordings and screenshots stored in Supabase Storage
- Configure lifecycle policies for old data
- Monitor storage usage

## Support

For deployment issues:
1. Check this guide first
2. Review application logs in Vercel/Supabase
3. Test locally with production environment variables
4. Verify all services are properly configured

The integrated MindBoat application is designed for production deployment with proper error handling, graceful degradation, and performance optimization. 