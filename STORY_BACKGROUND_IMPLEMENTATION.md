# Story Background Generator - 5N1K with Reveal Logic

## Overview

The Story Background Generator is a new feature that expands short story concepts into comprehensive GM backgrounds using a flexible 5N1K framework. Unlike traditional approaches that force all answers to be absolute, this system intelligently identifies which elements are knowable and which should remain mysterious for later discovery.

## Design Philosophy

This layer's job isn't to reveal the whole mystery; it's to ensure the world makes sense. It defines the skeleton of reality ("Where are we?", "Who's involved?") and flags what's deliberately unknown ("Why is this happening?").

## Features

### 5N1K Framework with Reveal Logic

Each 5N1K field includes:
- **value**: The actual content/answer
- **status**: `known` | `unknown` | `speculative`
- **revealPlan**: `early` | `mid` | `late` | `never`
- **confidence**: Number between 0.0 and 1.0

### Field Expectations

| Field | Type | Expectation |
|-------|------|-------------|
| Who | concrete or partial | Usually answerable (host, sender, faction, or rumor) |
| What | concrete | Define the event, object, or situation players are dealing with |
| Where | concrete | Location, setting type, and mood |
| When | concrete or contextual | Time, season, symbolic moment (e.g., anniversary night) |
| Why | speculative | May be unknown or intentionally hidden. Mark with status: "unknown" |
| How | partial | The method or strange mechanism; can be described but not fully explained |

### Additional Context Elements

- **backgroundSummary**: 2-3 paragraph atmospheric summary in Turkish
- **anchors**: Fixed points that don't change throughout scenes
- **unknowns**: Elements deliberately left hidden
- **gmSecrets**: Information players shouldn't know
- **motifs**: Recurring symbols or visual themes
- **hooks**: Story elements that draw players in
- **continuityFlags**: Consistency notes
- **tone** and **pacing**: Single-word labels

## API Endpoint

### POST /api/generate_background

**Request:**
```json
{
  "storyConcept": "Your story concept here..."
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "fiveWoneH": {
      "who": {
        "value": "Esmond Malikanesi'nin gizemli sahibi",
        "status": "known",
        "revealPlan": "early",
        "confidence": 0.9
      },
      "what": {
        "value": "Bir grup yabancının gizemli bir davete katılması",
        "status": "known",
        "revealPlan": "early",
        "confidence": 1.0
      },
      "where": {
        "value": "Kuzey Ormanı'nın içindeki Esmond Malikanesi",
        "status": "known",
        "revealPlan": "early",
        "confidence": 0.95
      },
      "when": {
        "value": "Kışın ortasında, ölüm yıldönümü gecesi",
        "status": "known",
        "revealPlan": "mid",
        "confidence": 0.85
      },
      "why": {
        "value": "Davetin gerçek amacı bilinmiyor",
        "status": "unknown",
        "revealPlan": "late",
        "confidence": 0.3
      },
      "how": {
        "value": "Davetiyeler mühürsüz zarflarla gizlice ulaştırılmış",
        "status": "known",
        "revealPlan": "early",
        "confidence": 0.9
      }
    },
    "backgroundSummary": "2-3 paragraf Türkçe atmosferik özet",
    "anchors": ["Malikane tekil bir lokasyon olarak sabitlenir", "Davetler aynı gün ulaşır"],
    "unknowns": ["Davetin amacı", "Gönderen kimliği"],
    "gmSecrets": ["Gerçek davet sahibi hala yaşıyor"],
    "motifs": ["mühürsüz zarflar", "aynalar", "karanlık orman"],
    "hooks": ["Bir zarfın kenarında aynı sembol", "Kasaba halkının dedikodusu"],
    "continuityFlags": ["Malikane her sahnede merkezde kalmalı"],
    "tone": "gizemli",
    "pacing": "dengeli"
  }
}
```

## Implementation Details

### Files Created/Modified

