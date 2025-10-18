# Macro Chain Implementation

## Overview

This implementation provides a complete Macro Chain system for generating 5-6 scene story chains with reorder and inline edit capabilities, as specified in the Faz 0 requirements.

## Features Implemented

### ✅ Core Requirements
- **Single Story Concept Input**: Simple form with concept field and optional metadata
- **5-6 Scene Generation**: AI generates exactly 5-6 scenes with titles and objectives
- **Reorder Functionality**: Drag and drop to reorder scenes using @dnd-kit
- **Inline Edit**: Edit scene titles and objectives directly in the interface
- **JSON Schema Validation**: Comprehensive validation for all data structures
- **Telemetry Tracking**: Track generation and editing events

### ✅ API Endpoints
- `POST /api/generate_chain` - Generate new macro chain
- `POST /api/update_chain` - Update existing chain (reorder, edit)

### ✅ UI Components
- `StoryConceptForm` - Input form with concept and optional metadata
- `MacroChainBoard` - Drag-and-drop board with inline editing
- `MacroChainApp` - Main application component

### ✅ Data Types
- `MacroScene` - Individual scene with id, order, title, objective
- `MacroChain` - Complete chain with scenes and metadata
- `Playstyle` - Optional playstyle preferences
- `TelemetryEvent` - Event tracking structure

## File Structure

```
src/
├── types/
│   └── macro-chain.ts          # TypeScript type definitions
├── components/
│   ├── StoryConceptForm.tsx    # Story concept input form
│   ├── MacroChainBoard.tsx     # Drag-and-drop chain board
│   └── MacroChainApp.tsx       # Main application component
├── utils/
│   ├── macro-chain-validation.ts # JSON Schema validation
│   └── telemetry.ts             # Telemetry tracking service
└── lib/
    └── api.ts                   # API utility functions

api/
├── generate_chain.ts           # Generate chain endpoint
└── update_chain.ts             # Update chain endpoint
```

## API Specification

### POST /api/generate_chain

**Request:**
```typescript
{
  concept: string;           // Required: Story concept
  meta?: {                   // Optional metadata
    gameType?: string;
    players?: string;
    level?: string;
    playstyle?: {
      roleplayPct?: number;
      combatPct?: number;
      improv?: boolean;
    };
  };
}
```

**Response:**
```typescript
{
  ok: boolean;
  data: MacroChain;
}
```

### POST /api/update_chain

**Request:**
```typescript
{
  chainId: string;
  edits: Array<{
    type: 'reorder' | 'edit_title' | 'edit_objective';
    sceneId: string;
    newValue?: string;
    newOrder?: number;
  }>;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data: MacroChain;
}
```

## Validation Rules

### Macro Chain Validation
- Must have exactly 5-6 scenes
- Each scene must have unique ID, order, title, and objective
- Scene orders must be sequential starting from 1
- Titles should be concise (warnings for >100 chars)
- Objectives should be purposes, not outcomes

### Request Validation
- Story concept is required and cannot be empty
- Optional metadata fields must be proper types
- Playstyle percentages must be 0-100

## Telemetry Events

The system tracks the following events:
- `generate_chain` - When a new chain is generated
- `update_chain` - When a chain is updated
- `reorder_scene` - When scenes are reordered
- `edit_scene` - When scene titles/objectives are edited

## Usage

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Testing
Open `test-macro-chain.html` in a browser to test the API endpoints directly.

## Key Implementation Details

### Drag and Drop
- Uses @dnd-kit for React 19 compatibility
- Supports keyboard navigation
- Visual feedback during dragging
- Automatic order updates

### Inline Editing
- Click to edit titles and objectives
- Real-time validation
- Auto-save on blur/enter
- Supports multiline text for objectives

### Error Handling
- Comprehensive validation with detailed error messages
- Graceful fallbacks for API failures
- User-friendly error display
- Automatic reversion on failed updates

### Performance
- Optimized re-renders with React hooks
- Efficient drag and drop with minimal DOM updates
- Lazy loading of telemetry data
- Local storage for persistence

## Constraints Enforced

1. **5-6 Scenes Only**: Validation ensures exactly 5-6 scenes
2. **No Micro Details**: AI prompt specifically excludes mechanics, DCs, NPC stats, loot
3. **Objectives as Purposes**: Validation ensures objectives are goals, not outcomes
4. **Title Conciseness**: Warnings for overly long titles
5. **Sequential Ordering**: Scene orders must be 1, 2, 3, etc.

## Future Enhancements

- Database persistence for chains
- Export functionality
- Scene library integration
- Advanced playstyle preferences
- Collaborative editing
- Version history

## Dependencies Added

- `@dnd-kit/core` - Drag and drop functionality
- `@dnd-kit/sortable` - Sortable list components
- `@dnd-kit/utilities` - Utility functions

## Testing

The implementation includes:
- TypeScript compilation validation
- ESLint error checking
- Build process verification
- Manual testing interface (`test-macro-chain.html`)

All requirements from the Faz 0 specification have been successfully implemented and tested.
