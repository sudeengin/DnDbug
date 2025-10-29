# Active Prompts Summary

Quick reference for all currently active AI prompts in the D&D Bug application.

---

## 🟢 1. Background Generation
**File**: `api/generate_background.js`  
**Model**: GPT-4o | **Temp**: 0.7  
**Purpose**: Generate story background from concept

### Prompt:
```
You are a DnD GM assistant. Generate a compact Story Background from a Story Concept.
All text output must be in English.
```

### Generates:
- premise, tone_rules, stakes, mysteries, factions
- location_palette, npc_roster_skeleton, motifs
- doNots, playstyle_implications, numberOfPlayers

### Prerequisites:
- ✅ Story concept
- ❌ No locks required

---

## 🟢 2. Character Generation
**File**: `api/characters/generate.js`  
**Model**: GPT-4o | **Temp**: 0.7 | **Max Tokens**: 4000  
**Purpose**: Create playable D&D PCs with detailed backgrounds

### Prompt:
```
You are a D&D GM character designer creating playable PCs with detailed backgrounds.
Follow the rules strictly and return valid JSON only.
```

### Generates (15 fields per character):
- name, role, race, class, personality
- motivation, connectionToStory, gmSecret (2-3 sentences rich lore)
- potentialConflict, voiceTone, inventoryHint
- motifAlignment, backgroundHistory, keyRelationships, flawOrWeakness

### Critical Requirements:
- **GM Secret**: Must be 2-3 sentences connecting to background lore, factions, or mysteries
- **Lore Integration**: Use background context for consistency
- **Relationships**: Create 2-3 narrative connections

### Prerequisites:
- ✅ Background must be locked
- ✅ Characters must be locked

---

## 🟢 3. Macro Chain Generation
**File**: `api/generate_chain.js`  
**Model**: GPT-4o | **Temp**: 0.7  
**Purpose**: Generate 5-6 scene macro chain

### Prompt:
```
You are a D&D GM assistant. You MUST use the provided BACKGROUND_CONTEXT as the primary 
foundation for creating scene chains.

CRITICAL: You MUST incorporate specific elements from the background context into your 
scene titles and objectives. Do not create generic scenes.
```

### Generates:
```json
{
  "scenes": [
    {
      "title": "Scene title using tone_rules and background elements",
      "objective": "Purpose connecting to stakes/mysteries"
    }
  ]
}
```

### Scene Structure:
- **Scenes 1-2**: Early exploration, introduce basic mysteries
- **Scenes 3-4**: Mid development, deepen investigation
- **Scenes 5-6**: Late resolution, address stakes and mysteries

### Context Provided:
- Background (premise, tone_rules, stakes, mysteries, locations, NPCs, motifs, doNots)
- Characters (if available)
- Player Count

### Prerequisites:
- ✅ Background must be locked
- ✅ Characters must be locked

---

## 🟢 4. Scene Detail Generation
**File**: `api/generate_detail.js` (via `api/lib/prompt.js`)  
**Model**: GPT-4o | **Temp**: 0.8  
**Purpose**: Create detailed scene content with narrative core

### Prompt:
```
You are a D&D GM assistant creating detailed scene content. Follow the rules strictly 
and return valid JSON only. All text output must be in English.
```

### New Structure (Goal→Conflict→Revelation→Transition):
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
      "npcProfiles": [...],
      "environment": "Detailed setting description",
      "challenge": {...},
      "revealedInfo": [...]
    },
    "contextOut": {
      "world_state": {},
      "story_facts": [...],
      "world_seeds": {...},
      "characterMoments": [...]
    }
  }
}
```

### Context Integration:
- Build upon context from previous scenes
- Do not contradict established facts
- Reference key events, revealed info, state changes, NPC relationships
- Reference ≥1 PC per scene where natural

### Context Blocks Provided:
1. **BACKGROUND_CONTEXT**: Premise, tone_rules, stakes, mysteries, locations, NPCs, motifs, constraints, playstyle
2. **CHARACTERS**: List with motivations
3. **PLAYER COUNT**: Party size considerations
4. **EFFECTIVE_CONTEXT**: Previous scene context OR "this is the first scene"

### Prerequisites:
- ✅ For Scene N > 1: Scene N-1 must be locked
- ✅ Version staleness check passes
- ✅ Session ID required

---

## 🟢 5. Delta Analysis
**File**: `api/delta_prompt.js`  
**Purpose**: Analyze semantic changes between scene versions

### Prompt:
```
You are a DnD scene editor. Compare the old and new scene details below and analyze the changes.
```

### Generates:
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

### Severity Levels:
- **soft**: Minor changes (state changes, minor updates)
- **hard**: Major changes (new information, key events, plot changes)

### Fallback:
Programmatic comparison if AI analysis fails

---

## 📊 Model Settings Summary

| Prompt | Model | Temperature | Max Tokens |
|--------|-------|-------------|------------|
| Background | GPT-4o | 0.7 | default |
| Characters | GPT-4o | 0.7 | 4000 |
| Macro Chain | GPT-4o | 0.7 | default |
| Scene Detail | GPT-4o | 0.8 | default |
| Delta Analysis | GPT-4o | 0.7 | default |

---

## 🔐 Lock Workflow

```
1. Generate Background (no locks required)
   ↓
2. Lock Background ✅
   ↓
3. Generate Characters (requires locked background)
   ↓
4. Lock Characters ✅
   ↓
5. Generate Macro Chain (requires both locked)
   ↓
6. Generate Scene 1 (no previous scene required)
   ↓
7. Lock Scene 1 ✅
   ↓
8. Generate Scene 2 (requires Scene 1 locked)
   ↓
... and so on
```

---

## 🎯 Player Count Handling

- **Input Range**: 3-6 players
- **Default**: 4 players
- **Validation**: Automatically clamped to range
- **Used In**: All prompts (background, characters, chain, scene detail)

---

## 🌍 Language Directive (All Prompts)

```
All text output must be in English. Use clear, natural language suitable for 
tabletop Game Masters. Do not use Turkish words or local idioms.
```

---

## 🔄 Version Tracking

All scene details include:
- `version`: Integer version number
- `uses`: Version info from context (backgroundV, charactersV, macroSnapshotV)
- `lastUpdatedAt`: ISO timestamp
- Staleness detection prevents outdated context usage

---

## 📁 Prompt Template Functions

### `renderDetailTemplate()` - ACTIVE
**File**: `api/lib/prompt.js`  
**Used By**: Scene Detail Generation

**Parameters**:
- background, characters, numberOfPlayers, effectiveContext, macroScene

**Returns**: Complete prompt string with all context blocks

### `renderChainTemplate()` - ACTIVE
**File**: `api/lib/prompt.js`  
**Used By**: Macro Chain Generation

**Parameters**:
- background, characters, numberOfPlayers, style_prefs

**Returns**: Complete prompt string for chain generation

---

## 🔧 Context Builder

### `buildPromptContext(sessionId)` - ACTIVE
**File**: `api/lib/promptContext.js`

**Returns**:
```javascript
{
  background: Object | null,
  characters: { list: [], locked: false, version: 0 },
  numberOfPlayers: 4, // clamped 3-6
  versions: {
    backgroundV: number,
    charactersV: number,
    macroSnapshotV: number
  }
}
```

**Validation Functions**:
- `isStale(uses, meta)` - Check version staleness
- `checkMacroChainLocks()` - Validate locks for chain generation
- `checkPreviousSceneLock()` - Validate previous scene lock
- `createContextSummary()` - Format effective context

---

Last Updated: 2025-10-21

