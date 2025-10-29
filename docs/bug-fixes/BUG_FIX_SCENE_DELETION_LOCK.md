# Bug Fix: Deleted Scenes Reappear After Locking Chain

## Problem Description

**Issue**: When editing a macro chain, if the user deletes scenes and then locks the chain, all the deleted scenes reappear as if the deletion never happened.

**User Experience**:
1. User clicks "Edit Chain"
2. User deletes 2 scenes (e.g., reducing from 6 to 4 scenes)
3. User clicks "Lock Chain"
4. All 6 scenes are back - deletions were lost!

## Root Cause Analysis

### The Storage Sync Issue

The application has **two storage locations** for macro chains:

1. **Old Storage**: `.data/chains.json` (legacy file-based storage)
2. **Session Context**: `.data/context.json` → `sessionContext.macroChains[chainId]`

When the user deletes scenes, here's what was happening:

```
User deletes 2 scenes
    ↓
handleDeleteScene() in MacroChainBoard.tsx
    ↓
POST /api/update_chain with edits
    ↓
update_chain.js processes deletion
    ↓
Updates chains.json ✅ (4 scenes)
    ↓
BUT DOES NOT UPDATE sessionContext.macroChains ❌ (still 6 scenes)
```

Then when locking:

```
User clicks "Lock Chain"
    ↓
POST /api/chain/lock
    ↓
Lock endpoint loads from sessionContext.macroChains first (line 940)
    ↓
Finds OLD chain with 6 scenes ❌
    ↓
Locks the wrong version!
```

### Why This Happened

The `api/update_chain.js` endpoint was only updating the old `chains.json` storage:

```javascript
// OLD CODE - Only updates chains.json
const savedChain = await updateChain(chainId, updatedChain);
res.status(200).json({ ok: true, data: savedChain });
```

But the lock endpoint reads from session context:

```javascript
// Lock endpoint - reads from session context
if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
  macroChain = sessionContext.macroChains[chainId]; // Gets OLD data!
}
```

## Solution Implemented

### Fix: Dual Storage Update

Modified `api/update_chain.js` to update **both** storage locations:

```javascript
// NEW CODE - Updates both locations
const savedChain = await updateChain(chainId, updatedChain);

// CRITICAL: Also update session context to keep everything in sync
if (sessionId && sessionContext) {
  const { saveSessionContext } = await import('./storage.js');
  
  // Update macroChains storage
  sessionContext.macroChains[chainId] = updatedChain;
  
  // Update blocks.custom.macroChain to keep UI in sync
  sessionContext.blocks.custom.macroChain = {
    chainId: updatedChain.chainId,
    scenes: updatedChain.scenes,  // ← Now has correct scene count!
    status: updatedChain.status,
    // ... other fields
  };
  
  await saveSessionContext(sessionId, sessionContext);
}
```

### Changes Made

**File**: `api/update_chain.js`

**Change 1**: Accept `sessionId` parameter
```javascript
const { chainId, edits, sessionId } = req.body;
```

**Change 2**: Load from session context first
```javascript
// Load existing chain from session context first
if (sessionId) {
  const { getOrCreateSessionContext } = await import('./context.js');
  sessionContext = await getOrCreateSessionContext(sessionId);
  
  if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
    existingChain = sessionContext.macroChains[chainId];
  }
}

// Fallback to old storage if not found
if (!existingChain) {
  existingChain = await loadChain(chainId);
}
```

**Change 3**: Update both storage locations after edits
```javascript
// Save to old storage
const savedChain = await updateChain(chainId, updatedChain);

// CRITICAL: Also update session context
if (sessionId && sessionContext) {
  sessionContext.macroChains[chainId] = updatedChain;
  sessionContext.blocks.custom.macroChain = updatedChain;
  await saveSessionContext(sessionId, sessionContext);
}
```

## Data Flow (After Fix)

### Edit Flow ✅
```
User deletes 2 scenes
    ↓
handleDeleteScene() in MacroChainBoard.tsx
    ↓
POST /api/update_chain {chainId, sessionId, edits}
    ↓
update_chain.js processes deletion
    ↓
Updates chains.json ✅ (4 scenes)
    ↓
Updates sessionContext.macroChains ✅ (4 scenes)
    ↓
Updates sessionContext.blocks.custom.macroChain ✅ (4 scenes)
```

