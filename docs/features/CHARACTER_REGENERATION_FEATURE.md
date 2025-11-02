# Character Regeneration Feature

## Overview
Added a "Regenerate Characters" button that allows users to generate a new set of characters if they're not satisfied with the initial generation or if the number of players has changed in the background settings.

## Implementation Details

### Location
- **File**: `src/components/pages/CharactersPage.tsx`
- **Button Position**: Next to the "Lock Characters" button in the action buttons section

### Functionality

#### Button Visibility
The "Regenerate Characters" button is visible when:
- Characters have been generated (characters.length > 0)
- Appears alongside the "Lock Characters" button

#### Button States
The button is **disabled** when:
- Characters are locked (user must unlock first)
- Background is not locked
- Loading is in progress

#### Pre-Regeneration Checks
Before regenerating, the function validates:
1. **Background Lock Status**: Background must be locked before regenerating characters
2. **Character Lock Status**: Characters must NOT be locked (prevents accidental regeneration of locked characters)
3. **User Confirmation**: Shows a confirmation dialog with the number of players that will be generated

#### Number of Players
- Retrieved from `context.blocks.background.numberOfPlayers`
- Defaults to 4 if not specified
- Displayed in the confirmation message to inform users how many characters will be generated
- Range: 3-6 players (validated on the backend)

### User Flow

1. **User clicks "Regenerate Characters"**
   - System checks if background is locked ✓
   - System checks if characters are NOT locked ✓
   - Retrieves number of players from background

2. **Confirmation Dialog**
   ```
   Are you sure you want to regenerate characters? 
   This will create [N] new characters and replace the existing ones.
   ```

3. **Generation Process**
   - Calls `/api/characters/generate` endpoint
   - Uses the same generation logic as initial character creation
   - Respects the `numberOfPlayers` setting from the background
   - Replaces existing characters with newly generated ones

4. **Post-Regeneration**
   - Updates character list
   - Sets character lock status to `false`
   - Updates session context
   - Refreshes the UI

### Error Handling

The feature includes comprehensive error handling for:
- Missing or unlocked background
- Locked characters (with helpful error message)
- API failures
- Network errors

All errors are logged with debug information for troubleshooting.

### Button Styling
- **Variant**: Secondary (distinguishes it from the primary "Lock Characters" button)
- **Tooltip**: Provides context-aware hints
  - When locked: "Unlock characters first to regenerate"
  - When unlocked: "Generate a new set of characters"

## Usage Scenarios

### Scenario 1: Number of Players Changed
1. User generates characters with 4 players
2. User realizes they need 5 players
3. User edits background to change numberOfPlayers to 5
4. User clicks "Regenerate Characters"
5. New set of 5 characters is generated

### Scenario 2: Unsatisfied with Generation
1. User generates initial characters
2. User doesn't like the generated personalities/backgrounds
3. User clicks "Regenerate Characters"
4. New set of characters is generated with different personalities

### Scenario 3: Accidental Protection
1. User generates and locks characters
2. User tries to click "Regenerate Characters"
3. Button is disabled (preventing accidental data loss)
4. User must consciously unlock characters first if they want to regenerate

## Technical Details

### API Endpoint
- **Endpoint**: `/api/characters/generate`
- **Method**: POST
- **Payload**: `{ sessionId: string }`
- **Response**: `{ ok: boolean, list: Character[], error?: string }`

### Context Updates
After successful regeneration:
```typescript
updatedContext.blocks.characters = {
  list: response.list || [],
  locked: false,
  version: Date.now()
};
```

### Debug Logging
Comprehensive debug logging throughout the process:
- Button click events
- Pre-generation validation
- Generation start/completion
- Success/failure states
- Exception handling

## Benefits

1. **Flexibility**: Users can regenerate characters without starting over
2. **Safety**: Locked characters are protected from accidental regeneration
3. **Transparency**: Confirmation dialog shows exact number of characters
4. **Consistency**: Uses the same generation logic as initial creation
5. **User Control**: Clear button state and helpful tooltips guide users

## Future Enhancements

Potential improvements for future iterations:
- Option to regenerate specific characters instead of all
- Preview mode before confirming regeneration
- Comparison view between old and new characters
- Save previous character sets as drafts

