# Prompts Reference Documentation

## Overview
This document catalogs all AI prompts used in the D&D Bug application, their purpose, and which ones are currently active.

---

## 🟢 ACTIVE PROMPTS (Currently in Use)

### 1. Background Generation Prompt
**File**: `api/generate_background.js`
**Status**: ✅ **ACTIVE**
**Model**: GPT-4o
**Temperature**: 0.7

**Purpose**: Generate a compact Story Background from a Story Concept

**System Prompt**:
```
You are a DnD GM assistant. Generate a compact Story Background from a Story Concept. 
All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. 
Do not use Turkish words or local idioms.
```

**Output Schema**:
- premise (string): Core story premise in 1-2 sentences
- tone_rules (string[]): 3-5 tone guidelines
- stakes (string[]): 3-5 key stakes/conflicts
- mysteries (string[]): 3-5 central mysteries
- factions (string[]): 3-5 major factions/groups
- location_palette (string[]): 3-5 key locations
- npc_roster_skeleton (string[]): 3-5 key NPCs with brief descriptions
- motifs (string[]): 3-5 recurring themes/symbols
- doNots (string[]): 3-5 things to avoid
- playstyle_implications (string[]): 3-5 playstyle considerations
- numberOfPlayers (number): How many players (default 4, range 3-6)

**Key Instructions**:
- Keep each field concise (1-2 sentences max per item)
- Focus on story-driving elements
- Ensure consistency with concept
- Make it actionable for scene generation
- All text output must be in English

---

### 2. Character Generation Prompt
**File**: `api/characters/generate.js`
**Status**: ✅ **ACTIVE**
**Model**: GPT-4o
**Temperature**: 0.7
**Max Tokens**: 4000

**Purpose**: Create playable D&D PCs with detailed backgrounds

**System Prompt**:
```
You are a D&D GM character designer creating playable PCs with detailed backgrounds. 
Follow the rules strictly and return valid JSON only.
```

**Output Schema** (15 required fields per character):
- name
- role
- race
- class
- personality
- motivation
- connectionToStory
- gmSecret (2-3 sentences of rich, interconnected lore)
- potentialConflict
- voiceTone
- inventoryHint
- motifAlignment (array)
- backgroundHistory (1-2 paragraphs)
- keyRelationships (array)
- flawOrWeakness

**Key Instructions**:
1. **Lore & World Integration**: Use background context (tone, motifs, anchors)
2. **D&D-Level Background Depth**: Base style on D&D 5e manuals
3. **Relationships and Hooks**: Create 2-3 narrative connections
4. **Flaws & Secrets**: gmSecret must be 2-3 sentences connecting to background lore
5. **Motif Resonance**: Connect characters to visual themes symbolically
6. **Playability Focus**: All output in English, immersive and concise
7. **GM Secret Requirements**: Connect directly to background context, create dramatic potential

**Critical GM Secret Examples**:
- "Character's family was responsible for the manor's downfall, but they don't know it..."
- "The character unknowingly carries the key to the manor's hidden chamber..."
- "Their mentor was secretly a member of the antagonist faction..."

**Validation**:
- Must generate numberOfPlayers characters (±1 if narratively justified)
- Locked background required before generation

---

### 3. Macro Chain Generation Prompt
**File**: `api/generate_chain.js`
**Status**: ✅ **ACTIVE**
**Model**: GPT-4o
**Temperature**: 0.7

**Purpose**: Generate a macro chain of 5-6 scenes

**System Prompt**:
```
You are a D&D GM assistant. You MUST use the provided BACKGROUND_CONTEXT as the primary foundation 
for creating scene chains. The background context contains the story's premise, tone, mysteries, 
and world details that should drive every scene.

CRITICAL: You MUST incorporate specific elements from the background context into your scene titles 
and objectives. Do not create generic scenes - use the specific locations, NPCs, mysteries, and tone 
from the background.

All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. 
Do not use Turkish words or local idioms.
```

**Output Schema**:
```json
{
  "scenes": [
    {
      "title": "Scene title that matches the tone_rules and uses background elements",
      "objective": "One-sentence purpose that connects to background stakes/mysteries"
    }
  ]
}
```

