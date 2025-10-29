# Prompts Reference Documentation

## Overview
This document catalogs all AI prompts used in the D&D Bug application, their purpose, and which ones are currently active.

**Last Verified**: October 29, 2025

---

## 🟢 ACTIVE PROMPTS (Currently in Use)

### 1. Background Generation Prompt
**File**: `api/generate_background.js`
**Status**: ✅ **ACTIVE**
**Model**: `gpt-4o`
**Temperature**: `0.7`

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
**Model**: `gpt-4o`
**Temperature**: `0.7`
**Max Tokens**: `4000`

**Purpose**: Create playable D&D PCs with detailed backgrounds

**System Prompt**:
```
You are a D&D GM character designer creating playable PCs with detailed backgrounds. 
Follow the rules strictly and return valid JSON only.
```

**Output Schema** (20 required fields per character):
**Core Fields**:
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

**SRD Character Sheet Integration Fields**:
- languages (array): 2-4 languages (e.g., 'Common', 'Elvish', 'Dwarvish')
- alignment (string): D&D alignment (e.g., 'Lawful Good', 'Chaotic Neutral')
- deity (string|null): Religious affiliation or deity worshiped
- physicalDescription (string): Detailed appearance including build, distinguishing features, clothing style
- equipmentPreferences (array): 3-5 preferred starting equipment items
- subrace (string|null): Specific subrace if applicable (e.g., 'High Elf', 'Wood Elf')
- age (number): Character's age in years
- height (string): Height in feet and inches format (e.g., "5'7\"", "6'2\"")
- proficiencies (array): 3-5 skill proficiencies, tool proficiencies, or other abilities

**Key Instructions**:
1. **Lore & World Integration**: Use background context (tone, motifs, anchors)
2. **D&D-Level Background Depth**: Base style on D&D 5e manuals (Player's Handbook & Xanathar's Guide)
3. **Relationships and Hooks**: Create 2-3 narrative connections (family, mentor, rival, guild, cult, etc.)
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
- All 20 fields must be present per character

---

### 3. Macro Chain Generation Prompt
**File**: `api/generate_chain.js`
**Status**: ✅ **ACTIVE**
**Model**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` (rotated randomly)
**Temperature**: `0.9` base + dynamic variation (0.0 to 0.19) = `0.9 to 1.0`
**Creativity Tracking**: ✅ Active (tracks approaches to avoid repetition)

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

**Creativity Enhancements**:
- Dynamic temperature variation based on session-aware variation seed
- Model rotation between gpt-4o, gpt-4o-mini, and gpt-4-turbo for variety
- Narrative style variations (poetic, direct, mysterious, conversational, scholarly, dramatic)
- Pacing variations (slow-burning, rapid-fire, alternating, escalating, episodic, continuous)
- Creativity direction prompts to avoid repetitive patterns
- Tracks recent approaches to ensure variety across sessions

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
**Model**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` (rotated randomly)
**Temperature**: `0.9` base + dynamic variation (0.0 to 0.24) = `0.9 to 1.0`
**Top P**: `0.95` base + dynamic variation (0.0 to 0.14) = `0.95 to 1.0`
**Creativity Tracking**: ✅ Active (20 approaches tracked)

**Purpose**: Create detailed scene content with new narrative core structure

