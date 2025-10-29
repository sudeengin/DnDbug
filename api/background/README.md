# api/background/ Directory

## Purpose

The `api/background/` directory is intended to hold **background-related API handler files**, similar to how `api/characters/` contains character-related handlers.

## Current Status

**Only contains:**
- `lock.js` - Handles locking/unlocking background data

## Architecture Inconsistency

Unlike the `api/characters/` directory which is well-organized with:
- `generate.js` - Character generation
- `lock.js` - Lock management  
- `delete.js` - Character deletion
- `list.js` - List characters
- `regenerate.js` - Regenerate characters
- `upsert.js` - Update/insert characters

The background functionality is **inconsistently organized**:

### Current Implementation:
- ✅ `/api/background/lock` → Uses `api/background/lock.js` (properly organized)
- ❌ `/api/generate_background` → **Implemented inline in `server.js`** (not using `api/generate_background.js`)
- 📁 `api/generate_background.js` exists but **is not used** by server.js

### What Should Be:
For consistency with `api/characters/`, the background directory should contain:
```
api/background/
├── generate.js     # Background generation (currently in root as generate_background.js)
├── lock.js         # ✅ Already here
└── update.js       # Background updates (if needed)
```

## Endpoints

| Endpoint | Handler File | Status |
|----------|--------------|--------|
| `POST /api/generate_background` | **Inline in server.js** (lines 482-664) | ⚠️ Inconsistent |
| `POST /api/background/lock` | `api/background/lock.js` | ✅ Consistent |

## Recommendation

**Option 1: Keep current structure** (minimal change)
- Leave `api/background/` directory for lock functionality only
- Keep `generate_background` endpoint inline in server.js
- Delete unused `api/generate_background.js` file

**Option 2: Reorganize for consistency** (recommended)
- Move `generate_background` logic from server.js to `api/background/generate.js`
- Update server.js to import and use the handler
- Match the pattern used by `api/characters/`

---

**Last Updated:** October 29, 2025

