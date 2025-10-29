# Logger Quick Reference Card

## 📦 Import

```javascript
// Backend
import logger from './api/lib/logger.js';

// Frontend
import logger from '@/utils/logger';
```

## 🎯 Get Component Logger

```javascript
const log = logger.context;      // 🧠 Context
const log = logger.background;   // 🌄 Background
const log = logger.character;    // 🎭 Character
const log = logger.macroChain;   // 🔗 Macro Chain
const log = logger.scene;        // 🎬 Scene
const log = logger.storage;      // 💾 Storage
const log = logger.api;          // 🌐 API
const log = logger.ai;           // 🤖 AI
const log = logger.lock;         // 🔒 Lock
const log = logger.server;       // ⚙️ Server
```

## 📝 Basic Logging

```javascript
log.debug('Detailed info');       // 🔍 DEBUG
log.info('General info');         // ℹ️ INFO
log.warn('Warning');              // ⚠️ WARN
log.error('Error', error);        // ❌ ERROR
log.success('Success!');          // ✅ SUCCESS
```

## 🎨 Advanced Features

```javascript
// Child logger with context
const sessionLog = log.child('Session:abc123');
sessionLog.info('Message includes session context');

// Custom emoji
log.custom('🎯', 'Custom message');

// Visual separators
log.separator();              // ────────────────────
log.separator('═', 50);       // ═══════════════

// Section header
log.section('IMPORTANT SECTION');

// Grouped operations
log.group('Title', (log) => {
  log.info('Step 1');
  log.info('Step 2');
  log.success('Done');
});

// Table (frontend only)
log.table(data);
```

## 🔄 Migration Pattern

```javascript
// ❌ Old
console.log('Processing...');
console.warn('Warning');
console.error('Error:', error);

// ✅ New
log.info('Processing...');
log.warn('Warning');
log.error('Error:', error);
```

## 📊 Structured Data

```javascript
// ✅ Good - Structured
log.info('User created', {
  userId: 123,
  name: 'John',
  timestamp: Date.now()
});

// ❌ Bad - String concat
log.info('User 123 John created at ' + Date.now());
```

## 🎭 Component Emojis

| Component | Emoji | Component | Emoji |
|-----------|-------|-----------|-------|
| Background | 🌄 | Context | 🧠 |
| Character | 🎭 | Storage | 💾 |
| Macro Chain | 🔗 | API | 🌐 |
| Scene | 🎬 | AI | 🤖 |
| Lock | 🔒 | Server | ⚙️ |
| Validation | ✅ | Prompt | 📝 |
| UI | 🎨 | Network | 📡 |
| Error | ❌ | | |

## 💡 Best Practices

✅ **DO**
- Use component-specific loggers
- Log structured data (objects)
- Use child loggers for context
- Group related operations
- Use appropriate log levels

❌ **DON'T**
- Use generic console.log
- Log sensitive data (passwords, tokens)
- Log inside tight loops (performance)
- Concat strings (use objects instead)

## 🎬 Complete Example

```javascript
import logger from './api/lib/logger.js';
const log = logger.scene;

async function generateScene(sceneId, sessionId) {
  const sceneLog = log.child({ sceneId, sessionId });
  
  sceneLog.info('Starting scene generation');
  
  try {
    sceneLog.debug('Loading context');
    const context = await loadContext(sessionId);
    sceneLog.success('Context loaded');
    
    sceneLog.info('Calling AI model');
    const result = await callAI(context);
    sceneLog.success('Scene generated', { 
      tokens: result.tokens 
    });
    
    logger.storage.info('Saving scene');
    await saveScene(sceneId, result);
    logger.storage.success('Scene saved');
    
    return result;
    
  } catch (error) {
    sceneLog.error('Generation failed', error);
    throw error;
  }
}
```

## 🔗 See Also

- `LOGGING_GUIDE.md` - Full documentation
- `LOGGING_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `test-logger-demo.js` - Working examples

---

**Quick Start**: `import logger from './api/lib/logger.js'` → `const log = logger.component` → `log.info('message')`

