# Character Generation Refactor - D&D Style Implementation

## Overview

The `/api/characters/generate.js` endpoint has been completely refactored to generate 3–5 **playable characters** with detailed backgrounds and relational context, following SRD 2014 style guidelines.

## Key Changes

### 1. New Output Schema

The character generation now produces characters with the following detailed structure:

```json
{
  "characters": [
    {
      "name": "string",
      "role": "string",
      "race": "string",
      "class": "string",
      "personality": "string",                 // 2–3 sentences
      "motivation": "string",                  // what drives them in the story
      "connectionToStory": "string",           // direct link to background
      "gmSecret": "string",                    // hidden truth or past connection
      "potentialConflict": "string",           // internal or external tension
      "voiceTone": "string",                   // how they speak or behave
      "inventoryHint": "string",               // small symbolic item
      "motifAlignment": ["string"],            // motifs from background
      "backgroundHistory": "string",           // full backstory paragraph (1–2 short paragraphs)
      "keyRelationships": ["string"],          // other people, factions, or NPCs they know
      "flawOrWeakness": "string"               // defining flaw, vice, or vulnerability
    }
  ]
}
```

### 2. Enhanced AI Prompt Engineering

The prompt has been completely rewritten to focus on:

- **Lore & World Integration**: Uses Background Context data (where, when, tone, motifs, anchors) to guide realism
- **D&D-Level Background Depth**: Based on SRD 2014 manuals with mini origin stories
- **Relationships and Hooks**: Creates 2–3 narrative connections per character
- **Flaws & Secrets**: Playable flaws and GM secrets that avoid clichés
- **Motif Resonance**: Symbolic connections to visual themes from background
- **Playability Focus**: English-only, immersive, GM-friendly content

### 3. Improved Validation

- Validates all required fields for each character
- Ensures array fields (motifAlignment, keyRelationships) are properly formatted
- Generates 3–5 characters as specified
- Enhanced error messages for debugging

### 4. Updated TypeScript Types

The `Character` interface in `/src/types/macro-chain.ts` has been updated to match the new schema:

```typescript
export interface Character {
  id: string;
  name: string;
  role: string;
  race: string;
  class: string;
  personality: string;
  motivation: string;
  connectionToStory: string;
  gmSecret: string;
  potentialConflict: string;
  voiceTone: string;
  inventoryHint: string;
  motifAlignment: string[];
  backgroundHistory: string;
  keyRelationships: string[];
  flawOrWeakness: string;
}
```

### 5. Response Structure Update

- Changed from `list` to `characters` in the response
- Updated session context storage to use `characters` field
- Maintains backward compatibility with existing session management

## Design Requirements Met

### ✅ Lore & World Integration
- Characters' backgrounds make sense in the established setting
- Tone consistency maintained (gothic mystery vs heroic comedy)
- Motifs from background context are incorporated

### ✅ D&D-Level Background Depth
- Each character has a mini origin story (1–2 paragraphs)
- Includes upbringing, defining event, and reason for joining
- Style based on SRD 2014 Player's Handbook & Xanathar's Guide

### ✅ Relationships and Hooks
- 2–3 key relationships per character
- At least one ties back to background anchors or motifs
- Can appear as NPCs or Scene hooks later

### ✅ Flaws & Secrets
- Playable flaws and GM secrets
- Avoids generic clichés like "trust issues"
- Examples: addiction, guilt, forbidden love, secret oath, betrayal, curse

### ✅ Motif Resonance
- Characters symbolically connected to visual themes
- Motifs mentioned naturally in personality or background
- Creates thematic consistency across the campaign

### ✅ Playability Focus
- All content in English
- Immersive and concise for GMs and players
- No stats or numeric mechanics (narrative only)

## Testing

### Test Files Created

1. **`test-character-generator.html`** - Interactive web interface for testing
   - Allows input of story concept, tone, and pacing
   - Displays generated characters in a readable format
   - Shows all character fields and relationships

2. **`test-character-api.js`** - Node.js test script
   - Tests API endpoint directly
   - Validates response structure and required fields
   - Provides detailed output for debugging

### Usage

```bash
# Start the server
npm start

# Test via web interface
open test-character-generator.html

# Test via Node.js script
node test-character-api.js
```

## Integration Points

### Background Context Input

The endpoint expects background context in this format:

```json
{
  "sessionId": "string",
  "backgroundContext": {
    "fiveWoneH": { "who": {}, "what": {}, "where": {}, "when": {}, "why": {}, "how": {} },
    "backgroundSummary": "string",
    "anchors": ["string"],
    "gmSecrets": ["string"],
    "motifs": ["string"],
    "tone": "string",
    "pacing": "string"
  }
}
```

### Future Scene Integration

Generated characters are designed to integrate with:
- **Scene Detail Generation**: Characters' motivations and flaws can drive scene dynamics
- **MacroChain Generation**: Character relationships can influence scene objectives
- **NPC Generation**: Key relationships can become NPCs in scenes

## Example Output

```json
{
  "characters": [
    {
      "name": "Elara Morn",
      "role": "Wandering Scholar",
      "race": "Human",
      "class": "Bard",
      "personality": "Curious and introspective, Elara studies forgotten texts with near-religious devotion. Her calm manner hides restless curiosity.",
      "motivation": "To uncover the truth behind the vanished lord mentioned in the invitation.",
      "connectionToStory": "Her mentor once corresponded with the missing owner of the manor.",
      "gmSecret": "Elara's mentor was responsible for the manor's downfall.",
      "potentialConflict": "Her pursuit of knowledge may endanger others when she refuses to turn away from forbidden truths.",
      "voiceTone": "Soft and deliberate, often speaking as if teaching a lesson.",
      "inventoryHint": "An aged journal filled with half-translated runes.",
      "motifAlignment": ["unread letters", "mirrors"],
      "backgroundHistory": "Born to a family of historians in the capital, Elara devoted her youth to chasing legends of cursed estates. She uncovered fragments of a tale about a manor where the guests never left. When a letter bearing the same crest arrived at her door, she knew her studies had become real. Now she walks into the story she once documented, both terrified and fascinated.",
      "keyRelationships": ["Mentor: Orlin Voss, historian of lost estates", "Estranged sister: Lyssia Morn, now part of the royal court", "Rival scholar: Tamir Drenn"],
      "flawOrWeakness": "She believes every mystery must be solved, even when the answers destroy her."
    }
  ]
}
```

## Acceptance Criteria ✅

- [x] Endpoint `/api/characters/generate.js` updated to new schema
- [x] Output 3–5 playable characters with detailed D&D-level backgrounds
- [x] Each includes relationships, flaws, secrets, and symbolic motifs
- [x] All text in English; no stats or numeric mechanics
- [x] JSON valid and consistent with the schema
- [x] Ready for integration with Scene Detail and MacroChain layers
- [x] TypeScript types updated to match new schema
- [x] Test files created for validation
- [x] Enhanced validation and error handling

## Next Steps

The character generation system is now ready for integration with:
1. **Scene Detail Generation** - Characters' motivations and flaws can drive scene dynamics
2. **MacroChain Generation** - Character relationships can influence scene objectives  
3. **NPC Generation** - Key relationships can become NPCs in scenes
4. **Frontend Integration** - Update UI components to display the new character structure

The system maintains full backward compatibility while providing rich, playable character data that enhances the overall storytelling experience.
