# 🎯 Optimization TODO List

**Generated:** October 29, 2025  
**Based on:** Comprehensive file analysis and codebase audit

---

## 🚨 **CRITICAL (Fix Immediately)**

### ✅ TODO-1: Restore Missing API File
- **Task**: Restore `api/background/lock.js` file
- **Impact**: Server crashes when `/api/background/lock` endpoint is called
- **Solution**: 
  ```bash
  # Option 1: Restore from git
  git checkout HEAD -- api/background/lock.js
  
  # Option 2: Create new file based on api/characters/lock.js pattern
  # Copy api/characters/lock.js → api/background/lock.js
  # Replace 'characters' with 'background' and 'bumpCharactersV' with 'bumpBackgroundV'
  ```
- **Priority**: 🔴 **CRITICAL**
- **Estimated Time**: 15 minutes

### ✅ TODO-2: Remove Duplicate Configuration
- **Task**: Delete `tailwind.config.cjs` (keep `tailwind.config.js`)
- **Impact**: Prevents configuration conflicts
- **Solution**:
  ```bash
  rm tailwind.config.cjs
  ```
- **Priority**: 🔴 **CRITICAL**
- **Estimated Time**: 1 minute

---

## ⚠️ **HIGH PRIORITY (Complete Soon)**

### ✅ TODO-3: Organize Documentation Structure
- **Task**: Move 34 root-level `.md` files into organized `/docs` directory
- **Impact**: Better project organization, easier navigation
- **Structure**:
  ```
  docs/
  ├── implementation/
  │   ├── BACKGROUND_IMPLEMENTATION_SUMMARY.md
  │   ├── CHARACTER_GENERATION_REFACTOR.md
  │   ├── CONTEXT_AWARE_IMPLEMENTATION.md
  │   ├── MACRO_CHAIN_IMPLEMENTATION.md
  │   └── TWO_LAYER_ARCHITECTURE.md
  ├── bug-fixes/
  │   ├── BUG_FIX_EDIT_MODE_EXIT.md
  │   └── BUG_FIX_SCENE_DELETION_LOCK.md
  ├── features/
  │   ├── CHARACTER_FIELDS_ENHANCEMENT_COMPLETE.md
  │   ├── CHARACTER_SHEET_INTEGRATION_COMPLETE.md
  │   ├── INTELLIGENT_MAPPING_COMPLETE.md
  │   └── SRD_2014_PHASE_1_COMPLETE.md
  ├── logging/
  │   ├── LOGGER_QUICK_REFERENCE.md
  │   ├── LOGGING_GUIDE.md
  │   ├── LOGGING_SYSTEM_FULLY_INTEGRATED.md
  │   └── ...
  ├── prompts/
  │   ├── ACTIVE_PROMPTS_SUMMARY.md
  │   └── PROMPTS_REFERENCE.md
  └── guides/
      └── LOCK_ADVANCE_WORKFLOW_GUIDE.md
  ```
- **Priority**: 🟠 **HIGH**
- **Estimated Time**: 30 minutes

### ✅ TODO-4: Verify All API Endpoints
- **Task**: Audit `server.js` to ensure all imported API handlers exist
- **Impact**: Prevent runtime import errors
- **Action**: Search for all `import('./api/...')` statements and verify files exist
- **Priority**: 🟠 **HIGH**
- **Estimated Time**: 20 minutes

### ✅ TODO-5: Create Missing Lock File
- **Task**: Implement `api/background/lock.js` if restoration fails
- **Impact**: Complete API functionality
- **Template**: Based on `api/characters/lock.js`
- **Priority**: 🟠 **HIGH**
- **Estimated Time**: 15 minutes

---

## 📋 **MEDIUM PRIORITY (Organize & Clean)**

### ✅ TODO-6: Archive Migration Scripts
- **Task**: Move completed migration scripts to `/scripts/archive/`
- **Files**:
  - `migrate-to-logger.js`
  - `migrate-frontend-to-logger.js`
- **Reason**: Scripts are complete, keeping them in root clutters workspace
- **Priority**: 🟡 **MEDIUM**
- **Estimated Time**: 5 minutes

### ✅ TODO-7: Review Debug Components
- **Task**: Consolidate or document duplicate debug components
- **Components to Review**:
  - `DebugPanel.tsx`
  - `DebugToggle.tsx`
  - `SimpleDebugToggle.tsx`
  - `DebugExample.tsx`
