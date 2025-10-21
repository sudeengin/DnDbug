# Migration Scripts

Automated scripts for integrating the logging system into the project.

## 📜 Available Scripts

### 1. `migrate-to-logger.js`
**Purpose**: Migrate backend API files to use the logger system

**What it does**:
- Finds all JavaScript files in `/api` directory
- Adds appropriate logger import based on file type
- Replaces all `console.*` calls with logger methods
- Automatically determines component logger (background, scene, etc.)

**Usage**:
```bash
node migrate-to-logger.js
```

**Output**:
- ✅ Migrated: Files with logger added
- 🔄 Updated: Files with console replaced (already had logger)
- ⏭️ Skipped: Files with no console statements
- ❌ Errors: Files that failed to process

---

### 2. `migrate-frontend-to-logger.js`
**Purpose**: Migrate frontend React/TypeScript files to use the logger system

**What it does**:
- Finds all `.tsx` and `.ts` files in `/src` directory
- Adds appropriate logger import based on component type
- Replaces all `console.*` calls with logger methods
- Uses TypeScript-compatible imports (`@/utils/logger`)
- Automatically determines component logger (ui, scene, macroChain, etc.)

**Usage**:
```bash
node migrate-frontend-to-logger.js
```

**Output**:
- Same format as backend migration script
- Skips logger utility files automatically

---

### 3. `add-log-viewer-to-html.js`
**Purpose**: Add visual log viewer to test HTML pages

**What it does**:
- Finds all `test-*.html` files in project root
- Adds `<script src="log-viewer.js"></script>` to `<head>`
- Adds `padding-bottom: 420px` to body style (makes room for viewer)
- Preserves existing styles

**Usage**:
```bash
node add-log-viewer-to-html.js
```

**Output**:
- ✅ Updated: Files with log viewer added
- ⏭️ Skipped: Files that already have log viewer
- ❌ Errors: Files that failed to process

---

## 🎯 When to Use These Scripts

### Initial Setup (Done)
✅ All scripts have been run once during initial integration

### Future Use Cases

#### Adding New API Files
If you create new API files with `console.*` statements:
```bash
node migrate-to-logger.js
```
The script will:
- Find your new files
- Add logger imports
- Replace console calls
- Leave existing files unchanged

#### Adding New Frontend Components
If you create new React components with `console.*` statements:
```bash
node migrate-frontend-to-logger.js
```

#### Adding New Test HTML Pages
If you create new `test-*.html` files:
```bash
node add-log-viewer-to-html.js
```

---

## 🔧 How The Scripts Work

### File Detection

**Backend (`migrate-to-logger.js`)**:
```javascript
// Maps file paths to logger components
const FILE_MAPPINGS = {
  'generate_chain': 'macroChain',
  'generate_background': 'background',
  'generate_detail': 'scene',
  'characters/': 'character',
  'context/': 'context',
  'storage': 'storage',
  // ... etc
};
```

**Frontend (`migrate-frontend-to-logger.js`)**:
```javascript
const FILE_MAPPINGS = {
  'Background': 'background',
  'Character': 'character',
  'MacroChain': 'macroChain',
  'Scene': 'scene',
  'Context': 'context',
  'Project': 'ui',
  // ... etc
};
```

### Console Replacement

All scripts replace:
- `console.log()` → `log.info()`
- `console.warn()` → `log.warn()`
- `console.error()` → `log.error()`
- `console.info()` → `log.info()`
- `console.debug()` → `log.debug()`

Special cases:
- Lines with `===` or `---` → `log.debug()` (verbose debug)
- Lines starting with `DEBUG:` → `log.debug()`

---

## ⚙️ Customization

### Adding New Component Mappings

Edit the `FILE_MAPPINGS` object in the appropriate script:

```javascript
const FILE_MAPPINGS = {
  // ... existing mappings
  'new_feature/': 'newFeature',  // Add your mapping
};
```

