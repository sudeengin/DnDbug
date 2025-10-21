# Prompt Flow Diagram

Visual representation of how prompts flow through the D&D Bug application.

---

## 🔄 Complete Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
│                     Story Concept Text                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: Background Generation                       │
│  File: api/generate_background.js                               │
│  Model: GPT-4o (temp: 0.7)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Prompt:                                                         │
│  "You are a DnD GM assistant. Generate a compact Story          │
│   Background from a Story Concept."                             │
│                                                                  │
│  Generates:                                                      │
│  ✓ premise, tone_rules, stakes, mysteries                       │
│  ✓ factions, location_palette, npc_roster_skeleton             │
│  ✓ motifs, doNots, playstyle_implications                      │
│  ✓ numberOfPlayers (3-6, default: 4)                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
                   🔒 LOCK BACKGROUND
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: Character Generation                        │
│  File: api/characters/generate.js                               │
│  Model: GPT-4o (temp: 0.7, max_tokens: 4000)                   │
├─────────────────────────────────────────────────────────────────┤
│  Input:                                                          │
│  • Locked Background Context                                    │
│  • numberOfPlayers                                              │
│                                                                  │
│  Prompt:                                                         │
│  "You are a D&D GM character designer creating playable PCs    │
│   with detailed backgrounds."                                   │
│                                                                  │
│  Generates (per character - 15 fields):                         │
│  ✓ name, role, race, class, personality                        │
│  ✓ motivation, connectionToStory, gmSecret                     │
│  ✓ potentialConflict, voiceTone, inventoryHint                │
│  ✓ motifAlignment, backgroundHistory                           │
│  ✓ keyRelationships, flawOrWeakness                           │
│                                                                  │
│  Character Count: numberOfPlayers ± 1                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
                   🔒 LOCK CHARACTERS
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 3: Macro Chain Generation                      │
│  File: api/generate_chain.js                                    │
│  Model: GPT-4o (temp: 0.7)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Input:                                                          │
│  • Locked Background Context                                    │
│  • Locked Characters Context                                    │
│  • numberOfPlayers                                              │
│  • Story Concept                                                │
│                                                                  │
│  Prompt Context Blocks:                                         │
│  ┌───────────────────────────────────────────┐                 │
│  │ BACKGROUND_CONTEXT                        │                 │
│  │ • Premise, Tone Rules, Stakes, Mysteries  │                 │
│  │ • Locations, NPCs, Motifs                 │                 │
│  │ • DoNots, Playstyle                       │                 │
│  └───────────────────────────────────────────┘                 │
│  ┌───────────────────────────────────────────┐                 │
│  │ CHARACTERS                                │                 │
│  │ • List with motivations and conflicts     │                 │
│  └───────────────────────────────────────────┘                 │
│  ┌───────────────────────────────────────────┐                 │
│  │ PLAYER_COUNT                              │                 │
│  │ • Party size considerations               │                 │
│  └───────────────────────────────────────────┘                 │
│                                                                  │
│  Generates:                                                      │
│  ✓ 5-6 Macro Scenes                                            │
│    • Scene 1-2: Early exploration                              │
│    • Scene 3-4: Mid development                                │
│    • Scene 5-6: Late resolution                                │
│                                                                  │
│  Each scene has:                                                │
│  • title (using tone_rules & background elements)              │
│  • objective (connecting to stakes/mysteries)                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   Scene 1        │          │   Scene 2-6      │
│   (First Scene)  │          │   (Subsequent)   │
└────────┬─────────┘          └────────┬─────────┘
         │                              │
         ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│              STEP 4: Scene Detail Generation (Scene 1)           │
│  File: api/generate_detail.js                                   │
│  Model: GPT-4o (temp: 0.8)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Input:                                                          │
│  • Background Context                                           │
│  • Characters Context                                           │
│  • numberOfPlayers                                              │
│  • Macro Scene (title, objective, order)                       │
│  • Effective Context: "No previous scenes - first scene"       │
│                                                                  │
│  Prompt Template: renderDetailTemplate()                        │
│                                                                  │
│  Generates:                                                      │
│  ┌─────────────────────────────────────────┐                   │
│  │ narrativeCore                           │                   │
│  │ • goal, conflict, revelation, transition│                   │
│  └─────────────────────────────────────────┘                   │
│  ┌─────────────────────────────────────────┐                   │
│  │ dynamicElements                         │                   │
│  │ • npcProfiles, environment, challenge   │                   │
│  │ • revealedInfo                          │                   │
│  └─────────────────────────────────────────┘                   │
│  ┌─────────────────────────────────────────┐                   │
│  │ contextOut                              │                   │
│  │ • world_state, story_facts              │                   │
│  │ • world_seeds, characterMoments         │                   │
│  └─────────────────────────────────────────┘                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
                   🔒 LOCK SCENE 1
                        │
                        ▼
                        │◄──────────────────────────────────────┐
                        │                                       │
                        ▼                                       │
