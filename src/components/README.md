# Components Documentation

This directory contains all the React components for The Mindboat application. Each component follows the glass morphism design system and ocean theme.

## Component Overview

### Core UI Components

#### `AnimatedText.tsx`
**Purpose**: Provides animated text effects with scroll triggers and mouse tracking
- **Features**: 
  - Fade-in animations with customizable delays
  - Scroll-triggered visibility
  - Mouse position tracking for subtle movement effects
  - Configurable animation timing
- **Usage**: Used for creating engaging text animations throughout the app

#### `SplineScene.tsx`
**Purpose**: Manages the 3D ocean scene background using Spline
- **Features**:
  - Loads and displays the 3D ocean environment
  - Handles interaction states (can disable interactions when modals are open)
  - Error handling and scene refresh functionality
  - Responsive 3D scene management
- **Usage**: Provides the immersive 3D background for the entire application

#### `SplineEventHandler.tsx`
**Purpose**: Handles real-time events from Spline 3D interactions via Supabase
- **Features**:
  - Listens to Supabase Realtime channels for Spline events
  - Routes events to appropriate UI components (modals, panels)
  - Manages modal state coordination
  - Processes webhook data from Spline API calls
- **Usage**: Central event dispatcher for 3D scene interactions

### Modal Components

#### `LifeGoalsModal.tsx`
**Purpose**: Full-screen modal for life goal input and reflection
- **Features**:
  - Large textarea for goal description (500 character limit)
  - Glass morphism styling with backdrop blur
  - Form validation and submission handling
  - Character counter and loading states
- **Usage**: Triggered when users interact with goal-setting elements in the 3D scene

#### `WelcomeModal.tsx`
**Purpose**: Welcome screen with sailing theme introduction
- **Features**:
  - Animated compass icon with floating effects
  - Elegant typography with Playfair Display font
  - Glass panel design with decorative elements
  - Smooth entrance animations
- **Usage**: First-time user onboarding (currently not actively used, replaced by WelcomePanel)

### Panel Components

#### `WelcomePanel.tsx`
**Purpose**: Two-step welcome experience with voice input capability
- **Features**:
  - **Step 1**: Welcome message and introduction
  - **Step 2**: Voice recording interface for user intentions
  - Microphone access and audio recording
  - Recording timer and playback controls
  - Transitions to JourneyPanel after completion
- **Usage**: Primary onboarding flow, positioned on the right side of screen

#### `JourneyPanel.tsx`
**Purpose**: Main task dashboard for goal management and journey initiation
- **Features**:
  - Task list with categories (writing, design, learning, personal)
  - Task completion tracking with visual indicators
  - Detailed task view with images and descriptions
  - "Start Journey" functionality that launches ControlPanel
  - Integration with SailingSummaryPanel for voyage completion
- **Usage**: Central hub for task management and journey initiation

#### `SailingSummaryPanel.tsx`
**Purpose**: Post-journey reflection and summary display
- **Features**:
  - Two-column layout with journey visualization image
  - AI-generated or templated summary text
  - Loading states for backend data fetching
  - Link to "Seagull's Observation Diary" for deeper insights
  - Full-screen modal presentation
- **Usage**: Shown after completing a focused work session

#### `ControlPanel.tsx`
**Purpose**: Floating control interface during active work sessions
- **Features**:
  - Microphone, camera, and screen share toggles
  - "End Voyage" functionality with anchor icon
  - Floating bottom-center positioning
  - Glass morphism design with hover tooltips
  - Real-time control state management
- **Usage**: Provides session controls during active focus sessions

## Design System Integration

All components follow the design system defined in `src/styles/designSystem.ts`:

- **Glass Morphism**: Translucent backgrounds with backdrop blur
- **Ocean Theme**: Blue gradients and flowing animations
- **Typography**: Playfair Display for headings, Inter for body text
- **Consistent Spacing**: 8px grid system
- **Apple-inspired Depth**: Multi-layer shadows and subtle highlights

## Component Interaction Flow

```
SplineScene (3D Background)
    ↓ (user interaction)
SplineEventHandler (Event Router)
    ↓ (triggers appropriate component)
WelcomePanel → JourneyPanel → ControlPanel → SailingSummaryPanel
    ↑                                              ↓
LifeGoalsModal ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

## State Management

- **Modal Coordination**: SplineEventHandler manages which modal/panel is active
- **Interaction Blocking**: SplineScene disables 3D interactions when UI is open
- **Real-time Events**: Supabase Realtime for 3D scene to UI communication
- **Local State**: Each component manages its own internal state (recording, form data, etc.)

## Styling Patterns

### Glass Panel Structure
```tsx
<div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                backdrop-blur-2xl border border-white/25 rounded-3xl p-10
                shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
  {/* Inner glow overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent 
                  rounded-3xl pointer-events-none"></div>
  
  {/* Content */}
  <div className="relative z-10">
    {/* Component content */}
  </div>
</div>
```

### Button Styling
```tsx
<button className="px-8 py-2 bg-gradient-to-br from-white/15 via-white/10 to-white/8
                   hover:from-white/20 hover:via-white/15 hover:to-white/12
                   text-white rounded-xl transition-all duration-300
                   border border-white/25 hover:border-white/35
                   backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.1)]
                   transform hover:scale-[1.02] active:scale-[0.98]">
```

## Development Notes

- All components are TypeScript with proper interface definitions
- Responsive design with mobile-first approach
- Accessibility considerations (ARIA labels, keyboard navigation)
- Error boundaries and loading states where appropriate
- Consistent animation timing (200ms, 300ms, 500ms)
- Proper cleanup of event listeners and timers

## Future Enhancements

- Add more sophisticated animation sequences
- Implement proper accessibility features (screen reader support)
- Add keyboard shortcuts for power users
- Enhance mobile touch interactions
- Add component testing with React Testing Library