### Changing Default Logger

Default loggers:
- **Backend**: `api` (for unmapped files)
- **Frontend**: `ui` (for unmapped files)

To change defaults, edit the `getLoggerComponent()` function:

```javascript
function getLoggerComponent(filePath) {
  for (const [pattern, component] of Object.entries(FILE_MAPPINGS)) {
    if (filePath.includes(pattern)) {
      return component;
    }
  }
  return 'api'; // Change this default
}
```

### Skipping Files

Scripts automatically skip:
- Files with no console statements
- Files that already have logger imported
- Logger utility files themselves (`logger.js`, `logger.ts`, `log-viewer.ts`)

To skip additional files, add checks in `processFile()`:

```javascript
async function processFile(filePath) {
  // Skip custom files
  if (filePath.includes('my-custom-file')) {
    return { file: filePath, status: 'skipped', reason: 'Custom skip' };
  }
  // ... rest of function
}
```

---

## 🐛 Troubleshooting

### Script Reports Errors

Check the error output:
```
❌ Errors: 2 files

⚠️  Files with errors:
  - api/some-file.js: Cannot read file
```

Common fixes:
1. **File permissions**: Ensure files are writable
2. **Syntax errors**: Fix any existing syntax errors in source files
3. **File encoding**: Ensure files are UTF-8 encoded

### Logger Not Found After Migration

1. Check the import path is correct:
   - Backend: `'./lib/logger.js'` (adjust `../` based on depth)
   - Frontend: `'@/utils/logger'` (uses TypeScript path alias)

2. Verify logger files exist:
   - `api/lib/logger.js` (backend)
   - `src/utils/logger.ts` (frontend)

### Log Viewer Not Appearing

1. Check `log-viewer.js` exists in project root
2. Check browser console for script loading errors
3. Verify HTML has `<script src="log-viewer.js"></script>`
4. Check body has `padding-bottom: 420px` or similar

---

## 📊 Script Performance

Typical execution times (on this project):

| Script | Files | Time | Speed |
|--------|-------|------|-------|
| Backend Migration | 33 files | ~2-3 sec | ~11 files/sec |
| Frontend Migration | 50 files | ~3-4 sec | ~13 files/sec |
| HTML Viewer | 27 files | ~1-2 sec | ~18 files/sec |

**Total**: 110 files in ~8 seconds ⚡

---

## 🔄 Re-running Scripts

It's **safe to re-run** any script multiple times:

1. **No duplicates**: Scripts detect existing logger imports
2. **Idempotent**: Running multiple times produces same result
3. **Status tracking**: Scripts report what was changed vs skipped

Example:
```bash
# First run
✅ Migrated: 24 files

# Second run (no changes needed)
⏭️ Skipped: 24 files (already using logger)
```

---

## 🎯 Best Practices

### Before Running Scripts
1. **Commit your changes**: Have a clean git state
2. **Review the diff**: Check what changed after running
3. **Test your code**: Verify everything still works

### After Running Scripts
1. **Check the summary**: Review migrated/updated counts
2. **Spot check files**: Look at a few updated files
3. **Run linter**: `npm run lint` (if configured)
4. **Test the app**: Make sure logs appear correctly
5. **Commit changes**: `git add . && git commit -m "feat: integrate logging system"`

---

## 📚 Related Documentation

- `LOGGING_GUIDE.md` - How to use the logger
- `LOGGER_QUICK_REFERENCE.md` - Quick reference
- `LOG_VIEWER_HTML_GUIDE.md` - HTML viewer usage
- `LOGGING_SYSTEM_FULLY_INTEGRATED.md` - Integration summary

---

## 🎉 Success!

These scripts helped integrate the logging system across:
- ✅ 27 backend API files
- ✅ 20 frontend components
- ✅ 27 test HTML pages

**Total: 74 files updated automatically!** 🚀

---

**Note**: Keep these scripts for future maintenance as the project grows!