**Key Instructions**:
1. Use BACKGROUND_CONTEXT as primary foundation
2. Each scene title MUST use words from tone_rules and reference specific locations/NPCs
3. Each scene objective MUST connect to specific stakes and mysteries
4. MUST use specific locations from location_palette
5. MUST reference specific NPCs from npc_roster_skeleton
6. MUST weave specific motifs throughout scene flow
7. MUST follow all constraints from doNots list
8. DO NOT create generic scenes

**Scene Structure** (5-6 scenes):
- Scenes 1-2: Early exploration, introduce basic mysteries from background
- Scenes 3-4: Mid development, deepen investigation of background mysteries
- Scenes 5-6: Late resolution, address background stakes and mysteries

**Context Provided**:
- Background Context (premise, tone_rules, stakes, mysteries, locations, NPCs, motifs, doNots, playstyle)
- Characters Context (if available)
- Player Count

**Prerequisites**:
- Background must be locked
- Characters must be locked

---

### 4. Scene Detail Generation Prompt
**File**: `api/generate_detail.js` (via `api/lib/prompt.js`)
**Status**: ✅ **ACTIVE**
**Model**: GPT-4o
**Temperature**: 0.8

**Purpose**: Create detailed scene content with new narrative core structure

**System Prompt**:
```
You are a D&D GM assistant creating detailed scene content. Follow the rules strictly and return valid JSON only. 
All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. 
Do not use Turkish words or local idioms.
```

**Output Schema** (New Structure - Goal→Conflict→Revelation→Transition):
```json
{
  "sceneDetail": {
    "sceneId": "string",
    "title": "string",
    "objective": "string",
    "sequence": "number",
    "sceneType": "exploration|combat|social|investigation|puzzle|transition",
    "narrativeCore": {
      "goal": "What this scene aims to achieve",
      "conflict": "The central tension or obstacle",
      "revelation": "What new information is discovered",
      "transition": "How this scene leads to the next"
    },
    "dynamicElements": {
      "npcProfiles": [
        {
          "name": "NPC Name",
          "motivation": "What drives this NPC",
          "personality": "How they behave and speak"
        }
      ],
      "environment": "Detailed setting description",
      "challenge": {
        "type": "skill|save|ability",
        "dc": 15,
        "failureConsequence": "What happens on failure"
      },
      "revealedInfo": ["Information revealed in this scene"]
    },
    "contextOut": {
      "world_state": {},
      "story_facts": ["New story facts established"],
      "world_seeds": {
        "locations": ["New locations discovered"],
        "factions": ["New factions encountered"],
        "constraints": ["New constraints established"]
      },
      "characterMoments": ["Character development moments"]
    },
    "status": "Generated",
    "version": 1,
    "lastUpdatedAt": "ISO timestamp"
  }
}
```

**Key Instructions**:
1. **Narrative Core**: Goal→Conflict→Revelation→Transition structure
2. **Dynamic Elements**: NPCs, environment, challenge, revealedInfo
3. **Constraints**: Follow background tone/motifs and character motivations
4. Reference ≥1 PC per scene where natural
5. No contradictions with effectiveContext
6. Output valid JSON for the schema

**Context Provided**:
- Background Context (all fields)
- Characters Context (with motivations)
- Player Count (3-6)
- Effective Context (from previous scenes)
- Macro Scene (title, objective, sequence)

**Prerequisites**:
- For Scene N > 1: Scene N-1 must be locked
- Staleness check: versions must match current session versions

**Context Integration**:
- Build upon context from previous scenes
- Do not contradict established facts
- Reference key events, revealed info, state changes, NPC relationships, environmental changes, plot threads, player decisions
- Scene should feel like natural continuation

---

### 5. Delta Analysis Prompt
**File**: `api/delta_prompt.js`
**Status**: ✅ **ACTIVE** (Used for scene edit analysis)
**Purpose**: Compare old and new scene details to analyze semantic changes

**System Prompt**:
```
You are a DnD scene editor. Compare the old and new scene details below and analyze the changes.
```

**Output Schema**:
```json
{
  "updatedDetail": "SceneDetail",
  "delta": {
    "keysChanged": ["string"],
    "summary": "string"
  },
  "affectedScenes": [
    {
      "sceneId": "string",
      "reason": "string",
      "severity": "soft|hard"
    }
  ]
}
```

