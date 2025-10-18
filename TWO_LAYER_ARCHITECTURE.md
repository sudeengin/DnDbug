# Two-Layer Scene Architecture Implementation

## 🎯 Overview

The Two-Layer Scene Architecture has been successfully implemented to improve the relationship between Scene Chain Overview and Scene Detailing phases. This architecture ensures that GM edits to scenes are preserved and influence subsequent scene generation, creating a more dynamic and context-aware storytelling system.

## 🏗️ Architecture Components

### Layer 1: Macro Chain (General Blueprint)
- **Purpose**: Generates high-level scene structure
- **Output**: 5-6 scene titles with general objectives only
- **No Details**: Character, environment, or skill check details are NOT included
- **Stability**: Provides consistent story skeleton that remains stable

### Layer 2: Micro Detailing (Context-Aware Scene Builder)
- **Purpose**: Generates detailed scenes with full context awareness
- **Context Integration**: Uses information from all previous completed scenes
- **Dynamic**: Each scene builds upon the context of previous scenes
- **State Propagation**: Maintains story continuity across scene transitions

## 🔧 Implementation Details

### New Context System (`/api/context.ts`)
```typescript
export type SceneContext = {
  scene_id: number;
  title: string;
  objective: string;
  key_events: string[];
  revealed_info: string[];
  state_changes: Record<string, any>;
  npc_relationships?: Record<string, any>;
  environmental_state?: Record<string, any>;
  plot_threads?: Array<any>;
  player_decisions?: Array<any>;
}
```

### Updated Scene Chain Generation
- **Simplified Schema**: Removed `branch_hint` and `improv_note` from macro level
- **Focus**: Only scene titles and general objectives
- **Word Count**: Reduced objective length to 8-15 words for macro level
- **Scene Count**: Optimized to 5-6 scenes for better macro planning

### Context-Aware Scene Detailing
- **Context Injection**: Previous scenes' context is automatically included
- **State Tracking**: NPC relationships, environmental changes, plot threads
- **Continuity**: Each scene builds naturally on previous events
- **GM Edits**: Changes made by GM are preserved and influence future scenes

## 🚀 Key Features

### 1. Context Propagation
- Each completed scene creates a context object
- Context includes key events, revealed information, state changes
- Subsequent scenes automatically receive this context
- Story continuity is maintained across all scenes

### 2. Dynamic State Management
- NPC relationships evolve based on interactions
- Environmental state changes are tracked
- Plot threads are maintained and updated
- Player decisions have lasting consequences

### 3. GM Edit Preservation
- When GM edits a scene, changes are preserved in context
- Future scenes automatically incorporate these changes
- No more context loss between scenes
- Story remains coherent despite GM modifications

### 4. Intelligent Scene Generation
- Scenes are generated with full awareness of previous events
- NPCs remember past interactions
- Environmental changes persist
- Plot threads continue naturally

## 📊 Benefits

### For GMs
- **Consistency**: Story remains coherent across all scenes
- **Flexibility**: Can edit scenes without breaking continuity
- **Context Awareness**: Each scene feels like a natural continuation
- **Reduced Work**: System maintains story state automatically

### For Players
- **Immersive Experience**: NPCs remember past interactions
- **Consequence Tracking**: Decisions have lasting effects
- **Story Coherence**: No jarring transitions between scenes
- **Dynamic World**: Environment and relationships evolve

## 🔄 Workflow

1. **Scene Chain Overview**: Generate macro-level scene structure
2. **Scene 1 Detailing**: Generate first scene with basic context
3. **GM Approval**: GM reviews and approves scene
4. **Context Creation**: System creates context object from approved scene
5. **Next Scene**: Generate subsequent scene with full context awareness
6. **Repeat**: Process continues with accumulating context

## 🛠️ Technical Implementation

### API Changes
- **Context Module**: New `/api/context.ts` for context management
- **Enhanced Prompts**: Context-aware prompting for scene generation
- **State Tracking**: Previous scenes stored and passed to API
- **Context Injection**: Automatic context inclusion in scene generation

### Frontend Updates
- **Context Display**: Shows number of previous scenes with context
- **State Management**: Tracks previous scenes for context propagation
- **Reset Functionality**: Clears context when starting new skeleton
- **Error Handling**: Maintains context on API errors

## 🎯 Strategic Advantages

1. **Living Story**: Story evolves organically based on GM edits and player actions
2. **Context Preservation**: No information loss between scenes
3. **Dynamic Relationships**: NPCs and world state change realistically
4. **Seamless Integration**: Works with existing GM workflow
5. **Scalable Architecture**: Can handle complex multi-scene campaigns

## 🔮 Future Enhancements

- **Advanced Context**: More sophisticated context tracking
- **Relationship Mapping**: Visual representation of NPC relationships
- **Plot Thread Visualization**: Track story threads across scenes
- **Context Analytics**: Insights into story development patterns
- **Export/Import**: Save and load context for campaign continuity

This implementation successfully addresses the original problem of context loss between scenes while maintaining the flexibility and power of the existing system. The Two-Layer Architecture provides a robust foundation for dynamic, context-aware storytelling that grows and evolves with GM creativity and player choices.