┌─────────────────────────────────────────────────────────────────┐
│         STEP 5: Scene Detail Generation (Scene N)                │
│  File: api/generate_detail.js                                   │
│  Model: GPT-4o (temp: 0.8)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Prerequisites:                                                  │
│  ✅ Scene N-1 must be LOCKED                                    │
│  ✅ Version staleness check passes                              │
│                                                                  │
│  Input:                                                          │
│  • Background Context                                           │
│  • Characters Context                                           │
│  • numberOfPlayers                                              │
│  • Macro Scene N (title, objective, order)                     │
│  • Effective Context (from Scene 1 to N-1):                    │
│    - keyEvents, revealedInfo, stateChanges                     │
│    - npcRelationships, environmentalState                      │
│    - plotThreads, playerDecisions                              │
│                                                                  │
│  Context Integration:                                           │
│  ✓ Build upon previous scenes                                  │
│  ✓ Do not contradict established facts                         │
│  ✓ Natural story continuation                                  │
│  ✓ Reference ≥1 PC where natural                               │
│                                                                  │
│  Generates: [Same structure as Scene 1]                         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
                   🔒 LOCK SCENE N
                        │
                        │ (If N < 6)
                        └───────────────────────────────────────┘
```

---

## 🔧 Scene Edit Flow with Delta Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                 USER EDITS SCENE DETAIL                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Delta Analysis Prompt                               │
│  File: api/delta_prompt.js                                      │
├─────────────────────────────────────────────────────────────────┤
│  Input:                                                          │
│  • Old Scene Detail                                             │
│  • New Scene Detail (edited)                                    │
│                                                                  │
│  Prompt:                                                         │
│  "You are a DnD scene editor. Compare the old and new scene    │
│   details below and analyze the changes."                       │
│                                                                  │
│  Tasks:                                                          │
│  1. Compare both versions semantically                          │
│  2. Identify changed keys (context-related)                     │
│  3. Summarize delta in natural language                         │
│  4. Determine affected subsequent scenes                        │
│  5. Assign severity: soft|hard                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Delta Analysis Result                            │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    "updatedDetail": {...},                                      │
│    "delta": {                                                    │
│      "keysChanged": ["keyEvents", "revealedInfo"],             │
│      "summary": "Added new revelation about..."                │
│    },                                                            │
│    "affectedScenes": [                                          │
│      {                                                           │
│        "sceneId": "scene_3",                                    │
│        "reason": "Major changes in previous scene",            │
│        "severity": "hard"                                       │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌──────────────┐        ┌──────────────┐
    │ Soft Changes │        │ Hard Changes │
    │ (severity:   │        │ (severity:   │
    │  soft)       │        │  hard)       │
    │              │        │              │
    │ • State      │        │ • Key events │
    │   changes    │        │ • Revealed   │
    │ • Minor      │        │   info       │
    │   updates    │        │ • Plot       │
    │              │        │   changes    │
    └──────────────┘        └──────┬───────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  Invalidate Subsequent   │
                    │  Scenes (2-3 scenes)     │
                    │                          │
                    │  Mark for regeneration   │
                    └──────────────────────────┘
```

---

## 🔐 Lock & Version Flow

```
                    Session Context
                          │
                          ▼
        ┌─────────────────────────────────┐
        │         Meta Versions           │
        │  • backgroundV                  │
        │  • charactersV                  │
        │  • macroSnapshotV               │
        └─────────────┬───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │    buildPromptContext()         │
        │                                 │
        │  Returns:                       │
        │  • background                   │
        │  • characters                   │
        │  • numberOfPlayers              │
        │  • versions {                   │
        │      backgroundV,               │
        │      charactersV,               │
        │      macroSnapshotV             │
        │    }                            │
        └─────────────┬───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │   Scene Generation Request      │
        │   with "uses" field:            │
        │   {                             │
        │     backgroundV: X,             │
        │     charactersV: Y              │
        │   }                             │
        └─────────────┬───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │   Staleness Check               │
        │   isStale(uses, meta)           │
        │                                 │
        │   If stale:                     │
        │   ❌ 409 Error                  │
        │   "Context has changed"         │
        │                                 │
        │   If valid:                     │
        │   ✅ Proceed with generation    │
        └─────────────────────────────────┘
```

