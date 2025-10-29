# Logging System Guide

This project uses a centralized, color-coded logging system with emoji labels for better debugging and monitoring.

## Overview

The logging system provides:
- **Emoji labels** for quick visual identification of component
- **Color coding** for different components and log levels
- **Timestamps** on all log messages
- **Consistent format** across all application components
- **Browser and Node.js support** (separate implementations)

## Available Loggers

### Component Loggers

Each component has its own emoji and color:

| Component | Emoji | Color | Usage |
|-----------|-------|-------|-------|
| **Background** | 🌄 | Blue | Story background generation |
| **Character** | 🎭 | Magenta | Character generation and management |
| **Macro Chain** | 🔗 | Cyan | Macro chain operations |
| **Scene** | 🎬 | Green | Scene generation and editing |
| **Context** | 🧠 | Yellow | Context memory operations |
| **Storage** | 💾 | Gray | File system operations |
| **API** | 🌐 | Cyan | API endpoints |
| **AI** | 🤖 | Magenta | AI model interactions |
| **Lock** | 🔒 | Red | Lock management |
| **Validation** | ✅ | Green | Data validation |
| **Prompt** | 📝 | Blue | Prompt building |
| **Server** | ⚙️ | White | Server operations |
| **UI** | 🎨 | Purple | Frontend UI components |
| **Network** | 📡 | Cyan | Network requests |
| **Error** | ❌ | Red | Error handling |

### Log Levels

Each logger supports these levels:

| Level | Emoji | Usage |
|-------|-------|-------|
| **debug** | 🔍 | Detailed debugging information |
| **info** | ℹ️ | General information |
| **warn** | ⚠️ | Warning messages |
| **error** | ❌ | Error messages |
| **success** | ✅ | Success messages |

## Usage

### Backend (Node.js)

```javascript
import logger from './api/lib/logger.js';

// Get a component-specific logger
const log = logger.context;

// Use different log levels
log.debug('Detailed debugging info', { data: 'value' });
log.info('General information', { status: 'ok' });
log.warn('Warning message', { issue: 'something' });
log.error('Error occurred', error);
log.success('Operation completed successfully');

// Create a child logger with context
const childLog = log.child('SessionID:abc123');
childLog.info('This message includes the session context');

// Custom emoji message
log.custom('🎯', 'Custom message with specific emoji');

// Visual separators
log.separator(); // Default line
log.separator('═', 100); // Custom character and length

// Section headers
log.section('IMPORTANT SECTION');

// Group related logs
logger.group('context', 'Processing Context', (log) => {
  log.info('Step 1: Loading data');
  log.info('Step 2: Processing');
  log.success('Complete!');
});
```

### Frontend (Browser/React)

```typescript
import logger from '@/utils/logger';

// Get a component-specific logger
const log = logger.scene;

// Use different log levels (same API as backend)
log.debug('Component mounted', { props });
log.info('Fetching data');
log.warn('Validation issue', { field: 'name' });
log.error('Failed to save', error);
log.success('Data saved successfully');

// Create a child logger with context
const childLog = log.child({ sceneId: '123' });
childLog.info('Processing scene');

// Display data as a table
log.table([
  { id: 1, name: 'Item 1', status: 'active' },
  { id: 2, name: 'Item 2', status: 'inactive' }
]);

// Group related logs (uses console.group)
log.group('Scene Generation', (log) => {
  log.info('Building prompt');
  log.info('Calling AI model');
  log.success('Scene generated');
});
```

## Examples

### Backend Example Output

```
[12:34:56.789] 🧠 CONTEXT ℹ️ Context retrieved: { sessionId: 'abc', version: 5, blockTypes: [...] }
[12:34:56.790] 🌄 BACKGROUND ✅ SUCCESS Background generated successfully
[12:34:56.791] 🎭 CHARACTER 🔍 DEBUG Processing character data: {...}
[12:34:56.792] 🔒 LOCK ⚠️ WARN Lock already exists for scene: scene-123
[12:34:56.793] ❌ ERROR ❌ ERROR Failed to save: Network error
```

### Frontend Example Output

Browser console with styled output:
- Timestamps in gray
- Component names in their designated colors
- Log level emojis for quick scanning
- Structured data expanded in console

## Best Practices

### 1. Choose the Right Logger

Always use the most specific logger for your component:

```javascript
// ❌ Don't use generic logger
console.log('Processing background');

// ✅ Use component-specific logger
log.info('Processing background');
```

### 2. Use Appropriate Log Levels

```javascript
// Debug - Detailed technical info
log.debug('Raw API response:', response);

// Info - General flow information
log.info('Fetching user data');

// Warn - Something unexpected but not critical
log.warn('Cache miss, fetching from API');

// Error - Something failed
log.error('Failed to connect to database', error);

// Success - Positive outcome
log.success('User created successfully');
```

### 3. Include Context

Use child loggers to include contextual information:

```javascript
// ❌ Don't repeat context in every log
log.info(`[Session abc] Processing scene`);
log.info(`[Session abc] Scene complete`);

// ✅ Create child logger with context
const sessionLog = log.child('Session:abc');
sessionLog.info('Processing scene');
sessionLog.info('Scene complete');
```

### 4. Structure Your Data

```javascript
// ❌ Don't log unstructured strings
log.info('User John Doe (ID: 123) updated at 2025-10-21');

// ✅ Log structured objects
log.info('User updated', {
  userId: 123,
  userName: 'John Doe',
  timestamp: '2025-10-21T12:34:56Z'
});
```

### 5. Use Groups for Multi-Step Operations

```javascript
// ❌ Don't log individual steps without context
log.info('Validating input');
log.info('Calling API');
log.info('Processing response');

// ✅ Group related operations
log.group('User Registration', (log) => {
  log.info('Validating input');
  log.info('Calling API');
  log.success('User registered');
});
```

## Migration Guide

### Replacing console.log Statements

```javascript
// Old code
console.log('Processing data...');
console.warn('Warning message');
console.error('Error:', error);

// New code with logger
import logger from './api/lib/logger.js';
const log = logger.api; // or appropriate component

log.info('Processing data...');
log.warn('Warning message');
log.error('Error:', error);
```

### Adding Logger to New Files

1. Import the logger:
   ```javascript
   import logger from './api/lib/logger.js';
   ```

2. Get component-specific logger:
   ```javascript
   const log = logger.background; // or appropriate component
   ```

3. Replace all console statements:
   ```javascript
   log.info('Your message');
   log.error('Error message', error);
   ```

## Creating Custom Loggers

If you need a logger for a new component:

```javascript
// In api/lib/logger.js or src/utils/logger.ts
// Add to componentConfig:
YOUR_COMPONENT: {
  emoji: '🎯',
  color: '#FF5733',
  name: 'YOUR_COMPONENT'
}

// Add to loggers export:
yourComponent: createLogger('YOUR_COMPONENT')
```

## Performance Considerations

- Logs are always active (not just in debug mode)
- Use `log.debug()` for verbose information that's needed for debugging
- Use `log.info()` for important flow information
- Consider the volume of logs in production
- Browser console styling has minimal performance impact

## Troubleshooting

### Colors not showing in terminal

Make sure your terminal supports ANSI color codes. Most modern terminals do.

### Logs not appearing

1. Check that logger is imported correctly
2. Verify you're using the right component logger
3. Check browser console settings (filters may be active)

### Too many logs

Use `log.debug()` instead of `log.info()` for verbose output, then filter in your console.

---

**Remember**: Good logging is essential for debugging and monitoring. Use it liberally but thoughtfully!

