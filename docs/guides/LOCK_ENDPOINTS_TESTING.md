# Lock Endpoints Testing Guide

**Date**: October 29, 2025

## Overview

All lock endpoints have been refactored to use the unified `lockService.js`. This guide provides testing procedures.

## Lock Endpoints

### 1. Context Lock (Background/Characters)
**Endpoint**: `POST /api/context/lock` (also `PATCH`)
**Handler**: `api/context/lock.js`
**Service**: `api/lib/lockService.js` → `lockContextBlock()`

**Test Procedure**:
```bash
# Lock background
curl -X PATCH http://localhost:3000/api/context/lock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "blockType": "background", "locked": true}'

# Lock characters
curl -X PATCH http://localhost:3000/api/context/lock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "blockType": "characters", "locked": true}'
```

**Expected Behavior**:
- Returns updated session context
- Updates `meta.backgroundV` or `meta.charactersV` when locking
- Sets `blocks.background.locked` or `blocks.characters.locked`

### 2. Background Lock (Backward Compatibility)
**Endpoint**: `POST /api/background/lock`
**Handler**: Routes to `api/context/lock.js` with `blockType='background'`

**Test Procedure**:
```bash
curl -X POST http://localhost:3000/api/background/lock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "locked": true}'
```

### 3. Characters Lock
**Endpoint**: `POST /api/characters/lock`
**Handler**: `api/characters/lock.js`
**Service**: `api/lib/lockService.js` → `lockContextBlock()`

**Test Procedure**:
```bash
curl -X POST http://localhost:3000/api/characters/lock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "locked": true}'
```

### 4. Chain Lock
**Endpoint**: `POST /api/chain/lock`
**Handler**: Inline in `server.js`
**Service**: `api/lib/lockService.js` → `lockChain()`

**Test Procedure**:
```bash
curl -X POST http://localhost:3000/api/chain/lock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "chainId": "test_chain_id"}'
```

**Expected Behavior**:
- Locks the macro chain
- Returns updated chain object
- Sets `chain.locked = true`

### 5. Chain Unlock
**Endpoint**: `POST /api/chain/unlock`
**Handler**: Inline in `server.js`
**Service**: `api/lib/lockService.js` → `lockChain(locked=false)`

**Test Procedure**:
```bash
curl -X POST http://localhost:3000/api/chain/unlock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "chainId": "test_chain_id"}'
```

**Expected Behavior**:
- Unlocks the chain
- Marks downstream scenes as `NeedsRegen`
- Returns `affectedScenes` array

### 6. Scene Unlock
**Endpoint**: `POST /api/scene/unlock`
**Handler**: `api/scene/unlock.js`
**Service**: `api/lib/lockService.js` → `lockScene()`

**Test Procedure**:
```bash
curl -X POST http://localhost:3000/api/scene/unlock \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session", "sceneId": "test_scene_id"}'
```

**Expected Behavior**:
- Unlocks the scene
- Marks later scenes as `NeedsRegen`
- Returns `affectedScenes` array

## Unified Lock Service

All lock operations use `api/lib/lockService.js`:

- `lockContextBlock(sessionId, blockType, locked)` - Background, characters
- `lockChain(sessionId, chainId, locked)` - Macro chains
- `lockScene(sessionId, sceneId, locked)` - Scene details

## Test Checklist

- [ ] Context lock (background) - locks and bumps version
- [ ] Context lock (characters) - locks and bumps version
- [ ] Background lock (backward compat) - routes correctly
- [ ] Characters lock - works correctly
- [ ] Chain lock - locks chain
- [ ] Chain unlock - unlocks and marks downstream
- [ ] Scene unlock - unlocks and marks later scenes
- [ ] Error handling - invalid sessionId returns 404
- [ ] Error handling - missing parameters return 400
- [ ] Version bumping - occurs on lock

## Automated Testing Script

Create `scripts/test-lock-endpoints.js`:

```javascript
// Test all lock endpoints systematically
// (Implementation needed)
```

---

**Status**: ✅ Refactored, 📝 Testing guide created, ⚠️ Automated tests recommended

