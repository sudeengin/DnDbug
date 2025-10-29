# 🔒 Unified Lock System Documentation

**Created:** October 29, 2025  
**Purpose:** Centralized locking/unlocking system for all lockable entities

---

## Overview

All locking operations are now unified through `api/lib/lockService.js`. This eliminates code duplication and ensures consistent behavior across:

- **Context Blocks** (background, characters, etc.)
- **Macro Chains**
- **Scenes**

---

## Architecture

### Central Service: `api/lib/lockService.js`

**Main Functions:**

1. **`lockContextBlock(sessionId, blockType, locked)`**
   - Locks/unlocks context blocks (background, characters, etc.)
   - Automatically bumps version numbers (backgroundV, charactersV)
   - Validates block types

2. **`lockChain(sessionId, chainId, locked)`**
   - Locks/unlocks macro chains
   - Handles chain migration from old storage
   - Marks dependent scenes as NeedsRegen when unlocking

3. **`lockScene(sessionId, sceneId, locked)`**
   - Locks/unlocks individual scenes
   - Marks later scenes as NeedsRegen when unlocking

4. **Helper Functions:**
   - `isContextBlockLocked()`
   - `isChainLocked()`
   - `isSceneLocked()`

---

## API Endpoints

All endpoints now delegate to the unified service:

### Context Block Locking
```
POST /api/context/lock
PATCH /api/context/lock  (preferred)
Body: { sessionId, blockType, locked }
```

### Character Locking (backward compatible)
```
POST /api/characters/lock
Body: { sessionId, locked }
→ Routes to lockContextBlock(sessionId, 'characters', locked)
```

### Background Locking (backward compatible)
```
POST /api/background/lock
Body: { sessionId, locked }
→ Routes to context/lock with blockType='background'
```

### Chain Locking
```
POST /api/chain/lock
Body: { sessionId, chainId }
→ Uses lockChain(sessionId, chainId, true)
```

### Chain Unlocking
```
POST /api/chain/unlock
Body: { sessionId, chainId }
→ Uses lockChain(sessionId, chainId, false)
```

### Scene Unlocking
```
POST /api/scene/unlock
Body: { sessionId, sceneId }
→ Uses lockScene(sessionId, sceneId, false)
```

---

## Benefits

### ✅ Code Reuse
- Single implementation for locking logic
- Consistent error handling
- Unified validation

### ✅ Version Management
- Automatic version bumping (backgroundV, charactersV)
- Staleness detection support
- Consistent version tracking

### ✅ Maintainability
- Changes to locking logic happen in one place
- Easier to test
- Clear separation of concerns

### ✅ Backward Compatibility
- All existing endpoints still work
- Old API routes delegate to new service
- Gradual migration path

---

## File Structure

```
api/
├── lib/
│   └── lockService.js          # ✨ Unified lock service (NEW)
├── context/
│   └── lock.js                  # Delegates to lockService
├── characters/
│   └── lock.js                  # Delegates to lockService
└── scene/
    └── unlock.js                # Delegates to lockService
```

---

## Migration Status

| Endpoint | Status | Service Used |
|----------|--------|--------------|
| `/api/context/lock` | ✅ Migrated | `lockContextBlock()` |
| `/api/characters/lock` | ✅ Migrated | `lockContextBlock()` |
| `/api/background/lock` | ✅ Migrated | `lockContextBlock()` (via context/lock) |
| `/api/chain/lock` | ✅ Migrated | `lockChain()` |
| `/api/chain/unlock` | ✅ Migrated | `lockChain()` |
| `/api/scene/unlock` | ✅ Migrated | `lockScene()` |

---

## Usage Examples

### Lock a Context Block
```javascript
import { lockContextBlock } from './api/lib/lockService.js';

const sessionContext = await lockContextBlock(
  'session_123',
  'background',
  true  // lock
);
```

### Lock a Chain
```javascript
import { lockChain } from './api/lib/lockService.js';

const { chain, sessionContext } = await lockChain(
  'session_123',
  'chain_456',
  true  // lock
);
```

### Lock a Scene
```javascript
import { lockScene } from './api/lib/lockService.js';

const { sceneDetail, affectedScenes } = await lockScene(
  'session_123',
  'scene_789',
  true  // lock
);
```

### Check Lock Status
```javascript
import { isContextBlockLocked, isChainLocked, isSceneLocked } from './api/lib/lockService.js';

const isBackgroundLocked = await isContextBlockLocked('session_123', 'background');
const isChainLocked = await isChainLocked('session_123', 'chain_456');
const isSceneLocked = await isSceneLocked('session_123', 'scene_789');
```

---

## Valid Block Types

When using `lockContextBlock()`, valid block types are:

- `blueprint`
- `player_hooks`
- `world_seeds`
- `style_prefs`
- `custom`
- `background` ⭐ (bumps backgroundV)
- `story_concept`
- `characters` ⭐ (bumps charactersV)

---

## Error Handling

All functions throw descriptive errors:
- `"Session not found"` - 404
- `"Macro chain not found"` - 404
- `"Scene detail not found"` - 404
- `"Macro chain is already locked"` - 409
- `"Scene is not locked"` - 409
- `"Invalid blockType: ..."` - 400

---

## Future Enhancements

Potential additions to the lock service:
- Bulk locking/unlocking
- Lock expiry/auto-unlock
- Lock history/timeline
- Lock notifications
- Lock validation before operations

---

## Testing

All lock operations:
1. ✅ Validate inputs
2. ✅ Check current state
3. ✅ Update status
4. ✅ Bump versions (where applicable)
5. ✅ Save to storage
6. ✅ Handle affected entities (scenes, etc.)
7. ✅ Log operations
8. ✅ Return updated data

---

**Last Updated:** October 29, 2025

