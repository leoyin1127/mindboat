# Project Requirements Document
**Product Name:** *“Mindship” (意念小船)*
**Project Language:** *English*
**Product Description:** 

***Mindship*** is a voice-first productivity app that transforms scattered ideas into a focused, game-like journey. Guided by an elegant sailing metaphor, you:

1. **Chart Your Guiding Star**
   Declare one clear, motivational goal that becomes the north-star for all future actions.

2. **Capture the Wind of Thoughts**
   Simply speak out your inspirations. Mindship instantly converts voice notes into an organized, prioritized to-do list—no typing required.

3. **Set Sail in Flow Mode**
   Start a “Sailing Session” and immerse yourself in distraction-free work. The app passively logs spoken thoughts in the background while cinematic 3-D animations mark each milestone.

4. **Stay on Course With Smart Drift Detection**
   Mindship periodically checks screen and camera snapshots (with your permission) to sense wandering attention. When you drift for too long, an AI mentor gently steps in with real-time voice guidance to steer you back on track.





5. **Dock and Reflect**
   End each session to receive a concise voyage summary—total focus time, drift incidents, and key notes—then watch your accomplishments appear on an interactive “Inner World Map.”

**Why Mindship?**

* **Hands-Free Productivity:** Voice capture, AI task extraction, and conversational guidance keep your hands on your work, not on a keyboard.
* **Adaptive Focus Coach:** Proactive interventions help break procrastination loops at the very moment they arise.
* **Engaging Narrative:** Stunning Spline-powered animations turn everyday productivity into an inspiring adventure.
* **Data-Driven Insight:** Actionable summaries and historical visualizations reveal patterns that traditional to-do lists miss.

Let Mindship convert your fleeting thoughts into a purposeful voyage—so every work session feels like smooth sailing toward your most ambitious horizons.

**Version:** MVP 1 scope

**Purpose:** Provide users with an immersive, voice-driven productivity app that helps them set a big-picture goal, break it into actionable tasks, stay focused while working, and reflect on progress—all through an engaging “sailing” metaphor.

## 1 · Product Overview

**Mindship** is a *voice‑first* productivity app that turns scattered ideas into a focused, game‑like voyage. A refined sailing metaphor guides users to:

1. **Chart Your Guiding Star** – declare one motivating, north‑star goal.
2. **Capture the Wind of Thoughts** – speak ideas; Mindship turns them into an organised, prioritised to‑do list.
3. **Set Sail in Flow Mode** – launch a “Sailing Session”, work hands‑free, and watch cinematic 3‑D animations mark milestones.
4. **Stay on Course** – smart drift detection notices distraction; an AI mentor (“Seagull”) offers real‑time voice nudges.
5. **Dock & Reflect** – finish with a concise voyage summary and a growing **Inner World Map** of accomplishments.

> **Why Mindship?**
> • Hands‑free productivity • Proactive focus coach • Engaging narrative • Data‑driven insight

---

## 2 · Release Scope & Priorities

| Phase                       | Core Features (IDs)                                                                                                      | Delivery Window       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| **Phase 1 – Launch Prep**   | 1.1 Guiding Star • 1.2 Wind of Thoughts (inc. 1.2.1/1.2.2 refinement)                                                    | **MVP 1**             |
| **Phase 2 – Daily Sailing** | 2.1 Start Session • 2.2 Passive Listening • **2.3 Ask Seagull** • **2.4 Deep Drift Intervention** • 2.5 Focus Monitoring | **MVP 1 / MVP 1‑max** |
| **Phase 3 – Reflection**    | 3.1 End Session & Summary • 3.2 Inner World Map                                                                          | **MVP 1**             |
| **Cross‑Cutting**           | 4 API documentation                                                                                                      | Continuous            |

---

## 3 · System Architecture (high‑level)

| Layer                      | Responsibilities                                                                                                  | Tech / Service                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Frontend (Web / React)** | UI, media capture, **Web Speech API** (continuous & single‑turn STT), client‑side VAD, WebSocket, Spline triggers | Vite + React, WebAudio/WebRTC, Web Speech API, Supabase JS SDK |
| **Supabase (BaaS)**        | Auth, Postgres, Storage, Realtime, Edge Functions (proxy to 3rd‑party APIs)                                       | Supabase Edge Functions (Deno / TS)                            |
| **External Services**      | 3‑D animation, LLM, TTS                                                                                           | Spline, **Dify** (LLM orchestration), **ElevenLabs** (TTS)     |

*Speech‑to‑text now runs **entirely in‑browser** via the Web Speech API.*

---

## 4 · Functional Requirements (MVP 1)

