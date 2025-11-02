# Bug Fix: Character Count Mismatch

**Date:** November 2, 2025  
**Severity:** Medium  
**Status:** ✅ Fixed

## Problem

Users were setting the number of players (e.g., to 2) in the UI, but the API was generating a different number of characters (e.g., 4). The selected player count was being ignored during character generation.

### Root Cause

The frontend was **not passing the `numberOfPlayers` parameter** to the API endpoint. The API was falling back to reading from the session context, which either:
1. Had not been updated yet with the new value
2. Was being clamped to the minimum value (3) 
3. Was using the default value (4)

**Code Evidence from Debug Log:**
```json
{
  "scope": "CharactersPage",
  "message": "Starting character regeneration",
  "data": {
    "sessionId": "project_1762114846888_x6con4zna",
    "numberOfPlayers": 2  // Frontend had the value
  }
}
{
  "scope": "api",
  "message": "POST /api/characters/generate",
  "data": {
    "body": {
      "sessionId": "project_1762114846888_x6con4zna"
      // ❌ Missing: numberOfPlayers!
    }
  }
}
{
  "response": {
    "playerCount": 4  // API generated 4 characters instead of 2
  }
}
```

## Solution

### 1. Frontend Changes (`CharactersPage.tsx`)

**Pass `numberOfPlayers` to API:**
```typescript
// Before
const response = await postJSON('/api/characters/generate', { sessionId });

// After
const response = await postJSON('/api/characters/generate', { sessionId, numberOfPlayers });
```

**Update UI validation to match API constraints (3-6 players):**
```typescript
// Input field
<Input
  type="number"
  min="3"  // Changed from "1"
  max="6"
  value={numberOfPlayers || ''}
/>

// Help text
<p className="text-xs text-[#A9B4C4] mt-2">
  This determines how many character slots will be generated (3–6 players)
</p>

// Validation logic
const clampedValue = Math.min(Math.max(numValue, 3), 6);  // Changed from (1, 6)
```

### 2. Backend Changes (`api/characters/generate.js`)

**Accept and prioritize request body parameter:**
```javascript
// Before
const { sessionId } = req.body;
const playerCount = promptContext.numberOfPlayers;

// After
const { sessionId, numberOfPlayers } = req.body;
const playerCount = numberOfPlayers !== undefined ? numberOfPlayers : promptContext.numberOfPlayers;
```

**Enhanced debug logging:**
```javascript
log.info('Character generation debug:', {
  sessionId,
  numberOfPlayersFromRequest: numberOfPlayers,  // What frontend sent
  playerCountFromContext: promptContext.numberOfPlayers,  // What context had
  playerCountUsed: playerCount,  // What we're actually using
  // ... other debug info
});
```

## Validation

### Valid Player Count Range
- **Minimum:** 3 players
- **Maximum:** 6 players  
- **Default:** 4 players

The system enforces this range both in the UI and API to ensure D&D-appropriate party sizes.

### Why 3-6 Players?
This range is clamped in the API (`api/characters/generate.js` line 171) and in the prompt context builder (`api/lib/promptContext.js` lines 48-51) because:
1. D&D campaigns typically work best with 3-6 players
2. The AI prompt is optimized for this range
3. Character generation quality degrades outside this range

## Testing

To verify the fix:

1. Set number of players to 3
2. Click "Generate Characters" or "Regenerate Characters"
3. Verify exactly 3 characters are created

Expected debug log output:
```json
{
  "scope": "CharactersPage",
  "message": "Starting character regeneration",
  "data": {
    "sessionId": "...",
    "numberOfPlayers": 3
  }
}
{
  "scope": "api", 
  "message": "Character generation debug",
  "data": {
    "numberOfPlayersFromRequest": 3,
    "playerCountFromContext": 4,
    "playerCountUsed": 3
  }
}
```

## Files Changed

- `src/components/pages/CharactersPage.tsx`
  - Line 143: Pass `numberOfPlayers` in generate request
  - Line 221: Pass `numberOfPlayers` in regenerate request  
  - Line 372: Update clamping to 3-6 range
  - Line 378: Update blur validation
  - Line 479-489: Update UI constraints and help text

- `api/characters/generate.js`
  - Line 137: Extract `numberOfPlayers` from request body
  - Line 148: Prioritize request parameter over context
  - Line 151-160: Enhanced debug logging

## Related Issues

- User reports of "regenerating produces wrong number of characters"
- Character count not matching selected player count
- Confusion about why 4 characters always generated

## Prevention

**For future API endpoints that depend on UI state:**
1. ✅ Always pass user-selected values explicitly in request body
2. ✅ Use context values only as fallback defaults
3. ✅ Add debug logging showing both request and context values
4. ✅ Validate UI constraints match API constraints
5. ✅ Document valid ranges in both code and UI

## See Also

- [Character Generation System](../implementation/CHARACTER_GENERATION_REFACTOR.md)
- [Prompt Context Builder](../guides/PROMPTS_REFERENCE.md)