1. **`/api/generate_background.js`** - Main API handler with OpenAI integration
2. **`/server.js`** - Added new endpoint with mock data fallback
3. **`/src/types/macro-chain.ts`** - Added TypeScript interfaces
4. **`/src/components/StoryBackgroundGenerator.tsx`** - React component
5. **`/src/components/MacroChainApp.tsx`** - Integrated into main app
6. **`/test-background-generator.html`** - Standalone test interface
7. **`/test-background-api.js`** - API testing script

### AI Prompt Engineering

The system uses a carefully crafted Turkish prompt that:
- Emphasizes the distinction between known, assumed, and unknown elements
- Requires proper JSON structure with all required fields
- Maintains mystery while providing useful GM context
- Uses Turkish language throughout for consistency

### Mock Data Support

When no OpenAI API key is available, the system provides rich mock data that demonstrates the expected structure and functionality.

## Usage Examples

### Basic Usage

```javascript
const response = await fetch('/api/generate_background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    storyConcept: "Your story concept here..." 
  })
});

const data = await response.json();
console.log(data.data.fiveWoneH.who.value);
```

### React Component Usage

```tsx
import StoryBackgroundGenerator from './components/StoryBackgroundGenerator';

function MyApp() {
  const handleBackgroundGenerated = (background) => {
    console.log('Generated background:', background);
  };

  return (
    <StoryBackgroundGenerator 
      onBackgroundGenerated={handleBackgroundGenerated}
    />
  );
}
```

## Testing

### Manual Testing

1. **Standalone Interface**: Open `test-background-generator.html` in browser
2. **API Testing**: Run `node test-background-api.js`
3. **Integrated Testing**: Use the main application at `http://localhost:5173`

### Test Scenarios

1. **Valid Concept**: Should generate complete background with all fields
2. **Empty Concept**: Should return validation error
3. **No API Key**: Should fallback to mock data
4. **Network Error**: Should handle gracefully with error messages

## Integration with MacroChain System

The Story Background Generator integrates seamlessly with the existing MacroChain system:

1. **Context Sharing**: Background data can be used to inform chain generation
2. **Consistent Types**: Uses shared TypeScript interfaces
3. **UI Integration**: Appears in the main application sidebar
4. **Session Management**: Works with existing session context system

## Benefits

### For GMs
- **Clear World Building**: Provides factual context while preserving mystery
- **Reveal Planning**: Helps plan when to reveal information to players
- **Consistency**: Anchors ensure world consistency across scenes
- **Atmosphere**: Rich background summary sets the mood

### For System
- **Stability**: Fixed anchors prevent random setting drift
- **Coherence**: Scene details can reference stable facts
- **Flexibility**: Supports both known and unknown elements
- **Scalability**: Works with existing MacroChain and Scene Detail systems

## Future Enhancements

1. **Background-to-Chain Integration**: Use background data to inform chain generation
2. **Reveal Tracking**: Track which elements have been revealed to players
3. **Background Editing**: Allow GMs to modify generated backgrounds
4. **Template System**: Pre-built backgrounds for common story types
5. **Multi-language Support**: Extend beyond Turkish to other languages

## Troubleshooting

### Common Issues

1. **API Key Missing**: System falls back to mock data
2. **Invalid JSON**: Check OpenAI response parsing
3. **Network Errors**: Verify server is running on port 3000
4. **TypeScript Errors**: Ensure all interfaces are properly imported

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check browser console for detailed error messages.

## Acceptance Criteria ✅

- [x] JSON valid, Turkish, and structurally correct
- [x] At least 3 fields (who, where, when) are "known" or "speculative"
- [x] "Why" can safely remain "unknown" or "speculative"
- [x] GM receives both factual and interpretive context
- [x] Output remains suitable as upstream context for /api/generate_chain
- [x] Mock data support for development
- [x] React component integration
- [x] TypeScript type safety
- [x] Error handling and validation
- [x] Test interfaces and documentation
