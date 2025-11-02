# Character Sheet Step Navigation Enhancement

**Status:** ✅ Complete  
**Date:** November 1, 2025  
**Component:** `CharacterSheetPage.tsx`

## Overview

Improved the user flow between Step 1 (Choose Background) and Step 2 (Assign Ability Scores) on the Character Sheet page by implementing a lock-and-reveal interaction pattern that provides smoother, more intentional progression through character creation.

## Problem Statement

The previous implementation had several UX issues:
- **Abrupt auto-scroll:** When selecting a background, the view automatically scrolled to Step 2, which felt jarring
- **Unclear commitment:** Users couldn't easily tell if their background selection was locked in
- **No transition:** The jump between steps didn't convey intentional progression
- **Limited review time:** Users didn't get a chance to confirm their decision before moving forward

## Solution

### New Interaction Flow

#### Step 1: Choose Background
1. **Enhanced card display:**
   - All backgrounds shown as individual card components with full details
   - Clear visual distinction between selected and unselected states
   - Suggested backgrounds highlighted based on class (e.g., "Sage" for Wizard)
   - Detailed preview of skills, tools, languages, and features

2. **Selection state:**
   - Selected background gets a highlighted border and checkmark
   - "Selected" badge appears on chosen background
   - All backgrounds remain visible for comparison

3. **Lock Selection button:**
   - Appears only after a background is selected
   - Prominent "Lock Selection & Continue" button at the bottom
   - Clear call-to-action with lock icon
   - No automatic scrolling occurs until this button is clicked

#### Locking the Background
When the user clicks "Lock Selection & Continue":
1. Step 1 section collapses (accordion style)
2. Locked badge appears in Step 1 header showing selected background
3. Step 2 section automatically expands
4. Smooth scroll animation brings Step 2 into view
5. Success banner appears inside Step 2

#### Step 2: Assign Ability Scores
1. **Opens automatically** when background is locked
2. **Success banner** displays:
   - ✅ "Background locked: [Background Name]"
   - Instructional text: "Now assign your ability scores..."
   - Green color scheme to indicate successful progression
3. **Pre-populated suggestions** based on race + class + background
4. **Context cards** showing current race, background, and class
5. **Clear input components** for ability score assignment

## Technical Implementation

### New State Variables

```typescript
const [backgroundLocked, setBackgroundLocked] = useState(false);
```

This tracks whether the user has intentionally locked their background selection, separate from merely having selected one.

### Key Changes

#### 1. Step 1 Collapsible Wrapper
```typescript
<Collapsible 
  open={!backgroundLocked} 
  onOpenChange={(open) => {
    if (open) {
      setBackgroundLocked(false);
      // Collapse Step 2 when reopening Step 1
      const newExpanded = new Set(expandedSections);
      newExpanded.delete('ability-scores');
      setExpandedSections(newExpanded);
    }
  }}
>
```

**Behavior:**
- Step 1 is open by default (when `backgroundLocked` is false)
- Collapses when background is locked
- Can be manually reopened by clicking the header, which unlocks the selection

#### 2. Enhanced Background Cards
- Each background is now a full `Card` component with:
  - `CardHeader` with title and suggested badge
  - `CardContent` with detailed information
  - Suggestion reason for class-appropriate backgrounds
  - Full-width select button
  - Hover effects and transitions
  - Selection highlights with purple border and glow

#### 3. Lock Selection Button
```typescript
{backgroundExplicit && !backgroundLocked && (
  <div className="flex items-center justify-center pt-4 border-t border-[#2A3340]">
    <Button
      variant="primary"
      size="lg"
      onClick={() => {
        setBackgroundLocked(true);
        // Expand Step 2 and scroll to it
        const newExpanded = new Set(expandedSections);
        newExpanded.add('ability-scores');
        setExpandedSections(newExpanded);
        
        setTimeout(() => {
          const el = document.getElementById('step-2-ability-scores');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }}
      className="gap-2"
    >
      <Lock className="w-4 h-4" />
      Lock Selection & Continue
    </Button>
  </div>
)}
```

**Behavior:**
- Only visible when a background is selected but not locked
- Large, prominent button with icon
- Clicking triggers the lock and reveal sequence
- 100ms delay ensures collapsible animation completes before scrolling

#### 4. Step 2 Success Banner
```typescript
{backgroundLocked && (
  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-medium text-green-300">
        Background locked: {character.background.name}
      </p>
      <p className="text-xs text-green-400/80 mt-1">
        Now assign your ability scores based on your race, class, and background.
      </p>
    </div>
  </div>
)}
```

**Behavior:**
- Appears at the top of Step 2 content
- Animated entrance (fade-in + slide-in)
- Green success styling
- Confirms locked background and provides next instruction

#### 5. Updated Lock Overlay
```typescript
{!backgroundLocked && (
  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30 rounded-2xl">
    <div className="bg-[#0f131b]/95 border border-[#2A3340] text-gray-200 text-sm rounded-lg px-6 py-4 shadow-xl max-w-md text-center">
      <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="font-medium mb-1">Step 1 Required</p>
      <p className="text-xs text-gray-400">
        Please select and lock a background in Step 1 to unlock ability score assignment.
      </p>
    </div>
  </div>
)}
```

**Behavior:**
- Blocks interaction with Step 2 until background is locked
- Visual lock icon and clear messaging
- Backdrop blur effect for emphasis
- Updated from `backgroundExplicit` to `backgroundLocked`