**System Prompt** (Enhanced with Creativity Directives):
```
You are a D&D GM assistant creating detailed scene content. Follow the rules strictly and return valid JSON only. 
All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. 
Do not use Turkish words or local idioms.

CREATIVE APPROACH: [One of 20 dynamic approaches]
DETAIL_STYLE: [One of 6 styles: rich evocative, clinical analytical, conversational, mysterious, dramatic, scholarly]
COMPLEXITY_LEVEL: [One of 3 levels: intricate multi-layered, simple direct, complex interconnected]
VARIATION_SEED: [Session-aware variation number]
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

**Creativity System**:
- **20 Creative Approaches**: Rotated to avoid repetition (e.g., "Focus on immersive sensory details", "Emphasize character interactions", "Create dynamic challenges", etc.)
- **Detail Styles**: Rich evocative, clinical analytical, conversational, mysterious, dramatic, scholarly
- **Complexity Levels**: Intricate multi-layered, simple direct, complex interconnected
- **Recent Approach Tracking**: Prevents repetitive patterns across scenes
- **Dynamic Parameters**: Temperature and top_p vary per generation for increased creativity

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

### 5. Next Scene Generation Prompt
**File**: `api/generate_next_scene.js` (via `api/lib/prompt.js`)
**Status**: ✅ **ACTIVE**
**Model**: `gpt-4o`
**Temperature**: `0.8`
**Top P**: `0.9`

**Purpose**: Generate the next scene in a chain based on previous scene and GM intent

**System Prompt**:
```
You are a D&D GM assistant helping to expand a scene chain iteratively. Follow the rules strictly and return valid JSON only.
```

**Output Schema**:
```json
{
  "title": "Scene title that matches the tone_rules and uses background elements",
  "objective": "One-sentence purpose that connects to background stakes/mysteries",
  "sequence": [next sequence number]
}
```

**Key Instructions**:
1. Create the NEXT SCENE that logically follows the previous scene and the GM's intent
2. Build naturally from the previous scene
3. Incorporate the GM's specific intent
4. Respect BACKGROUND tone/motifs and CHARACTERS motivations
5. Do not contradict EFFECTIVE_CONTEXT
6. Use specific locations/NPCs from the background when appropriate
7. Keep objective focused on purpose only - no micro-details about implementation

**Context Provided**:
- Background Context (all fields)
- Characters Context (if available)
- Previous Scene (title, objective, sequence)
- Effective Context (from locked predecessors)
- GM Intent (user-provided direction for the next scene)

**Critical**: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.

---

### 6. Character Regeneration Prompt
**File**: `api/characters/regenerate.js`
**Status**: ✅ **ACTIVE**
**Model**: `gpt-4o`
**Temperature**: `0.9`

**Purpose**: Regenerate a specific character field while maintaining consistency with existing character and background

**Regenerable Fields**:
- personality
- motivation
- connectionToStory
- gmSecret
- potentialConflict
- voiceTone
- inventoryHint
- backgroundHistory
- flawOrWeakness

**System Prompt**:
```
You are a D&D GM character designer regenerating a specific field for an existing character. 
Follow the rules strictly and return valid JSON only.
```

**Key Instructions**:
1. **Lore & World Integration**: Use Background Context data to guide realism
2. **Character Consistency**: Regenerated field must be consistent with existing character's other fields
3. **Field-Specific Requirements**:
   - **gmSecret**: Must be 2-3 sentences of rich, interconnected lore connecting to background context
   - **backgroundHistory**: Should read like a mini origin story (1-2 paragraphs, max 10 lines)
   - **personality**: Focus on personality traits and behavior patterns (2-3 sentences)
4. **GM Intent Integration**: If GM intent provided, incorporate it while maintaining consistency

**Output Schema**:
```json
{
  "regeneratedField": "The new value for [fieldName]"
}
```

**Prerequisites**:
- Background must be generated
- Characters must be generated
- Characters must NOT be locked (locked characters cannot be edited)

**Output**: Returns only the regenerated field value, not the full character object.

---

### 7. Delta Analysis (Programmatic)
**File**: `api/delta_service.js` (used by `api/apply_edit.js`)
**Status**: ✅ **ACTIVE** (Programmatic analysis - AI prompt exists but is not currently used)
**AI Prompt File**: `api/delta_prompt.js`
**AI Prompt Status**: ⚠️ **AVAILABLE BUT NOT USED**

**Purpose**: Compare old and new scene details to analyze semantic changes and determine impact on subsequent scenes

**Current Implementation**: Programmatic analysis (not AI-based)

**Analysis Method**:
The system compares old and new scene details programmatically by examining:
- `keyEvents`: Array of key events that occurred
- `revealedInfo`: Array of information revealed
- `stateChanges`: Object with state changes
- `contextOut.keyEvents`: Key events in context output
- `contextOut.revealedInfo`: Revealed info in context output
- `contextOut.stateChanges`: State changes in context output
- `contextOut.npcRelationships`: NPC relationship changes

**Output Schema**:
```json
{
  "delta": {
    "keysChanged": ["string"],
    "summary": "string"
  },
  "updatedDetail": "SceneDetail",
  "affectedScenes": [
    {
      "sceneId": "string",
      "reason": "string",
      "severity": "soft|hard"
    }
  ]
}
```

**AI Prompt** (Available but not currently used):
If enabled in the future, the AI prompt would:
1. Compare both versions semantically
2. Identify changed keys (context-related)
3. Summarize the delta in natural language
4. Determine affected subsequent scenes and assign importance level
5. Return updated detail, delta summary, and affected scenes list

**Severity Levels**:
- "soft": Minor changes (state changes, minor updates)
- "hard": Major changes (new information, key events, plot changes)

**Rules**:
- Only mark the next 2-3 scenes as affected
- Ignore only spelling/style differences
- Detect semantic changes

**Note**: The AI prompt infrastructure exists in `api/delta_prompt.js` but `api/apply_edit.js` currently uses the programmatic `analyzeDelta()` function from `api/delta_service.js` instead.

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

**Current Active Models**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` (OpenAI)
**Configuration File**: `api/model.js`