- **Action**: Decide which to keep, which to merge, or document their different purposes
- **Priority**: 🟡 **MEDIUM**
- **Estimated Time**: 30 minutes

### ✅ TODO-8: Update Main README.md
- **Task**: Enhance `README.md` with comprehensive project overview
- **Content to Add**:
  - Architecture overview
  - Key features
  - Project structure
  - Links to key documentation
  - Development workflow
  - API endpoint overview
- **Priority**: 🟡 **MEDIUM**
- **Estimated Time**: 45 minutes

### ✅ TODO-9: Review Test/Debug Scripts
- **Task**: Audit root-level debug scripts
- **Scripts to Review**:
  - `debug-character-generation.js`
  - `debug-character-response.js`
  - `debug-prompt.js`
  - `fix-missing-context.js`
- **Action**: Keep essential ones, remove obsolete, or move to `/scripts/debug/`
- **Priority**: 🟡 **MEDIUM**
- **Estimated Time**: 20 minutes

### ✅ TODO-10: Verify Prompt Documentation
- **Task**: Update `PROMPTS_REFERENCE.md` with all 7 active prompts verified
- **Prompts to Verify**:
  1. Background Generation ✅
  2. Character Generation ✅
  3. Macro Chain Generation ✅
  4. Scene Detail Generation ✅
  5. Next Scene Generation ✅
  6. Delta Analysis ✅
  7. Character Regeneration ✅
- **Priority**: 🟡 **MEDIUM**
- **Estimated Time**: 30 minutes

---

## 🔧 **LOW PRIORITY (Optimization & Maintenance)**

### ✅ TODO-11: Implement Log Rotation
- **Task**: Add log rotation for `server.log` and `vite.log`
- **Impact**: Prevent disk space issues
- **Solution**: Use `winston` or similar logging library with rotation
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 1 hour

### ✅ TODO-12: Audit Dependencies
- **Task**: Check `package.json` for unused dependencies
- **Action**: Run `npm-check-unused` or manually verify all imports
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 30 minutes

### ✅ TODO-13: Review Context Data Management
- **Task**: Review `.data/context.json` size and implement cleanup/archival
- **Impact**: Prevent storage bloat
- **Action**: Implement session expiry or archival system
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 2 hours

### ✅ TODO-14: Verify Vercel Configuration
- **Task**: Check `vercel.json` matches actual API file structure
- **Current**: Configures `api/*.ts` files
- **Reality**: Most API files are `.js`
- **Action**: Update or verify configuration
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 15 minutes

### ✅ TODO-15: Create .env.example
- **Task**: Create `.env.example` template file
- **Content**: List all required environment variables with descriptions
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 10 minutes

### ✅ TODO-16: Audit Prompt Templates
- **Task**: Review `api/lib/prompt.js` for redundancy or optimization
- **Action**: Check if template functions can be consolidated
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 45 minutes

### ✅ TODO-17: Audit Console.log Usage
- **Task**: Ensure all `console.log` statements use logger system
- **Action**: Search for `console.log` and replace with appropriate logger calls
- **Priority**: 🟢 **LOW**
- **Estimated Time**: 1 hour

---

## 📊 **Summary**

| Priority | Count | Estimated Time |
|----------|-------|----------------|
| 🔴 Critical | 2 | 16 minutes |
| 🟠 High | 3 | 1 hour 5 minutes |
| 🟡 Medium | 5 | 2 hours 10 minutes |
| 🟢 Low | 7 | 7 hours 25 minutes |
| **TOTAL** | **17** | **~11 hours** |

---

## 🚀 **Quick Win Checklist**

Complete these first for maximum impact with minimal effort:

- [ ] ✅ TODO-1: Restore `api/background/lock.js`
- [ ] ✅ TODO-2: Delete `tailwind.config.cjs`
- [ ] ✅ TODO-4: Verify API endpoints
- [ ] ✅ TODO-9: Review debug scripts
- [ ] ✅ TODO-15: Create `.env.example`

**Estimated Quick Win Time**: ~1.5 hours

---

## 📝 **Notes**

- All tasks are based on comprehensive file analysis
- Priorities are suggestions - adjust based on project needs
- Some tasks can be done in parallel
- Consider creating issues/tickets for tracking
- Review TODO list weekly for progress updates

---

**Last Updated**: October 29, 2025

