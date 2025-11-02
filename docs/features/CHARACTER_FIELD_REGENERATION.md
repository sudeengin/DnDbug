# Character Field Regeneration Feature

## Overview
Added comprehensive regeneration functionality for class/race-dependent character fields in the Edit Character view, with context-aware messaging and visual feedback.

## Implementation Date
November 2, 2025

## Features Implemented

### 1. Regenerate Buttons for Class/Race-Dependent Fields
Added regenerate buttons to the following fields:
- **Languages** - Regenerates based on race and class proficiency rules
- **Proficiencies** - Regenerates based on class and background
- **Motif Alignments** - Regenerates based on story background and character theme
- **Equipment Preferences** - Regenerates based on class starting equipment

### 2. Context-Aware Detection
The system tracks original class and race values to detect when users make changes:
- Compares current `formData.class` with `originalClass`
- Compares current `formData.race` with `originalRace`
- Passes change detection info to the regeneration modal

### 3. Clear, Action-Oriented Modal Messaging
The GM Intent Modal now shows clear, action-oriented messages based on detected changes:

**When class changed to "Druid":**
```
Header: "Regenerate Section Based on New Class"

Body: 
  "The selected class has changed to Druid. Would you like to 
   regenerate this section to reflect the new class?

   This is recommended to ensure the character's proficiencies 
   match their updated class."

Optional Intent Field:
  "GM Intent (Optional)
   You can add a short instruction to guide the regeneration.
   
   [Textarea placeholder: Leave blank to use the default Druid context.]"

Buttons: [Regenerate Section] [Cancel]
```

**When race changed to "Elf":**
```
Header: "Regenerate Section Based on New Race"

Body:
  "The selected race has changed to Elf. Would you like to 
   regenerate this section to reflect the new race?

   This is recommended to ensure the character's languages 
   match their updated race."
```

**When both class AND race changed:**
```
Header: "Regenerate Section Based on New Class and Race"

Body:
  "The selected class has changed to Druid and race has changed 
   to Elf. Would you like to regenerate this section to reflect 
   these changes?

   This is recommended to ensure the character's proficiencies 
   match their updated class and race."
```

**When neither changed (just refreshing):**
```
Header: "Regenerate Section"

Body:
  "Would you like to regenerate this section with fresh suggestions?

   This will generate new options while maintaining consistency 
   with the character's existing background and story."

[Textarea placeholder: Leave blank to use existing character context.]
```

### 4. Visual Feedback Components

#### Success Toast
After successful regeneration, a toast notification appears in the bottom-right corner:
- Green success theme with checkmark icon
- Message: "Section updated successfully"
- Auto-dismisses after 3 seconds
- Smooth slide-in animation

#### Button Tooltips
Each regenerate button includes a contextual tooltip:
- **If class/race changed:** "Regenerate with updated class/race"
- **If unchanged:** "Get a fresh version"

#### Loading States
Regenerate buttons show loading state during API calls:
- Spinner icon replaces refresh icon
- Text changes to "Regenerating..."
- Button is disabled during operation

### 5. New Component: ArrayFieldWithRegenerate
Created a hybrid component that combines array field functionality with regenerate capabilities:

**Features:**
- Handles comma-separated array inputs
- Shows regenerate button when session is available and not locked
- Detects class/race changes for contextual tooltips
- Integrates seamlessly with existing regeneration flow
- Maintains consistent styling with other form fields

**Usage:**
```tsx
<ArrayFieldWithRegenerate 
  fieldName="languages" 
  label="Languages" 
  placeholder="e.g., Common, Elvish, Dwarvish, Draconic"
/>
```

## Technical Implementation

### Modified Files

#### 1. `src/components/CharacterForm.tsx`
**Changes:**
- Added state tracking for original class and race values
- Added `showSuccessToast` state for feedback
- Created `ArrayFieldWithRegenerate` component
- Updated regeneration handler to show success toast
- Replaced `ArrayField` with `ArrayFieldWithRegenerate` for class/race-dependent fields
- Updated GmIntentModal call to pass class/race change detection props
- Added success toast UI component

**Key State Variables:**
```tsx
const [originalClass] = useState(character.class);
const [originalRace] = useState(character.race);
const [showSuccessToast, setShowSuccessToast] = useState(false);
```

#### 2. `src/components/GmIntentModal.tsx`
**Changes:**
- Extended interface to accept class/race change props
- Added field display names for new fields (languages, proficiencies, etc.)
- Implemented context-aware modal title generation
- Created `getContextMessage()` function for dynamic messaging
- Updated modal UI to show highlighted info box when changes detected
- Added conditional rendering based on class/race change status

**New Props:**
```tsx
hasClassChanged?: boolean;
hasRaceChanged?: boolean;
newClass?: string;
newRace?: string;
```

## User Experience Flow

