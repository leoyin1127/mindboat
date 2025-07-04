# MindBoat × Min-D – Integration Plan

> **Goal:** Combine MindBoat's production-ready logic / AI / data layer with Min-D's immersive 3D UI and design system to deliver one cohesive application.

---

## 0. Guiding Principles

1. **Visual Source-of-Truth:** Min-D is the design authority.  Tailwind theme, glass-morphism utilities, and component look-and-feel come from `min-d/tailwind.config.js` & `src/styles/designSystem.ts`.
2. **Logic Source-of-Truth:** MindBoat owns all business logic, AI services, stores, database schema, Edge Functions & routing flow.
3. **Single Supabase Project:** Retain MindBoat's DB schema & Edge Functions.  Re-point Min-D 3D webhooks to these endpoints.
4. **Performance First:** Webcam, screenshot, voice, and WebGL can overload laptops.  The plan includes throttling / pixel-ratio tweaks.

---

## 1. Repository & File-System Merge

```
mindboat-integrated/
├─ package.json            # merged deps (see §2)
├─ vite.config.ts          # **min-d** base + extra aliases / plugins
├─ tailwind.config.js      # **min-d** config ← extended with MindBoat util classes
├─ postcss.config.js       # from min-d (already standard)
│
└─ src/
   ├─ components/
   │  ├─ 3d/               # all Spline-related components from min-d
   │  ├─ panels/           # WelcomePanel, LifeGoalsModal, JourneyPanel … (min-d)
   │  ├─ sailing/          # MindBoat's SailingMode, enhanced for 3D bg
   │  ├─ onboarding/       # LighthouseGoal & CreateDestination (logic)
   │  └─ ui/               # merged basic UI primitives
   ├─ stores/              # MindBoat Zustand stores + new AppStateStore
   ├─ hooks/               # MindBoat hooks (voice, distraction, audio …)
   ├─ services/            # MindBoat AI + data services
   ├─ styles/
   │   ├─ designSystem.ts  # **min-d** file (kept)
   │   └─ functional.ts    # mindboat functional helpers (focus bars, timers…)
   └─ lib/
       └─ supabase.ts      # MindBoat tolerant client (exported for all)
```

---

## 2. Dependency Matrix

```
# package.json (excerpt)
"dependencies": {
  "@splinetool/react-spline": "^4.0.0",   // 3D scene
  "@supabase/supabase-js": "^2.39.0",      // shared client
  "framer-motion": "^10.16.16",            // animations (MindBoat uses)
  "lucide-react": "^0.344.0",               // icons
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.20.1",           // routing (MindBoat)
  "tone": "^14.7.77",                       // ambient audio
  "zustand": "^4.4.7"                       // global state
}
```
No version conflicts: both projects already use identical major versions.

---

## 3. Build / Config Merge

1. **Vite**: start from `min-d/vite.config.ts`.  Add:
   ```ts
   import path from 'path'

   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: {
         '@': path.resolve(__dirname, 'src'),
       }
     },
     optimizeDeps: { exclude: ['lucide-react'] },
   })
   ```
2. **Tailwind**: copy `min-d/tailwind.config.js` → project root.  Under `extend` merge any utility colours / keyframes present in MindBoat.
3. **tsconfig**: add path alias `"@/*": ["src/*"]`.

---

## 4. Global State Architecture

### 4.1 New Store – `AppStateStore`
```ts
interface AppState {
  currentView: 'auth' | 'onboarding' | 'destinations' | 'sailing' | 'summary' | 'map';
  sceneMode: 'interactive' | 'background' | 'hidden';
  activePanel: 'welcome' | 'goals' | 'journey' | 'summary' | null;
  setView: (v: AppState['currentView']) => void;
  setScene: (m: AppState['sceneMode']) => void;
  showPanel: (p: AppState['activePanel']) => void;
  hidePanels: () => void;
}
```
Uses Zustand; enables 3D scene & UI to stay mounted while routes change.

### 4.2 Supabase Client
Retain MindBoat's `lib/supabase.ts` (has graceful demo-mode).  Update all min-d imports.

---

## 5. 3D Scene Integration