**Model Usage**:
- **Background Generation**: `gpt-4o` only
- **Character Generation**: `gpt-4o` only
- **Macro Chain Generation**: Rotates between `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- **Scene Detail Generation**: Rotates between `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- **Next Scene Generation**: `gpt-4o` only
- **Character Regeneration**: `gpt-4o` only
- **Delta Analysis**: Programmatic (no AI model used)

**Temperature Settings**:
- Background Generation: `0.7` (fixed)
- Character Generation: `0.7` (fixed)
- Character Regeneration: `0.9` (fixed)
- Macro Chain Generation: `0.9` base + dynamic variation (0.0 to 0.19) = `0.9 to 1.0`
- Scene Detail Generation: `0.9` base + dynamic variation (0.0 to 0.24) = `0.9 to 1.0`
- Next Scene Generation: `0.8` (fixed)

**Top P Settings**:
- Scene Detail Generation: `0.95` base + dynamic variation (0.0 to 0.14) = `0.95 to 1.0`
- Next Scene Generation: `0.9` (fixed)
- Others: Not specified (uses default)

**Max Tokens**:
- Character Generation: `4000`
- Others: Default (unspecified, typically 4096 for GPT-4 models)

**Creativity Tracking**:
- Macro Chain Generation: ✅ Active (tracks narrative styles and pacing)
- Scene Detail Generation: ✅ Active (tracks 20 different approaches)
- Purpose: Prevents repetitive patterns across sessions

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

## 🔄 Recent Changes (Verified October 29, 2025)

1. **Character Generation Enhanced**: Now generates 20 fields per character (added SRD character sheet integration fields: languages, alignment, deity, physicalDescription, equipmentPreferences, subrace, age, height, proficiencies)

2. **Dynamic Temperature System**: Implemented for Macro Chain and Scene Detail generation:
   - Base temperature 0.9 with session-aware variation
   - Increases creativity and reduces repetitive patterns

3. **Model Rotation**: Macro Chain and Scene Detail generation now rotate between `gpt-4o`, `gpt-4o-mini`, and `gpt-4-turbo` for variety

4. **Creativity Tracking System**: 
   - Macro Chain: Tracks narrative styles and pacing approaches
   - Scene Detail: Tracks 20 different creative approaches to avoid repetition

5. **Next Scene Generation**: New prompt added for iterative scene chain expansion based on GM intent

6. **Character Regeneration**: New prompt added for regenerating individual character fields

7. **Delta Analysis**: Currently uses programmatic analysis; AI prompt available but not active

8. **New Scene Detail Structure**: Implemented Goal→Conflict→Revelation→Transition narrative core

9. **Context Migration**: Added automatic migration from old `dynamicElements.contextOut` to top-level `contextOut`

10. **Enhanced Context**: Added comprehensive context blocks (background, characters, player count)

11. **Language Enforcement**: Added English language directive to all prompts

12. **Version Tracking**: Implemented version staleness detection for scene generation

---

**Last Verified**: October 29, 2025
**Next Review**: When prompt implementations change or new prompts are added

