# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Vite development server
- **Build**: `npm run build` - Creates production build  
- **Lint**: `npm run lint` - Runs ESLint on codebase
- **Preview**: `npm run preview` - Preview production build locally

## Architecture Overview

Mindboat is a React/TypeScript application with a Supabase backend, featuring interactive 3D experiences via Spline and a glass morphism UI design.

### Frontend Structure
- **App.tsx**: Central orchestrator managing all state, modal visibility, and 3D scene events
- **SplineScene.tsx + SplineEventHandler.tsx**: 3D scene rendering and event bridge between Spline and React
- **Panel Components**: Journey, Control, Welcome, SailingSummary - main UI screens
- **Modal Components**: LifeGoals, Welcome - overlay interfaces
- **SeagullPanel.tsx**: AI assistant with voice interaction capabilities

### Backend (Supabase Functions)
- **Webhook handlers**: goals-webhook, journey-webhook, seagull-webhook, spline-webhook, welcome-webhook
- **Core services**: voice-interaction (speech processing), sailing-summary (AI summaries), spline-proxy (API security)
- **Testing**: test-seagull-webhook for Seagull logic testing

### Data Flow Patterns
1. **3D Interactions**: Spline events → SplineEventHandler → App state → Backend webhooks
2. **Voice Processing**: Frontend recording → voice-interaction function → AI processing → Response
3. **Journey Management**: User actions → Panel components → Backend state → Database

## Design System

Uses a comprehensive glass morphism design system located in `src/styles/designSystem.ts`:

- **Helper Functions**: 
  - `getButtonStyle(variant, size)` - Consistent button styling
  - `getPanelStyle(blur, tinted)` - Glass panel variations  
  - `getIconContainerStyle(tinted)` - Icon container styling
- **Variants**: Regular and tinted glass effects for better contrast
- **Typography**: Playfair Display for headings, Inter for body text
- **Colors**: Ocean theme with blue gradients and white/transparent overlays

## Code Conventions

From `.cursor/rules/mindboat-rules.mdc`:
- Use functional components with TypeScript interfaces
- Prefer named exports for components
- Use "function" keyword for pure functions, omit semicolons
- Handle errors early with guard clauses and early returns
- Use descriptive variable names with auxiliary verbs (e.g., isLoading)
- Implement responsive design with Tailwind CSS

## Environment Variables

Required for development:
```
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_URL=your_url  
VITE_GEMINI_API_KEY=your_gemini_key
API_KEY=your_dify_api_key
DIFY_API_URL=your_dify_url
```

## Key Technical Notes

- State management is centralized in App.tsx - check there for panel visibility and modal states
- All backend communication flows through webhook functions in `supabase/functions/`
- 3D scene interactions require coordination between Spline, SplineEventHandler, and React state
- Voice features use the voice-interaction serverless function for speech processing
- Always use the design system helpers rather than hardcoding Tailwind classes