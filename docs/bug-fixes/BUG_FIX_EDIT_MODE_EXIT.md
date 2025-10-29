# Bug Fix: Edit Mode Exits After Deleting Scene

## Problem Description

**Issue**: When editing a macro chain, deleting a scene would cause the screen to refresh and exit edit mode unexpectedly, showing the "Lock Chain" and "Edit Chain" buttons again.

**User Experience**:
1. User clicks "Edit Chain"
2. User deletes one scene
3. Screen suddenly refreshes
4. User is kicked out of edit mode
5. "Lock Chain" and "Edit Chain" buttons appear again

## Root Cause Analysis

### Primary Cause: Tab Focus Refetch Trigger

The `useOnTabFocus` hook in `MacroChainPage.tsx` was listening for window focus events. When a user performed any action that briefly shifted browser focus (clicking console, clicking after delete, etc.), the hook would trigger `refetchContext()`.

**Console Log Evidence**:
```
MacroChainBoard.tsx:352 handleDeleteScene: Sending update request
MacroChainPage.tsx:52 refetchContext: Fetching context for session: project_...
```

The `refetchContext` was being called immediately after the delete operation, causing:
1. A full context reload from the server
2. The chain prop to be replaced with a new object reference
3. The `MacroChainBoard` component to re-render
4. Loss of the `isEditing` state

### Secondary Cause: Chain Prop Sync During Edit

The `useEffect` in `MacroChainBoard.tsx` was syncing the local `scenes` state from the `chain.scenes` prop whenever it changed:

```javascript
useEffect(() => {
  setScenes(chain.scenes);
}, [chain.scenes]);
```

This meant that any prop update during edit mode would overwrite the local editing state, even though the user was actively making changes.

## Solution Implemented

### Fix 1: Prevent Refetch During Updates (MacroChainPage.tsx)

Added an `isUpdating` flag to prevent unnecessary refetches while chain updates are in progress:

```typescript
const [isUpdating, setIsUpdating] = useState(false);

// In useOnTabFocus hook:
useOnTabFocus(() => {
  // Don't refetch if we're in the middle of an update operation
  if (sessionId && !isUpdating) {
    refetchContext();
    if (currentChainId) {
      checkChainStatus();
    }
  }
});

// In handleChainUpdate:
const handleChainUpdate = async (updatedChain: MacroChain) => {
  setIsUpdating(true); // Set flag before update
  
  try {
    // ... perform all updates ...
  } finally {
    // Clear flag after short delay (500ms) to allow update to complete
    setTimeout(() => setIsUpdating(false), 500);
  }
};
```

**Benefits**:
- Prevents tab focus events from triggering refetches during active editing
- 500ms buffer ensures update completes before allowing refetches again
- Preserves edit mode state during scene deletions, additions, and reordering

### Fix 2: Preserve Edit State During Prop Updates (MacroChainBoard.tsx)

Modified the `useEffect` to only sync from props when NOT in edit mode:

```typescript
useEffect(() => {
  // Only update scenes if not currently editing to preserve edit state
  // This prevents losing edit mode when chain updates happen
  if (!isEditing) {
    setScenes(chain.scenes);
  }
}, [chain.scenes, isEditing]);
```

Also added `isEditing` reset when chain ID changes (switching to a different chain):

```typescript
useEffect(() => {
  // Reset scene details and exit edit mode when chain ID changes (different chain)
  setSceneDetails([]);
  setSelectedScene(null);
  setIsEditing(false); // Exit edit mode when switching chains
}, [chain.chainId]);
```

**Benefits**:
- Preserves local editing state when prop updates occur
- Allows user to continue editing after delete/add/reorder operations
- Only exits edit mode when actually switching to a different chain
- Maintains consistency between local state and server state

## Testing Scenarios

### Test Case 1: Delete Scene While Editing ✅
1. Click "Edit Chain"
2. Delete a scene
3. **Expected**: Remain in edit mode, scene is removed
4. **Result**: ✅ Edit mode preserved, scene deleted successfully

### Test Case 2: Add Scene While Editing ✅
1. Click "Edit Chain"
2. Click "Add Scene"
3. **Expected**: Remain in edit mode, new scene appears
4. **Result**: ✅ Edit mode preserved, new scene added successfully

### Test Case 3: Reorder Scenes While Editing ✅
1. Click "Edit Chain"
2. Drag and drop a scene to reorder
3. **Expected**: Remain in edit mode, scenes reordered
4. **Result**: ✅ Edit mode preserved, scenes reordered successfully

### Test Case 4: Tab Focus During Edit ✅
1. Click "Edit Chain"
2. Click browser console or another window
3. Click back to the page
4. **Expected**: Remain in edit mode
5. **Result**: ✅ Edit mode preserved, no unnecessary refetch during update window

### Test Case 5: Switch Chains ✅
1. Click "Edit Chain"
2. Navigate away and generate a new chain
3. **Expected**: Exit edit mode when viewing different chain
4. **Result**: ✅ Edit mode correctly exits when chain ID changes

## Files Modified

1. **src/components/pages/MacroChainPage.tsx**
   - Added `isUpdating` state flag
   - Modified `useOnTabFocus` to check `isUpdating` flag
   - Added `isUpdating` flag management in `handleChainUpdate`

2. **src/components/MacroChainBoard.tsx**
   - Modified `useEffect` to respect `isEditing` state when syncing props
   - Added `setIsEditing(false)` when chain ID changes

## Impact

### Before Fix:
- ❌ Edit mode lost after any scene modification
- ❌ Unnecessary context refetches on window focus
- ❌ Jarring user experience with unexpected mode changes
- ❌ Required re-entering edit mode after each operation

### After Fix:
- ✅ Edit mode preserved during scene modifications
- ✅ Smart refetch prevention during active updates
- ✅ Smooth user experience without unexpected exits
- ✅ Complete editing workflow without interruptions

## Additional Notes

### Why 500ms Delay?

The 500ms timeout in `setIsUpdating(false)` provides a buffer to ensure:
1. All async operations (API calls, context updates) complete
2. React state updates propagate through the component tree
3. Any pending focus events during the update window are ignored

This is a conservative delay that works well for typical network latency and React render cycles.

### Why Not Completely Disable useOnTabFocus?

Tab focus refetching is important for:
- Syncing changes made by other users/sessions
- Refreshing data after returning from other tabs
- Ensuring UI reflects latest server state

The fix maintains this functionality while preventing inappropriate refetches during active editing.

### Alternative Approaches Considered

1. **Ref-based tracking**: Using `useRef` instead of state
   - ❌ Doesn't trigger re-renders for `useOnTabFocus` check
   
2. **Debouncing refetchContext**: Adding debounce to refetch calls
   - ❌ Still allows refetch to happen, just delayed
   
3. **Edit mode in URL/query params**: Persist edit state in URL
   - ❌ Overly complex for this use case
   
4. **Global edit lock**: Prevent all updates during edit
   - ❌ Too restrictive, prevents legitimate background updates

The chosen approach strikes the right balance between UX and state management.

## Future Improvements

1. **Visual feedback**: Add loading state indicator during the 500ms update window
2. **Optimistic updates**: Show changes immediately, sync with server in background
3. **Conflict resolution**: Handle concurrent edits from multiple users
4. **Edit session tracking**: Track edit duration and changes for analytics

---

**Fixed**: 2025-10-21  
**Version**: 1.0  
**Status**: ✅ Resolved

