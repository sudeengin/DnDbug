# Context-Aware Scene Detailing v1 Implementation

## 🎯 Overview

The Context-Aware Scene Detailing feature enables scene generation that considers the context from previous scenes, ensuring narrative consistency and continuity throughout the Macro Chain.

## 📦 Implementation Details

### 1. Type Definitions (`src/types/macro-chain.ts`)

```typescript
export interface ContextOut {
  keyEvents: string[];
  revealedInfo: string[];
  stateChanges: Record<string, any>;
  npcRelationships?: Record<string, {
    trust_level: number;
    last_interaction: string;
    attitude: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  }>;
  environmentalState?: Record<string, any>;
  plotThreads?: Array<{
    thread_id: string;
    title: string;
    status: 'active' | 'resolved' | 'abandoned';
    description: string;
  }>;
  playerDecisions?: Array<{
    decision_id: string;
    context: string;
    choice: string;
    consequences: string[];
    impact_level: 'low' | 'medium' | 'high';
  }>;
}

export interface SceneDetail {
  sceneId: string;
  title: string;
  objective: string;
  keyEvents: string[];
  revealedInfo: string[];
  stateChanges: Record<string, any>;
  contextOut: ContextOut;
  // ... additional scene detail fields
}
```

### 2. Context Merge Function (`api/context.ts`)

The `createEffectiveContext` function merges context from previous scenes:

```typescript
export function createEffectiveContext(previousContextOuts: any[]): any {
  const effectiveContext = {
    keyEvents: [],
    revealedInfo: [],
    stateChanges: {},
    npcRelationships: {},
    environmentalState: {},
    plotThreads: [],
    playerDecisions: []
  };

  // Process only the last 2 scenes to avoid context overflow
  const recentContexts = previousContextOuts.slice(-2);
  
  // Merge context from recent scenes...
  return effectiveContext;
}
```

### 3. API Endpoint (`api/generate_detail.js`)

The `/api/generate_detail` endpoint handles context-aware scene generation:

```javascript
POST /api/generate_detail
{
  "sceneId": "scene_1",
  "macroScene": {
    "id": "scene_1",
    "title": "The Tavern",
    "objective": "Meet the mysterious stranger",
    "order": 1
  },
  "effectiveContext": {
    "keyEvents": [...],
    "revealedInfo": [...],
    "stateChanges": {...},
    "npcRelationships": {...},
    "environmentalState": {...},
    "plotThreads": [...],
    "playerDecisions": [...]
  }
}
```

### 4. Prompt Template

The system prompt includes context-aware instructions:

```
You are a DnD GM assistant that writes scene details consistent with previous context.

CONSTRAINTS:
- Stay within the macro objective
- Use previous revealed info and state changes when relevant
- Do not contradict established facts
- Register any new revelations or changes under contextOut
- Build upon the context from previous scenes

IMPORTANT: 
- Use the context from previous scenes to inform the current scene generation
- The scene should feel like a natural continuation of the story
- Incorporate key events, revealed info, state changes, NPC relationships, environmental changes, plot threads, and player decisions from previous scenes
- Build upon this context while maintaining the original scene objective from the chain
- Do not contradict established facts from previous scenes
- Register any new revelations or changes under contextOut
```

### 5. UI Components

#### SceneDetailEditor Component
- Displays scene information and context
- Shows effective context from previous scenes
- Generates scene details with context awareness
- Displays JSON output option

#### Updated MacroChainBoard
- Added "Generate Scene Detail" buttons to each scene
- Integrated SceneDetailEditor for individual scene generation
- Tracks scene details and context progression

## 🔁 Context Flow

1. **Scene 1**: Generated with empty context
2. **Scene 2**: Generated with contextOut from Scene 1
3. **Scene 3**: Generated with merged contextOut from Scene 1 and Scene 2
4. **Scene N**: Generated with context from last 2 scenes (to prevent overflow)

## ✅ Test Scenarios

### Test 1: First Scene (No Context)
- Generates scene detail without previous context
- Validates basic functionality

### Test 2: Context Chain (3 Scenes)
- Tests complete context chain progression
- Validates context merging between scenes

### Test 3: NPC Relationship Context
- Tests how NPC relationships carry over
- Validates trust level and attitude changes

### Test 4: State Changes Context
- Tests world state changes (e.g., `trust_level_host: -1`)
- Validates state persistence across scenes

## 🚧 Risk Mitigation

### Context Overflow Prevention
- Only merges context from last 2 scenes
- Prevents exponential context growth

### Contradiction Prevention
- Prompt includes "do not contradict established facts"
- Context summary highlights key established facts

### Fallback Handling
- JSON parsing errors return fallback structure
- Missing context fields are populated with defaults

## 📋 Usage Instructions

1. **Generate Macro Chain**: Create your scene chain as usual
2. **Select Scene**: Click "Generate Scene Detail" on any scene
3. **View Context**: Review the context information from previous scenes
4. **Generate Detail**: Click "Generate Detail" to create context-aware content
5. **Review Output**: View the generated scene detail and context output
6. **Continue Chain**: Generate details for subsequent scenes to build context

## 🔧 API Usage

```javascript
// Generate scene detail with context
const response = await fetch('/api/generate_detail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sceneId: 'scene_1',
    macroScene: { /* scene data */ },
    effectiveContext: { /* merged context */ }
  })
});

const { data } = await response.json();
// data contains SceneDetail with contextOut
```

## 🎯 Benefits

1. **Narrative Consistency**: Scenes build upon each other naturally
2. **Character Development**: NPC relationships evolve realistically
3. **World State Tracking**: Environmental and plot changes persist
4. **Player Agency**: Decisions and consequences carry forward
5. **Context Awareness**: Each scene feels connected to the whole story

## 🔄 Future Enhancements

- Context weighting system for important vs. minor events
- Context search and filtering capabilities
- Visual context timeline
- Context export/import for campaign continuity
- Advanced context conflict resolution