| ID         | Feature                                           | Front‑End Duties                                                                                                                                   | Supabase Edge / DB Duties                                                                                                                                                         | External Calls    | Priority   |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------- |
| **FR‑1.1** | **Set “Guiding Star”**                            | Form → `rpc_set_goal()`; fire Spline intro                                                                                                         | Insert into `goals` table                                                                                                                                                         | Spline webhook    | P1         |
| **FR‑1.2** | **Wind of Thoughts – Speech → Tasks**             | Use **Web Speech API** continuous mode to capture text; on recognition result → `edge_process_thoughts({text})`; show returned tasks               | Call **Dify** “task decomposition” with the text; insert tasks into `tasks`                                                                                                       | Dify              | P1         |
| **FR‑2.1** | **Start Sailing Session**                         | Request mic/cam; `rpc_start_session()`; open Realtime channel; trigger animation                                                                   | Insert `sessions` row; broadcast `"started"`                                                                                                                                      | —                 | P1         |
| **FR‑2.2** | **Passive Listening**                             | Web Speech API continuous transcription; whenever interim/final text appears → `edge_log_speech({session_id,text})`                                | Store transcript in `logs`                                                                                                                                                        | —                 | P1         |
| **FR‑2.3** | **Ask Seagull – On‑Demand Voice Chat**            | On tap **“Ask Seagull”**: use Web Speech API single‑shot recognition → send text to `edge_ask_seagull({session_id,text})`; play streamed TTS reply | 1. Send text + context to **Dify** chat endpoint<br>2. Receive reply (string)<br>3. **ElevenLabs TTS** → audio stream → broadcast to client<br>4. Log Q\&A in `interaction_logs`  | Dify → ElevenLabs | **P1**     |
| **FR‑2.4** | **Deep Drift Intervention – AI Voice Engagement** | Autoplay TTS coaching; if user responds, fall back to FR‑2.3 flow                                                                                  | **Trigger:** backend detects **≥ 5 min continuous drift**.<br>1. Compile context summary<br>2. Dify generates gentle nudge<br>3. ElevenLabs TTS; broadcast `DRIFT_COACHING` event | Dify → ElevenLabs | **P1‑max** |
| **FR‑2.5** | **Heartbeat & Focus Monitoring**                  | Periodic screenshots/webcam frames → `edge_heartbeat()`                                                                                            | Store metadata; 60 s job computes drift score; if drifting broadcast `DRIFT`                                                                                                      | Dify multimodal   | P1‑max     |
| **FR‑3.1** | **End Session & Summary**                         | `rpc_end_session()`; close channel; display summary                                                                                                | SQL metrics (`duration`, `focus%`, `drifts`) → JSON                                                                                                                               | —                 | P1         |
| **FR‑3.2** | **Inner World Map**                               | Fetch sessions & render map                                                                                                                        | Read‑only view; optional PostGIS                                                                                                                                                  | —                 | P1         |
| **FR‑4.0** | **API Docs**                                      | –                                                                                                                                                  | Auto‑generate OpenAPI via Supabase CLI                                                                                                                                            | —                 | P2         |

### FR‑2.4 User Story

> “If I’m distracted for too long, I want my AI buddy **‘Seagull’** to start a gentle, non‑judgmental conversation that reminds me of my goal and guides me back on track.”

*Trigger condition:* continuous drift **≥ 5 minutes** (detected by FR‑2.5 engine).

---

## 5 · Non‑Functional & Experience Requirements

1. **Instant Voice UX** – Browser STT must yield interim text < 300 ms after speech; overall Ask Seagull mic‑to‑reply ≤ 2.5 s.
2. **Cinematic Continuity** – each stage transition triggers the correct Spline animation.
3. **Privacy & Consent** – explicit permissions for mic/cam/screen; all raw audio stays on‑device.
4. **Reliability** – WebSocket auto‑reconnect; transcripts buffered locally if offline.
5. **Extensibility** – Edge Functions expose REST definitions for third‑party integrations.

---

## 6 · External Interfaces

| Service            | Purpose                   | Notes                                                           |
| ------------------ | ------------------------- | --------------------------------------------------------------- |
| **Web Speech API** | In‑browser speech‑to‑text | Continuous & single‑turn modes; offline fallback not guaranteed |
| **Spline**         | 3‑D scene playback        | Webhook endpoint integrated                                     |
| **Dify**           | LLM orchestration         | Task extraction, chat, multimodal drift check                   |
| **ElevenLabs**     | Text‑to‑speech            | Streams 16‑kHz PCM over HTTP2                                   |

---

## 7 · Acceptance Criteria

| Feature ID | Key KPI                  | Pass Condition                                |
| ---------- | ------------------------ | --------------------------------------------- |
| FR‑1.1     | Goal saved               | `goals` row exists; Spline intro plays        |
| FR‑1.2     | Task extraction accuracy | ≥ 90 % of test ideas correctly parsed         |
| FR‑2.3     | Ask Seagull latency      | User hears reply < 2.5 s after tap            |
| FR‑2.4     | Intervention timing      | Coaching triggers within 10 s of 5‑min drift  |
| FR‑2.5     | Drift detection          | False‑positive rate < 5 % on test video       |
| FR‑3.1     | Summary accuracy         | Reported focus% within ±3 % of ground truth   |
| FR‑3.2     | Map update               | Completed sessions appear within 1 s of fetch |

---

## 8 · Glossary

| Term               | Meaning                                                     |
| ------------------ | ----------------------------------------------------------- |
| **Guiding Star**   | User’s single, overarching goal                             |
| **Seagull**        | The conversational AI persona                               |
| **Drift**          | Period where user is off‑task, detected via multimodal cues |
| **Edge Function**  | Supabase serverless function (Deno)                         |
| **Web Speech API** | Browser API providing on‑device or cloud STT                |

---

**End of Document**
