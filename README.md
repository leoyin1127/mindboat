# 🚢 Mindboat - Voice-First Productivity App

<div align="center">
  <p>
    <strong>Transform scattered ideas into a focused, game-like journey</strong>
  </p>
  <p>
    <em>Mindboat is a voice-driven productivity app that turns your thoughts into an organized voyage towards your goals, featuring immersive 3D animations and AI-powered focus coaching.</em>
  </p>
</div>

## 🌟 Features

### 🎯 **Chart Your Guiding Star**
Declare one clear, motivational goal that becomes the north-star for all future actions.

### 💨 **Capture the Wind of Thoughts**
Simply speak out your inspirations. Mindboat instantly converts voice notes into an organized, prioritized to-do list—no typing required.

### ⛵ **Set Sail in Flow Mode**
Start a "Sailing Session" and immerse yourself in distraction-free work. The app passively logs spoken thoughts in the background while cinematic 3D animations mark each milestone.

### 🧭 **Stay on Course With Smart Drift Detection**
Mindboat periodically checks screen and camera snapshots (with your permission) to sense wandering attention. When you drift for too long, an AI mentor gently steps in with real-time voice guidance to steer you back on track.

### 🏖️ **Dock and Reflect**
End each session to receive a concise voyage summary—total focus time, drift incidents, and key notes—then watch your accomplishments appear on an interactive "Inner World Map."

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with custom glass morphism design system
- **3D Graphics:** Spline (interactive 3D scenes)
- **State Management:** React hooks with centralized state in App.tsx
- **Speech Recognition:** Web Speech API (browser-native)

### Backend
- **Platform:** Supabase (Backend-as-a-Service)
- **Database:** PostgreSQL with Row Level Security (RLS)
- **Serverless Functions:** Supabase Edge Functions (Deno)
- **Real-time:** Supabase Realtime for WebSocket communication
- **Storage:** Supabase Storage for audio files

### AI/ML Services
- **LLM Orchestration:** Dify (task extraction, chat, multimodal analysis)
- **Text-to-Speech:** ElevenLabs
- **Voice Activity Detection:** Client-side WebAudio API

## 📁 Project Structure

```
mindboat/
├── src/                        # Frontend source code
│   ├── App.tsx                # Main application component (central state management)
│   ├── components/            # React components
│   │   ├── SplineScene.tsx    # 3D scene renderer
│   │   ├── SplineEventHandler.tsx # 3D event bridge
│   │   ├── JourneyPanel.tsx   # Journey management UI
│   │   ├── ControlPanel.tsx   # Session control interface
│   │   ├── SeagullPanel.tsx   # AI assistant interface
│   │   ├── WelcomePanel.tsx   # Onboarding screen
│   │   └── ...               # Other UI components
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts           # Anonymous authentication
│   │   ├── supabase.ts       # Supabase client
│   │   └── webhookClient.ts  # API communication
│   └── styles/               
│       └── designSystem.ts    # Glass morphism design system
├── supabase/                  # Backend code
│   ├── functions/            # Edge Functions (serverless)
│   │   ├── goals-webhook/    # Goal management
│   │   ├── journey-webhook/  # Journey tracking
│   │   ├── seagull-webhook/  # AI assistant logic
│   │   ├── voice-interaction/ # Speech processing
│   │   ├── sailing-summary/  # Session summaries
│   │   └── ...              # Other webhooks
│   └── migrations/          # Database schema migrations
├── public/                   # Static assets
├── docs/                    # Documentation
└── package.json            # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- API keys for:
  - Supabase (anon key)
  - Dify (LLM orchestration)
  - ElevenLabs (text-to-speech)
  - Gemini API (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mindboat.git
cd mindboat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
API_KEY=your_dify_api_key
DIFY_API_URL=your_dify_url
```

4. Set up Supabase:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy
```

5. Start the development server:
```bash
npm run dev
```

## 📝 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Conventions

- Use functional components with TypeScript interfaces
- Prefer named exports for components
- Use "function" keyword for pure functions
- Handle errors early with guard clauses
- Use descriptive variable names with auxiliary verbs
- Follow the glass morphism design system (see `src/styles/designSystem.ts`)

### Testing

See `TESTING_GUIDE.md` for comprehensive testing instructions.

## 🎨 Design System

Mindboat uses a custom glass morphism design system with:
- **Typography:** Playfair Display (headings), Inter (body)
- **Colors:** Ocean theme with blue gradients
- **Effects:** Frosted glass panels with backdrop blur
- **Components:** Consistent button styles, panel variations, icon containers

Use the design system helpers:
```typescript
import { getButtonStyle, getPanelStyle } from './styles/designSystem'

// Example usage
<button className={getButtonStyle('primary', 'medium')}>
  Set Sail
</button>
```

## 🔒 Security & Privacy

- **Anonymous Authentication:** No personal data required
- **Device Fingerprinting:** Local-only identification
- **Voice Privacy:** Speech-to-text runs entirely in-browser
- **Permission-Based:** Explicit consent for camera/microphone/screen access
- **Data Storage:** All user data stored securely in Supabase with RLS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read `CLAUDE.md` for AI-assisted development guidelines.

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- [Spline](https://spline.design) for 3D graphics
- [Supabase](https://supabase.com) for backend infrastructure
- [Dify](https://dify.ai) for LLM orchestration
- [ElevenLabs](https://elevenlabs.io) for text-to-speech

---

<div align="center">
  <p>
    <strong>Let Mindboat convert your fleeting thoughts into a purposeful voyage</strong>
  </p>
  <p>
    <em>Every work session feels like smooth sailing toward your most ambitious horizons</em>
  </p>
</div>