---

## 📊 Context Propagation Flow

```
Background Context                Characters Context
       │                                 │
       ├─────────────┬───────────────────┤
       │             │                   │
       ▼             ▼                   ▼
  ┌────────┐   ┌─────────┐      ┌──────────┐
  │ Tone   │   │ Stakes  │      │Character │
  │ Rules  │   │ Myster- │      │Motivat-  │
  │        │   │ ies     │      │ions      │
  └────┬───┘   └────┬────┘      └────┬─────┘
       │            │                 │
       │            │                 │
       └────────────┴─────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │  Macro Chain Prompt    │
       │  (renderChainTemplate) │
       │                        │
       │  Uses:                 │
       │  • Tone for titles     │
       │  • Stakes for objec.   │
       │  • Mysteries for arc   │
       │  • Chars for depth     │
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │   5-6 Macro Scenes     │
       │   • title              │
       │   • objective          │
       └────────────┬───────────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
   Scene 1      Scene 2      Scene 3 ...
       │            │            │
       ▼            ▼            ▼
  ┌────────────────────────────────┐
  │  Scene Detail Prompt           │
  │  (renderDetailTemplate)        │
  │                                │
  │  Context Layers:               │
  │  1. Background (tone, NPCs...) │
  │  2. Characters (motivations)   │
  │  3. Player Count               │
  │  4. Macro Scene (title, obj.)  │
  │  5. Effective Context:         │
  │     • Previous scenes' output  │
  │     • keyEvents                │
  │     • revealedInfo             │
  │     • stateChanges             │
  │     • npcRelationships         │
  │     • environmentalState       │
  │     • plotThreads              │
  │     • playerDecisions          │
  └────────────────────────────────┘
               │
               ▼
  ┌────────────────────────────────┐
  │   Scene Detail with contextOut │
  │                                │
  │   This scene's output becomes  │
  │   next scene's effectiveContext│
  └────────────────────────────────┘
               │
               ▼
      (Feeds into next scene)
```

---

## 🎯 Player Count Propagation

```
┌──────────────────────────┐
│  User Input              │
│  numberOfPlayers: 4      │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│  Background Generation   │
│  • Stores in background  │
│  • Validates: 3-6        │
│  • Default: 4            │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│  buildPromptContext()    │
│  • Reads from background │
│  • Clamps to [3,6]       │
│  • Returns as top-level  │
└─────────┬────────────────┘
          │
          ├──────────────────┬──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Characters   │  │ Macro Chain  │  │ Scene Detail │
  │ Generation   │  │ Generation   │  │ Generation   │
  │              │  │              │  │              │
  │ "Generate X  │  │ "Generate    │  │ "Balance for │
  │ characters   │  │ scenes for   │  │ X players"   │
  │ (±1)"        │  │ X players"   │  │              │
  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔄 Migration Flow (Old → New Scene Structure)

```
Old Scene Detail Structure
┌────────────────────────────┐
│ dynamicElements: {         │
│   contextOut: {            │
│     story_facts: [],       │
│     world_state: {},       │
│     world_seeds: {},       │
│     characterMoments: []   │
│   }                        │
│ }                          │
└────────────┬───────────────┘
             │
             │ migrateSceneDetailStructure()
             │
             ▼
New Scene Detail Structure
┌────────────────────────────┐
│ contextOut: {              │
│   keyEvents: [             │
│     ...story_facts,        │
│     ...characterMoments    │
│   ],                       │
│   stateChanges: {          │
│     ...world_state         │
│   },                       │
│   environmentalState: {    │
│     ...world_seeds         │
│   },                       │
│   revealedInfo: [],        │
│   npcRelationships: {},    │
│   plotThreads: [],         │
│   playerDecisions: []      │
│ }                          │
│                            │
│ dynamicElements: {         │
│   (no contextOut here)     │
│ }                          │
└────────────────────────────┘
```

---

Last Updated: 2025-10-21