### Scenario 1: User Changes Class/Race
1. User opens Edit Character modal
2. User changes class from "Fighter" to "Druid"
3. User clicks "Regenerate" on Languages field
4. **Clear modal opens with:**
   - Header: "Regenerate Section Based on New Class"
   - Body: "The selected class has changed to Druid. Would you like to regenerate this section to reflect the new class?"
   - Recommendation: "This is recommended to ensure the character's languages match their updated class."
   - Optional GM Intent field with contextual placeholder
   - Clear buttons: "Regenerate Section" (primary) and "Cancel" (secondary)
5. User clicks "Regenerate Section" (optionally adding GM intent for customization)
6. AI regenerates field with new class context
7. Success toast appears: "Section updated successfully"
8. Toast auto-dismisses after 3 seconds

### Scenario 2: User Wants Fresh Version (No Changes)
1. User opens Edit Character modal
2. User clicks "Regenerate" on Proficiencies field (without changing class/race)
3. **Modal opens with clear messaging:**
   - Header: "Regenerate Section"
   - Body: "Would you like to regenerate this section with fresh suggestions?"
   - Recommendation: "This will generate new options while maintaining consistency with the character's existing background and story."
   - Placeholder: "Leave blank to use existing character context."
4. User clicks "Regenerate Section" or provides custom GM intent
5. AI regenerates field with existing context
6. Success toast appears

## API Integration
Uses existing `/api/characters/regenerate` endpoint:
- Endpoint already handles field-specific regeneration
- Accepts `gmIntent` parameter for custom instructions
- Returns regenerated field value
- Updates session context automatically

## Edge Cases Handled
1. **Both Class and Race Changed**: Shows both in the message
2. **Session Not Available**: Regenerate buttons hidden (same as before)
3. **Characters Locked**: Regenerate buttons hidden (same as before)
4. **Regeneration in Progress**: Button disabled with loading state
5. **API Error**: Shows error alert (existing error handling)
6. **Empty Fields**: Can be regenerated to populate initially
7. **Modal Closed During Loading**: State properly cleaned up

## UX Improvements Applied

### Problem: Misleading Visual Affordances
**Before:** The modal used a blue info box that looked like it might be clickable, creating visual confusion about what elements were interactive.

**After:** Removed all styled boxes. Information is presented as clean, readable text with proper hierarchy and spacing. Nothing looks clickable unless it actually is.

### Problem: Unclear Action Flow
**Before:** Messages like "This section may be outdated..." created uncertainty about what would happen and why.

**After:** Clear, action-oriented statements:
- "The selected class has changed to Druid. Would you like to regenerate this section to reflect the new class?"
- Explicit recommendation explaining the benefit
- Context-aware placeholder text in the intent field

### Problem: Ambiguous Button Labels
**Before:** "Skip Intent" button was confusing - users weren't sure if it would skip the regeneration or just the intent field.

**After:** Clear button labels:
- **"Regenerate Section"** - Primary action, clearly states what will happen
- **"Cancel"** - Secondary action, standard pattern for backing out

### Modal Layout Improvements
1. **Clearer Spacing**: Increased `mb-6` spacing between header, body, and form sections
2. **Semantic Sections**: HTML comments marking Header, Body, and Form sections for maintainability
3. **Relaxed Line Height**: `leading-relaxed` on body text for better readability
4. **Consistent Hierarchy**: Label + helper text + input field pattern for the intent section
5. **Visual Anchoring**: Primary CTA (Regenerate Section) visually anchors the decision flow

## Styling & Theme Consistency
All components use consistent styling from the theme:
- Dark background: `bg-[#151A22]`
- Borders: `border-[#2A3340]`
- Text colors: `text-gray-200` (headings), `text-gray-300` (body), `text-gray-400` (secondary), `text-gray-500` (hints)
- Success theme: `bg-green-900/90`, `border-green-600/50`, `text-green-100`
- Rounded corners: `rounded-[12px]` for containers, `rounded-lg` for smaller elements
- No misleading visual affordances (removed all non-interactive styled boxes)

## Future Enhancements (Optional)
1. Add animation to highlight the updated field after regeneration
2. Show a diff preview before confirming regeneration
3. Add "Undo" functionality for regenerations
4. Batch regenerate multiple fields at once
5. Save regeneration history for rollback capability
6. Add presets for common class/race combinations
7. Show estimated token cost before regeneration
8. Add keyboard shortcut for quick regeneration (Cmd/Ctrl + R)

## Testing Recommendations
1. Test class change detection with all 12 classes
2. Test race change detection with all 21+ races
3. Test with both changes simultaneously
4. Test regeneration without any changes
5. Test with locked/unlocked characters
6. Test with and without session ID
7. Test toast auto-dismiss timing
8. Test modal cancel/close behavior
9. Test multiple sequential regenerations
10. Test with different screen sizes (responsive)

## Dependencies
- Existing regeneration API endpoint
- GmIntentModal component
- Character Form validation
- Session context system
- UI components (Button, Input, Label, Textarea)

## Notes
- Regeneration respects all existing character context (background, story, etc.)
- The AI considers both the new class/race AND all other character details
- GM Intent remains optional for all regenerations
- Toast notifications don't interrupt user workflow
- All existing regeneration functionality for other fields remains unchanged