### Lock Flow ✅
```
User clicks "Lock Chain"
    ↓
POST /api/chain/lock {chainId, sessionId}
    ↓
Lock endpoint loads from sessionContext.macroChains
    ↓
Finds UPDATED chain with 4 scenes ✅
    ↓
Locks the correct version!
```

## Testing Scenarios

### Test Case 1: Delete Scenes Then Lock ✅
1. Generate a 6-scene chain
2. Click "Edit Chain"
3. Delete 2 scenes (scenes 2 and 5)
4. Click "Lock Chain"
5. **Expected**: Chain is locked with 4 scenes
6. **Result**: ✅ Chain correctly locked with 4 scenes

### Test Case 2: Edit Title Then Lock ✅
1. Edit a scene title
2. Lock the chain
3. **Expected**: Chain locked with new title
4. **Result**: ✅ Title preserved correctly

### Test Case 3: Reorder Then Lock ✅
1. Drag and drop to reorder scenes
2. Lock the chain
3. **Expected**: Chain locked with new order
4. **Result**: ✅ Order preserved correctly

### Test Case 4: Add Scene Then Lock ✅
1. Click "Add Scene"
2. Edit the new scene
3. Lock the chain
4. **Expected**: Chain locked with new scene included
5. **Result**: ✅ New scene preserved correctly

### Test Case 5: Multiple Edits Then Lock ✅
1. Delete a scene
2. Add a scene
3. Edit a title
4. Reorder scenes
5. Lock the chain
6. **Expected**: All changes preserved
7. **Result**: ✅ All changes correctly saved

## Files Modified

1. **api/update_chain.js**
   - Added `sessionId` parameter handling
   - Added session context loading logic
   - Added dual storage update (chains.json + session context)
   - Added scene count logging for debugging

## Impact

### Before Fix:
- ❌ Scene deletions lost on lock
- ❌ Inconsistent data between storage locations
- ❌ Confusing user experience (changes reverted)
- ❌ Potential data loss for other edit operations

### After Fix:
- ✅ Scene deletions preserved on lock
- ✅ Consistent data across all storage locations
- ✅ Predictable user experience
- ✅ All edit operations properly persisted

## Related Components

### Storage Architecture

The application maintains chain data in multiple locations:

1. **Old Storage** (`.data/chains.json`):
   - Legacy file-based storage
   - Used for backward compatibility
   - Direct file I/O operations

2. **Session Context** (`.data/context.json`):
   - Modern storage approach
   - Contains: `sessionContext.macroChains[chainId]`
   - Contains: `sessionContext.blocks.custom.macroChain`
   - Used by UI for display and lock operations

### Why Two Locations?

- **Historical**: Old storage system was replaced by session context
- **Migration**: Gradual migration from old to new system
- **Compatibility**: Some endpoints still use old storage as fallback

### Future Consideration

Consider migrating completely to session context and deprecating the old storage system to avoid dual-storage complexity.

## Additional Notes

### Why Frontend Already Had sessionId

The frontend's `MacroChainBoard.tsx` was already passing `sessionId` in all `UpdateChainRequest` objects:

```typescript
const updateRequest: UpdateChainRequest = {
  chainId: chain.chainId,
  sessionId,  // ← Already present!
  edits: [...]
};
```

This means the backend just needed to be updated to use it.

### Logging for Debugging

Added scene count logging to help debug similar issues in the future:

```javascript
console.log('Telemetry: update_chain', {
  chainId,
  editCount: edits.length,
  sceneCount: updatedChain.scenes.length,  // ← New logging
  timestamp: Date.now(),
});
```

### Version Tracking

The fix preserves version tracking:
```javascript
updatedChain = { 
  ...existingChain,
  version: (existingChain.version || 0) + 1,  // Increments version
  lastUpdatedAt: new Date().toISOString()
};
```

## Prevention Measures

To prevent similar issues in the future:

1. **Centralize Storage**: Consider creating a unified storage service
2. **Add Tests**: Add integration tests for edit → lock flows
3. **Add Validation**: Validate scene count matches before/after lock
4. **Add Logging**: Enhanced logging added to track scene counts

---

**Fixed**: 2025-10-21  
**Version**: 1.0  
**Status**: ✅ Resolved  
**Related**: See also BUG_FIX_EDIT_MODE_EXIT.md for edit mode preservation fix

