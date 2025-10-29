# API Endpoints Verification

**Date**: October 29, 2025

## Summary

All API endpoints in `server.js` have been verified and have corresponding handler files.

## Endpoint Mapping

### ✅ All Endpoints Verified

| Method | Endpoint | Handler File | Status |
|--------|----------|--------------|--------|
| POST | `/api/generate_chain` | `api/generate_chain.js` | ✅ |
| POST | `/api/generate_next_scene` | `api/generate_next_scene.js` | ✅ |
| POST | `/api/update_chain` | Inline (legacy) | ⚠️ Could be extracted |
| POST | `/api/generate_detail` | `api/generate_detail.js` | ✅ |
| GET | `/` | Inline | ✅ |
| POST | `/api/apply_edit` | `api/apply_edit.js` | ✅ |
| POST | `/api/propagate` | `api/propagate.js` | ✅ |
| POST | `/api/generate_background` | `api/generate_background.js` | ✅ |
| POST | `/api/projects` | `api/projects.js` | ✅ |
| GET | `/api/projects` | `api/projects.js` | ✅ |
| DELETE | `/api/projects/:id` | `api/projects.js` | ✅ |
| POST | `/api/context/append` | `api/context/append.js` | ✅ |
| GET | `/api/context/get` | `api/context/get.js` | ✅ |
| POST | `/api/context/clear` | `api/context/clear.js` | ✅ |
| POST | `/api/context/lock` | `api/context/lock.js` | ✅ |
| GET | `/api/chain/get` | `api/update_chain.js` | ✅ |
| POST | `/api/chain/lock` | Inline (uses `api/lib/lockService.js`) | ✅ |
| POST | `/api/chain/unlock` | Inline (uses `api/lib/lockService.js`) | ✅ |
| GET | `/api/debug/session/:sessionId` | `api/debug.js` | ✅ |
| POST | `/api/scene/unlock` | `api/scene/unlock.js` | ✅ |
| POST | `/api/scene/update` | `api/scene/update.js` | ✅ |
| POST | `/api/scene/delete` | `api/scene/delete.js` | ✅ |
| POST | `/api/generate_next_scene` | `api/generate_next_scene.js` | ✅ (duplicate) |
| POST | `/api/characters/generate` | `api/characters/generate.js` | ✅ |
| GET | `/api/characters/list` | `api/characters/list.js` | ✅ |
| POST | `/api/characters/lock` | `api/characters/lock.js` | ✅ |
| POST | `/api/background/lock` | `api/context/lock.js` (routed) | ✅ |
| POST | `/api/characters/upsert` | `api/characters/upsert.js` | ✅ |
| POST | `/api/characters/delete` | `api/characters/delete.js` | ✅ |
| POST | `/api/characters/regenerate` | `api/characters/regenerate.js` | ✅ |
| POST | `/api/test-character-generation` | `api/test-character-generation.js` | ✅ |
| GET | `/api/health` | `api/health.js` | ✅ |

## Notes

1. **Duplicate Endpoint**: `/api/generate_next_scene` is defined twice (lines 197 and 1152) - both route to same handler ✅
2. **Inline Handlers**: 
   - `/api/update_chain` - Uses inline logic (could be extracted)
   - `/api/chain/lock` and `/api/chain/unlock` - Use `lockService.js` inline (acceptable)
3. **Routed Handlers**:
   - `/api/background/lock` - Routes to `context/lock.js` with `blockType='background'` ✅

## Recommendations

1. ✅ All endpoints have handlers
2. 🔄 Consider extracting `/api/update_chain` to separate handler file for consistency
3. ✅ Lock endpoints use unified `lockService.js` appropriately

---

**Status**: ✅ All endpoints verified