**Tasks**:
1. Compare both versions semantically
2. Identify changed keys (context-related)
3. Summarize the delta in natural language
4. Determine affected subsequent scenes and assign importance level
5. Return updated detail, delta summary, and affected scenes list

**Rules**:
- Return only JSON, no additional text
- "soft": Minor changes (state changes, minor updates)
- "hard": Major changes (new information, key events, plot changes)
- Only mark the next 2-3 scenes as affected
- Ignore only spelling/style differences
- Detect semantic changes

**Language Directive**:
```
All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. 
Do not use Turkish words or local idioms.
```

**Fallback**:
If AI analysis fails, programmatic fallback compares:
- keyEvents
- revealedInfo
- stateChanges
- contextOut fields (keyEvents, revealedInfo, stateChanges)

---

## 🔴 DEPRECATED/INACTIVE PROMPTS

### 6. Old Scene Detail Generation (TypeScript variants)
**Files**: 
- `api/generate_detail.ts` ⚠️ **DEPRECATED**
- `api/generate_detail_new.ts` ⚠️ **DEPRECATED** (Turkish language)
- `api/generate_detail_backup.ts` ⚠️ **DEPRECATED**
- `api/generate_detail_backup2.ts` ⚠️ **DEPRECATED**

**Status**: ❌ **INACTIVE**

**Note**: These files contain older versions of the scene detail generation logic. They use simpler prompts:
- `generate_detail.ts`: "You are a DnD GM assistant that writes scene details consistent with previous context. All text output must be in English... MUST include skillChallenges field..."
- `generate_detail_new.ts`: Uses Turkish language ("MUTLAKA skillChallenges alanını dahil et...")
- `generate_detail_backup.ts` & `generate_detail_backup2.ts`: Basic versions without language directives

**Replaced By**: `api/generate_detail.js` with new narrative core structure

---

## 📋 Prompt Templates (from `api/lib/prompt.js`)

### Template 1: `renderDetailTemplate()`
**Status**: ✅ **ACTIVE** (Used by Scene Detail Generation)

**Purpose**: Renders the Scene Detail template with new composition structure

**Parameters**:
- background: Background context
- characters: Characters context
- numberOfPlayers: Number of players
- effectiveContext: Context from previous scenes
- macroScene: The macro scene to detail

**Returns**: The rendered prompt string

**Context Blocks**:
1. **BACKGROUND_CONTEXT**:
   - PREMISE
   - TONE_RULES (use these to set emotional tone)
   - STAKES (connect scene to these conflicts)
   - MYSTERIES (reveal these gradually)
   - LOCATIONS (choose from these places)
   - NPCs (these characters should appear)
   - MOTIFS (weave these themes throughout)
   - CONSTRAINTS (follow these rules)
   - PLAYSTYLE (consider these implications)

2. **CHARACTERS** (these PCs will be in the scene):
   - List with name, class, motivation
   - CHARACTER MOTIVATIONS (use to shape scene beats)

3. **PLAYER COUNT**:
   - Generate details for group size
   - Consider complexity for party size
   - Balance beats to engage all characters
   - Reference ≥1 PC per scene where natural

4. **EFFECTIVE_CONTEXT** (from previous scenes):
   - JSON of previous context OR "No previous scenes - this is the first scene"
   - CONTEXT_INTEGRATION rules

### Template 2: `renderChainTemplate()`
**Status**: ✅ **ACTIVE** (Used by Macro Chain Generation)

**Purpose**: Renders the Macro Chain template

**Parameters**:
- background: Background context
- characters: Characters context
- numberOfPlayers: Number of players
- style_prefs: Style preferences

**Returns**: The rendered prompt string

**Context Blocks**: Similar to Detail Template but focused on macro-level scene planning

---

## 🔧 Prompt Context Builder

### `buildPromptContext(sessionId)`
**File**: `api/lib/promptContext.js`
**Status**: ✅ **ACTIVE**

**Purpose**: Builds consistent prompt context from session data with versioning

**Returns**:
```javascript
{
  background: Object | null,
  characters: { list: Array, locked: boolean, version: number },
  style_prefs: Object | null,
  story_facts: Object | null,
  world_state: Object | null,
  world_seeds: Object | null,
  numberOfPlayers: number, // clamped 3-6, default 4
  versions: {
    backgroundV: number,
    charactersV: number,
    macroSnapshotV: number
  }
}
```