### Visual Design Enhancements

#### Background Cards
- **Default state:** Dark background (`#131A24`), subtle border, hover effect
- **Selected state:** Lighter background (`#1C1F2B`), purple border (`#7c63e5`), glow effect
- **Suggested badge:** Blue badge with reasoning for class synergy
- **Checkmark:** Green checkmark icon when selected
- **Disabled state:** When locked, buttons are disabled

#### Step Headers
- **Locked badge:** Green badge with lock icon in Step 1 when locked
- **Ready badge:** Blue badge in Step 2 when unlocked
- **Collapsible indicators:** ChevronDown/ChevronRight for clear visual cues

#### Animations
- Smooth accordion transitions using Collapsible component
- 300ms fade-in for success banner
- Smooth scroll with `behavior: 'smooth'`
- Border and shadow transitions

## User Benefits

### ✅ Intentional Progression
- Users explicitly confirm their background choice before moving on
- Clear visual feedback at each step
- Sense of accomplishment when locking in decisions

### ✅ Better Information Architecture
- All background information visible and comparable
- Class-based suggestions help decision-making
- No information is hidden or hard to find

### ✅ Reduced Cognitive Load
- One decision at a time (select, then lock, then proceed)
- Clear visual hierarchy and state indicators
- Consistent interaction patterns throughout

### ✅ Improved Accessibility
- Clear button labels and visual states
- Proper use of collapsible/accordion patterns
- Keyboard navigation maintained
- Screen reader friendly (badges, icons with semantic meaning)

### ✅ Enhanced Visual Flow
- Smooth animations provide continuity
- Color-coded states (purple for selection, green for success)
- Spatial consistency (steps don't jump around unexpectedly)

## Testing Scenarios

### Happy Path
1. ✅ User views all backgrounds in Step 1
2. ✅ User selects a background → card highlights
3. ✅ "Lock Selection" button appears
4. ✅ User clicks "Lock Selection & Continue"
5. ✅ Step 1 collapses with locked badge
6. ✅ Step 2 expands and scrolls into view
7. ✅ Success banner appears in Step 2
8. ✅ User can assign ability scores

### Edge Cases
1. ✅ User selects different backgrounds before locking → selection updates
2. ✅ User clicks Step 1 header after locking → Step 1 reopens, unlocks background
3. ✅ User tries to interact with Step 2 before locking → overlay blocks interaction
4. ✅ Background is suggested for user's class → suggestion badge appears

### State Management
1. ✅ Creating new character → both steps unlocked, Step 1 open
2. ✅ Background locked → Step 1 collapsed, Step 2 open
3. ✅ Reopening Step 1 → unlocks background, closes Step 2
4. ✅ Loading saved character → states reset appropriately

## Files Modified

### `/src/components/pages/CharacterSheetPage.tsx`
- Added `backgroundLocked` state variable
- Rewrote Step 1 section with Collapsible wrapper and enhanced cards
- Added "Lock Selection & Continue" button
- Updated Step 2 to check `backgroundLocked` instead of `backgroundExplicit`
- Added success banner in Step 2
- Updated lock overlay messaging
- Reset `backgroundLocked` when creating new characters

## Design System Compliance

All changes use existing theme system components and values:

### Components Used
- ✅ `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/card`
- ✅ `Button` with variants: `primary`, `secondary` from `@/components/ui/button`
- ✅ `Badge` with custom color schemes from `@/components/ui/badge`
- ✅ `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`

### Theme Colors
- ✅ Background: `bg-[#151A22]`, `bg-[#131A24]`, `bg-[#1C1F2B]` (from theme)
- ✅ Borders: `border-[#2A3340]` (from theme)
- ✅ Primary: `border-[#7c63e5]` (from theme)
- ✅ Success: `bg-green-900/20`, `border-green-600/30`, `text-green-300`
- ✅ Info: `bg-blue-900/30`, `border-blue-600/30`, `text-blue-300`

### Icons
- ✅ `Lock` - for locked state and overlay
- ✅ `CheckCircle2` - for selection confirmation and success
- ✅ `ChevronDown`, `ChevronRight` - for collapsible indicators
- ✅ `Info` - for informational messages

## Future Enhancements

### Potential Improvements
1. **Step 3 Preview:** Show a preview of what comes after ability scores
2. **Progress Indicator:** Add a visual progress bar showing steps completed
3. **Background Comparison:** Add a comparison mode to view 2+ backgrounds side-by-side
4. **Undo Lock:** Add explicit "Change Background" button in Step 2 header
5. **Keyboard Shortcuts:** Add hotkeys for locking/unlocking steps
6. **Animation Polish:** Add subtle microinteractions (e.g., button press animations)

### Accessibility Improvements
1. **ARIA Labels:** Add more descriptive ARIA labels for screen readers
2. **Focus Management:** Improve focus handling when steps collapse/expand
3. **Reduced Motion:** Respect `prefers-reduced-motion` for animations

## Related Documentation

- [Theme System Guide](../guides/THEME_SYSTEM.md)
- [SRD 2014 Phase 1 Complete](./SRD_2014_PHASE_1_COMPLETE.md)
- [Character Sheet Integration Complete](./CHARACTER_SHEET_INTEGRATION_COMPLETE.md)

## Conclusion

The new step navigation logic provides a significantly improved user experience for character creation. By introducing an intentional lock-and-reveal pattern, users have better control over their progression, clearer understanding of their choices, and a more polished, professional interface that matches modern UX best practices.