| Task                    | Detail                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Mount once**          | In `RootLayout.tsx` render `<SplineScene />` & `<SplineEventHandler />` outside `<Router>` so they never unmount. |
| **Interaction Manager** | Wrap EventHandler → pushes events into `AppStateStore`.                                                           |
| **Performance**         | When `sceneMode === 'background'` set `devicePixelRatio=0.7` & pause Spline animation clock for idle frames.      |
| **Webhooks**            | Keep min-d EdgeFunctions but change Supabase URL/Key env vars to integrated project.                              |

---

## 6. Onboarding Flow (3D-first)

1. User clicks 3D lighthouse → Spline webhook → Edge function → realtime event → `activePanel = 'goals'`.
2. **LifeGoalsModal** (min-d) collects goal, on submit → `userStore.setLighthouseGoal(goal)`.
3. Fire 3D "rise lighthouse" animation (existing Spline action).
4. Route to Destinations view.

---

## 7. Destinations / Journey Panel

| Old                               | New                                                      |
| --------------------------------- | -------------------------------------------------------- |
| MindBoat `CreateDestination` form | Keep for logic (hidden)                                  |
| Min-D `JourneyPanel`              | Replace mock array with `destinationStore.destinations`. |

Start button calls `voyageStore.startVoyage()` *then* triggers Spline sailing animation.

---

## 8. Sailing Mode Enhancement

1. Keep MindBoat's **SailingMode** overlay (timers, distraction alerts).
2. On mount → `sceneMode='background'` so Spline runs as ocean BG.
3. Distraction alert flow: if alert visible, fire `splineEvent('show_seagull', {...})`.
4. Weather changes → send `splineEvent('weather_change', {mood})` + adjust Tailwind overlay.

---

## 9. Voice & Audio

1. Use MindBoat's `VoiceService`, `useVoiceInteraction`.
2. When ElevenLabs plays audio, temporarily mute Spline's audio layer:
   ```js
   splineApp.audio.gainNode.gain.value = 0.2
   ```
3. After speech, restore gain.

---

## 10. Edge Functions & Database

1. Keep MindBoat migrations / RLS policies.
2. Delete duplicate EdgeFunctions in min-d except those unique to 3D (journey, seagull, welcome, goals).  Point them to same Supabase project.
3. **Environment**: add to `.env`  
   ```env
   VITE_SPLINE_SCENE_URL=https://prod.spline.design/....
   ```

---

## 11. Performance & QA

| Check                                 | Tool                               |
| ------------------------------------- | ---------------------------------- |
| FPS under Sailing Mode (webcam+WebGL) | Chrome devtools Performance panel  |
| Lighthouse LCP < 5s                   | `npm run build && npx lighthouse`  |
| Memory leak (3D never unmounts)       | Chrome Performance –> Heapsnapshot |

---

## 12. Roll-out Timeline (9 dev-days)

| Day | Deliverable                                                             |
| --- | ----------------------------------------------------------------------- |
| 1   | Repo merge, Tailwind/Vite unified, build passes                         |
| 2   | AppStateStore, Supabase client refactor                                 |
| 3   | 3D scene mounted + event bridge                                         |
| 4   | Goals panel + lighthouse animation working with MindBoat goal save      |
| 5   | JourneyPanel lists real destinations, start voyage triggers SailingMode |
| 6   | SailingMode overlays 3D background, weather + seagull integration       |
| 7   | Voice prompts mute 3D audio; Edge functions unified                     |
| 8   | Perf passes (≤60fps), Lighthouse > 90                                   |
| 9   | Buffer, bug-bash, docs                                                  |

---

## 13. Risk Register & Mitigations

| Risk                    | Impact | Mitigation                                                     |
| ----------------------- | ------ | -------------------------------------------------------------- |
| Tailwind class clashes  | Medium | keep min-d tailwind as base, add new utilities under `extend`. |
| 3D + Sensors overload   | High   | DPR scaling + pause clock when hidden.                         |
| Duplicate EdgeFunctions | Medium | prune duplicates, single Supabase project.                     |
| State sync loops        | Medium | Add shallow equality guards in store setters.                  |

---

## 14. Deliverables

1. **Integrated codebase** at `/mindboat-integrated`.
2. **Migration SQL** identical to MindBoat (no change).
3. **CI pipeline** running lint, test, Lighthouse.
4. **User docs**: `README.md` updated with 3D setup instructions.
5. **Demo URL** deployed to Vercel w/ Supabase backend.

---

_This document is the single source of truth for the merge.  Update it if scope or timelines change._ 