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

**Current status:**
- 3D animation is integrated, but no function is implemented


---

## 1. High-Level Goals

1. **North-Star Goal Setting** – Let the user declare a single overarching objective (“Guiding Star”) that anchors every subsequent action.
2. **Thought-to-Task Conversion** – Capture spontaneous ideas as speech and convert them into a structured to-do list (“Wind of Thoughts”).
3. **Daily Sailing Cycle** – Guide users through focused work sessions, passively log their spoken thoughts, and intervene when they drift.
4. **Adaptive Voice Guidance** – Offer real-time, conversational AI support when sustained distraction is detected.
5. **Progress Review & Visualization** – Summarize each session, and visually map completed tasks on a personal “Inner World Map.”
6. **Unified Experience** – Maintain a seamless narrative with cinematic 3-D animations that mark stage transitions.

---

## 2. Release Scope & Priorities

| Phase                       | Core Features (IDs)                                                                                             | Priority              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Phase 1 – Launch Prep**   | 1.1 North-Star Goal · 1.2 Thought-to-Task · 1.2.1/1.2.2 task refinement                                         | **MVP 1**             |
| **Phase 2 – Daily Sailing** | 2.1 Start Session · 2.2 Passive Listening · 2.3 Active Interaction · 2.4 AI Intervention · 2.5 Focus Monitoring | **MVP 1 / MVP 1 max** |
| **Phase 3 – Reflection**    | 3.1 End Session & Summary · 3.2 Inner World Map                                                                 | **MVP 1**             |
| **Cross-Cutting**           | 4 API documentation                                                                                             | Continuous            |

---

## 3. Functional Requirements

### 3.1 Phase 1 – Launch Prep

| ID    | Requirement                                                                                | Primary Actor |
| ----- | ------------------------------------------------------------------------------------------ | ------------- |
| 1.1   | Users can press **Start** to set or update their single “Guiding Star” goal.               | User          |
| 1.2   | Users can record voice memos; the system extracts tasks and returns an ordered to-do list. | User          |
| 1.2.2 | System can re-prioritize tasks through follow-up dialogue.                                 | System        |

### 3.2 Phase 2 – Daily Sailing

| ID  | Requirement                                                                                                                          | Primary Actor |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 2.1 | Users launch a **Sailing Session** for a chosen task; session metadata is stored and a persistent connection is opened.              | User          |
| 2.2 | During passive mode, background voice detection saves short speech snippets as text logs without UI interruption.                    | System        |
| 2.3 | Users can enter active “Command Mode” via button or wake word to issue real-time voice commands and receive instant feedback.        | User          |
| 2.4 | If continuous distraction > 10 min, the system initiates a two-way voice conversation with an AI mentor and streams audio both ways. | System        |
| 2.5 | The app periodically captures screen-and-camera snapshots, checks for drift, updates session status, and triggers visual cues.       | System        |

### 3.3 Phase 3 – Reflection & Growth

| ID  | Requirement                                                                                     | Primary Actor |
| --- | ----------------------------------------------------------------------------------------------- | ------------- |
| 3.1 | Users can end a session and view a summary: total duration, focus time, drift count, key notes. | User          |
| 3.2 | Users can open an **Inner World Map** showing all past sessions as connected voyage points.     | User          |

---

## 4. Non-Functional & Experience Requirements

1. **Seamless Voice UX** – Speech capture and playback must feel instantaneous and hands-free.
2. **Engaging 3-D Narrative** – Major state changes (start, drift, end) must trigger matching animations for visual continuity.
3. **Privacy & Consent** – Users grant explicit permission for microphone, camera, and screen recording; data is scoped per session.
4. **Reliability** – WebSocket connection should gracefully reconnect; background logging must not interrupt the user journey.
5. **Extensibility** – APIs must be fully documented to enable future integrations or automation.

---

## 6. External Systems & Interfaces

* **3-D Animation Engine** – Receives simple webhooks to play scene-specific animations. (already integrated)
* **Speech-to-Text Service** – Converts short audio chunks and full streams to text.
* **Large-Language Model** – Performs task extraction, intent classification, conversation generation, and focus assessment.
* **Text-to-Speech Service** – Streams AI voice responses back to the client.
  *(No technical implementation details are included in this document.)*

---

## 7. Acceptance Criteria (Snapshot)

For each feature ID, the user must be able to complete the action in one uninterrupted flow and observe a confirmatory visual or textual response that matches the narrative. Metrics such as session creation, task count, drift detection, and summary accuracy must log correctly in the database for audit.

---

**End of Document**
