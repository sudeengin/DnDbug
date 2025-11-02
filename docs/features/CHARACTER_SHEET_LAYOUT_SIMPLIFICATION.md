# Character Sheet Layout Simplification

**Date:** 2024-11-02
**Status:** ✅ Complete

## Overview

Simplified the Character Sheet page by removing redundant, non-actionable sections and keeping only components that contribute meaningful user-driven interactions.

## Changes Made

### ❌ Removed Sections

1. **Story Character Reference Section**
   - **Why:** This information is already visible and fully editable in the Characters overview page
   - **What was shown:** Personality, motivation, background history, relationships, alignment, deity, physical description
   - **Impact:** Reduces clutter and redundant information display

2. **Core Information Section**
   - **Why:** Most fields were non-editable or redundant
   - **What was removed:**
     - Character Name (non-editable, already shown in overview badge)
     - Level selector (non-contextual at this stage)
     - Ruleset (static display)
     - Race dropdown (already set in Step 1/conversion)
     - Subrace dropdown (already set in Step 1/conversion)
     - Background dropdown (already set in Step 1/conversion)
     - Story character details (age, height, physical description)
   - **Impact:** Cleaner layout focused on the stepped workflow

### ✅ Added/Preserved Sections

1. **Character Overview Badge** (NEW)
   - **Location:** Top of page, above the step workflow
   - **Purpose:** Provides quick reference to character identity
   - **Fields shown:**
     - Character Name
     - Class (from story character)
     - Background (currently selected)
   - **Design:** Horizontal pill/badge with separators
   - **Theme:** Uses `bg-[#151A22]` and `border-[#2A3340]` for consistency

2. **Step 3: Equipment Loadout** (NEW)
   - **Location:** After Step 2 (Ability Scores)
   - **Purpose:** User-actionable equipment selection
   - **Content:**
     - Custom equipment preferences from story character
     - Background equipment note (informational)
   - **Design:** Collapsible card matching Step 1 and Step 2 styling
   - **Theme:** Consistent with existing step cards

3. **Existing Sections** (PRESERVED)
   - Step 1: Background Selection
   - Step 2: Ability Scores Assignment
   - Race Details (collapsible reference)
   - Background Details (collapsible reference)

## Visual Flow

```
┌─────────────────────────────────────────────────┐
│ Character Overview Badge                        │
│ Name: X | Class: Y | Background: Z              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Step 1: Choose a Background          [🔓/🔒]   │
│ - Background selector cards                     │
│ - Lock button to proceed                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Step 2: Assign Ability Scores        [Ready]   │
│ - Locked until Step 1 complete                  │
│ - Class-specific presets                        │
│ - Ability score inputs                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Step 3: Equipment Loadout                       │
│ - Equipment preferences from story              │
│ - Background equipment note                     │
└─────────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────────┐
│ Race Details     │ Background Details           │
│ (Reference)      │ (Reference)                  │
└──────────────────┴──────────────────────────────┘
```

## Benefits

1. **Reduced Redundancy**
   - Story character info is visible in Characters tab where it can be edited
   - Core info (race, background) is shown in overview badge
   - Removes duplicate displays of the same information

2. **Clearer Workflow**
   - Focus on the stepped process: Background → Abilities → Equipment
   - Each step is actionable and contributes to character building
   - Reduced cognitive load for users

3. **Better Visual Hierarchy**
   - Overview badge provides context without taking up space
   - Main content area dedicated to actionable steps
   - Reference sections (race/background details) remain available but collapsed

4. **Consistent Design**
   - All steps use the same card styling
   - Consistent collapsible patterns
   - Maintained theme colors and spacing

## Technical Details

### State Management

- Removed `'core-info'` from initial expanded sections
- Changed default to `'equipment-preferences'` to highlight the new section
- Removed state variables: `overrideRace`, `overrideBackground` (no longer needed)

### Component Structure

**Before:**
- 6 major sections (Story Reference, Core Info, Background Selection, Ability Scores, Race Details, Background Details)
- Heavy visual clutter
- Mixed actionable and informational content

**After:**
- 5 sections total:
  - 1 overview badge (compact)
  - 3 stepped workflow sections (actionable)
  - 2 reference sections (collapsible, informational)
- Clear visual separation of concerns
- Streamlined user journey

### Theme Consistency

All new/modified sections use established theme tokens:
- Background: `bg-[#151A22]`, `bg-[#1C1F2B]`
- Borders: `border-[#2A3340]`
- Text: `text-white`, `text-gray-400`, `text-gray-300`
- Accent: `text-[#7c63e5]` for equipment bullets
- Info badges: `bg-blue-900/20 border-blue-600/30`

## Files Modified

- `src/components/pages/CharacterSheetPage.tsx`
  - Removed Story Character Reference section (~127 lines)
  - Removed Core Information section (~169 lines)
  - Added Character Overview Badge (~18 lines)
  - Added Equipment Loadout section (~49 lines)
  - Updated initial state for expandedSections

## Testing Recommendations

1. **Visual Testing:**
   - [ ] Verify overview badge displays correctly with all fields
   - [ ] Check responsive behavior on mobile/tablet
   - [ ] Ensure step numbering is clear (Step 1, 2, 3)
   - [ ] Confirm Equipment section only shows when data exists

2. **Functional Testing:**
   - [ ] Step 1 → Step 2 lock/unlock flow works
   - [ ] Equipment preferences display correctly
   - [ ] Race/Background reference sections are accessible
   - [ ] Collapsible states persist correctly

3. **Edge Cases:**
   - [ ] Character without equipment preferences (section should hide)
   - [ ] Character without story character reference (overview badge handles)
   - [ ] Multiple backgrounds with different equipment lists

## Future Enhancements

1. **Equipment Section:**
   - Add interactive equipment selection (not just display)
   - Allow users to mark preferred items
   - Show class-specific equipment options

2. **Overview Badge:**
   - Make it sticky on scroll for persistent context
   - Add character level indicator
   - Include character avatar/icon

3. **Workflow:**
   - Consider adding a Step 4 for skills/proficiencies
   - Add progress indicator showing completion %
   - Include save reminders between steps