**Validation Functions**:
- `isStale(uses, meta)`: Checks if context versions match
- `makeMacroSnapshotV(meta)`: Creates macro snapshot version
- `checkMacroChainLocks(sessionContext)`: Validates background and characters are locked
- `checkPreviousSceneLock(sessionContext, sceneOrder)`: Validates previous scene is locked
- `createContextSummary(effectiveContext)`: Formats context summary

---

## 🎯 Prompt Usage Flow

### Background Generation Flow:
```
User Input → Story Concept
    ↓
Background Generation Prompt
    ↓
GPT-4o (temp: 0.7)
    ↓
Background JSON (10 fields + numberOfPlayers)
    ↓
Stored in session context
```

### Character Generation Flow:
```
Locked Background → Session Context
    ↓
Character Generation Prompt
    ↓
GPT-4o (temp: 0.7, max_tokens: 4000)
    ↓
Characters JSON (numberOfPlayers characters with 15 fields each)
    ↓
Stored in session context
```

### Macro Chain Generation Flow:
```
Locked Background + Locked Characters → buildPromptContext()
    ↓
Macro Chain Generation Prompt
    ↓
GPT-4o (temp: 0.7)
    ↓
Macro Chain JSON (5-6 scenes)
    ↓
Stored in session context with version tracking
```

### Scene Detail Generation Flow:
```
Macro Scene + Effective Context + buildPromptContext()
    ↓
Scene Detail Generation Prompt (renderDetailTemplate)
    ↓
GPT-4o (temp: 0.8)
    ↓
Scene Detail JSON (new narrative core structure)
    ↓
Context migration (old → new structure)
    ↓
Version tracking added
    ↓
Stored in session context
```

### Delta Analysis Flow:
```
Old Scene Detail + New Scene Detail
    ↓
Delta Analysis Prompt
    ↓
AI Analysis
    ↓
Delta JSON (keysChanged, summary, affectedScenes)
    ↓
[Fallback to programmatic delta if AI fails]
    ↓
Return delta analysis
```

---

## 🔍 Language Directive

All active prompts include this directive:
```
All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. 
Do not use Turkish words or local idioms.
```

This ensures consistent, professional English output across all AI-generated content.

---

## 📊 Model Configuration

**Current Active Model**: GPT-4o (OpenAI)
**Configuration File**: `api/model.js`

**Temperature Settings**:
- Background Generation: 0.7
- Character Generation: 0.7
- Macro Chain Generation: 0.7
- Scene Detail Generation: 0.8
- Delta Analysis: (Not specified, likely 0.7 default)

**Max Tokens**:
- Character Generation: 4000
- Others: Default (unspecified)

---

## 🔐 Prerequisites & Validation

### Background Generation:
- ✅ Story concept required
- ✅ No locks required

### Character Generation:
- ✅ Background must be locked
- ✅ Session ID required

### Macro Chain Generation:
- ✅ Background must be locked
- ✅ Characters must be locked
- ✅ Session ID required
- ✅ Story concept required

### Scene Detail Generation:
- ✅ For Scene N > 1: Scene N-1 must be locked
- ✅ Version staleness check
- ✅ Session ID required
- ✅ Macro scene required
- ✅ Scene ID required

---

## 📝 Notes

1. **Version Tracking**: All scene details now include version tracking with `uses` field
2. **Staleness Detection**: Prevents generating scenes with outdated context
3. **Lock Workflow**: Enforces proper dependency chain (Background → Characters → Macro Chain → Scene Details)
4. **Context Migration**: Old scene detail structure automatically migrated to new structure
5. **Fallback Handling**: Delta analysis has programmatic fallback if AI analysis fails
6. **Player Count**: Properly clamped between 3-6 with default of 4 across all prompts

---

## 🔄 Recent Changes

1. **New Scene Detail Structure**: Implemented Goal→Conflict→Revelation→Transition narrative core
2. **Context Migration**: Added automatic migration from old `dynamicElements.contextOut` to top-level `contextOut`
3. **Enhanced Context**: Added comprehensive context blocks (background, characters, player count)
4. **Language Enforcement**: Added English language directive to all prompts
5. **Version Tracking**: Implemented version staleness detection for scene generation

---

Last Updated: 2025-10-21

