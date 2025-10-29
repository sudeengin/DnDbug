# Debug Scripts

This directory contains debug and testing scripts for development purposes.

## Available Scripts

### `debug-character-generation.js`
Tests character generation API endpoints with a full workflow:
- Server health check
- Background generation
- Character generation
- Validation

**Usage:**
```bash
node scripts/debug/debug-character-generation.js
```

### `debug-character-response.js`
Analyzes character generation responses and validates structure.

### `debug-prompt.js`
Tests prompt rendering and template system.

### `fix-missing-context.js`
Emergency fix script to add missing background and characters to context.
**Note**: Contains hardcoded session ID - update before use.

**Usage:**
```bash
# Edit the SESSION_ID in the file first
node scripts/debug/fix-missing-context.js
```

## Status

These scripts are:
- **Essential**: ✅ Keep for debugging purposes
- **Documented**: ✅ This README
- **Organized**: ✅ Moved from root to scripts/debug/

## When to Use

- **During Development**: Use these scripts to test API functionality
- **Debugging**: When troubleshooting character generation or context issues
- **Testing**: Before deploying changes to verify endpoints work

---

**Note**: Update hardcoded session IDs in scripts before running them.

