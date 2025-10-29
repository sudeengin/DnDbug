# Console.log Audit

**Date**: October 29, 2025

## Summary

Audited `console.log` statements in `server.js` and related files to ensure proper logging system usage.

## Findings

### server.js

**Current State**: Uses `console.log` and `console.error` throughout

**Recommendations**:

1. **Startup Validation** (lines 10-42):
   - ✅ Keep `console.log/error` - These are startup diagnostics
   - ⚠️ Consider using `logger.server` for consistency

2. **Request Logging Middleware** (line 55):
   - ⚠️ Should use `logger.api.info()` instead
   - Currently: `console.log('📨 ${req.method}...')`
   - Recommended: Use logger system

3. **Error Handling**:
   - ✅ `console.error` in error handlers is acceptable
   - Consider adding structured logging

4. **Debug/Analysis Logs** (lines 210-347):
   - ⚠️ Multiple `console.log` statements for debugging
   - Should migrate to `logger.macroChain.debug()` or `logger.scene.info()`

5. **Telemetry/Info Logs**:
   - ⚠️ Should use appropriate logger scopes

## Migration Strategy

### Priority 1: Request Logging
Replace middleware `console.log` with:
```javascript
import logger from './api/lib/logger.js';
const log = logger.api;

// In middleware:
log.info(`${req.method} ${req.url}`, { bodyPreview });
```

### Priority 2: Debug Logs in Endpoints
Replace endpoint `console.log` with appropriate loggers:
```javascript
const log = logger.macroChain; // or logger.scene, logger.background, etc.
log.debug('update_chain: Received request', { chainId, sessionId });
```

### Priority 3: Error Logs
Keep `console.error` for critical errors, but also use logger:
```javascript
log.error('Error in endpoint:', error);
```

## Status

- **Total console.log statements**: ~29 in server.js
- **Should migrate**: ~25 statements
- **Keep as-is**: ~4 (startup validation, critical errors)

## Action Items

1. ✅ Logger system is available and well-structured
2. ⚠️ Migration needed for consistency
3. 📝 Create migration script or manual migration

---

**Status**: ⚠️ Migration recommended but not critical (system works with console.log)

