# Enhanced Skeleton Generation Features

This document describes the new features implemented for the D&D skeleton generation system.

## GPT-4o Model Upgrade

The system now uses GPT-4o instead of GPT-5 for improved performance and reliability.

## System Prompts

### Campaign Lore and House Rules
- **World Structure**: Magical and dangerous environment with political tensions
- **House Rules**: Player choices drive the story, NPCs have their own motivations
- **Themes**: Power and responsibility, past and future connections, individual vs societal interests

### Conversation Memory
- **NPC Tracking**: Each NPC has personality, motivation, and relationship status
- **Plot Threads**: Active, resolved, or abandoned storylines with connections
- **Player Decisions**: Track choices and their consequences with impact levels

### Structured Outputs
- **Stat Blocks**: Detailed character statistics, abilities, and equipment
- **Encounters**: Enemy composition, tactics, environmental factors, and rewards
- **Loot**: Equipment, currency, information, and social rewards

## Temperature Settings

The system now uses temperature settings between 0.7-0.9 for creative but coherent content generation.

## Usage Example

```typescript
import { generateSkeletonV2, createConversationMemory } from './api/genSkeleton.js'

// Create conversation memory
const memory = createConversationMemory()

// Generate skeleton with enhanced features
const skeleton = await generateSkeletonV2(
  client, 
  input, 
  memory, 
  0.8 // Temperature setting
)
```

## Key Features

1. **Enhanced Context**: System prompts provide rich campaign lore and house rules
2. **Memory System**: Tracks NPCs, plot threads, and player decisions across sessions
3. **Structured Outputs**: Organized stat blocks, encounters, and loot generation
4. **Temperature Control**: Configurable creativity levels (0.7-0.9)
5. **GPT-4o Integration**: Latest model for improved performance

## Benefits

- More consistent and lore-appropriate content generation
- Better continuity across game sessions
- Enhanced NPC interactions and plot development
- Structured approach to game elements
- Improved creative output with controlled randomness
