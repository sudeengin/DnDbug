# Debug & Flow Logging System - Implementation Guide

## Overview

The unified Debug & Flow Logging system provides comprehensive logging for all frontend test flows, capturing every major step of test execution (generate → hydrate → validate → lock → append) with context-rich logs. This system allows developers and testers to export debug reports for reproduction and analysis of any failure.

## Features

- **Scoped Logging**: Log messages with specific scopes (component, API, test phase, etc.)
- **Context-Rich Logs**: Include environment info (sessionId, route, component, timestamp)
- **Test Flow Tracking**: Specialized logging for test phases (generate, hydrate, validate, lock, append)
- **API Call Logging**: Automatic logging of all API requests and responses
- **Error Capture**: Automatic capture of console errors, warnings, and unhandled rejections
- **Export Functionality**: Download debug reports as JSON files
- **Upload Functionality**: Send debug reports to backend for analysis
- **Framework Agnostic**: Can wrap any module or function for debugging

## Core Components

### 1. DebugCollector (`src/utils/debug-collector.ts`)

The main debug collection utility that provides:

```typescript
import { debug } from './utils/debug-collector';

// Basic logging
debug.info('component-name', 'Action completed', { data: 'example' });
debug.warn('api', 'Request timeout', { endpoint: '/api/test' });
debug.error('validation', 'Validation failed', { errors: ['field required'] });

// Test flow logging
debug.testPhase('generate', 'Starting generation', inputData, outputData);
debug.testPhase('validate', 'Validating response', responseData);
debug.testPhase('lock', 'Locking scene', { sceneId: '123' });
debug.testPhase('append', 'Appending to context', contextData);

// API call logging
debug.apiCall('/api/generate_chain', 'POST', requestData, responseData);

// Component action logging
debug.component('MacroChainApp', 'Chain generated', { chainId: 'abc123' });

// Validation logging
debug.validation('chain-validation', true, [], ['minor warning']);
```

### 2. React Hook (`src/hooks/useDebug.ts`)

Easy integration with React components:

```typescript
import { useDebug } from '../hooks/useDebug';

function MyComponent() {
  const { logAction, logTestPhase, logApiCall, logValidation } = useDebug({
    component: 'MyComponent',
    sessionId: 'session-123',
    route: '/my-route',
  });

  const handleAction = async () => {
    logAction('button-clicked', { buttonId: 'generate' });
    
    try {
      logTestPhase('generate', 'Starting generation', inputData);
      const result = await api.generate(inputData);
      logTestPhase('generate', 'Generation completed', inputData, result);
    } catch (error) {
      logAction('generation-failed', { error });
    }
  };
}
```

### 3. Debug Panel (`src/components/DebugPanel.tsx`)

A comprehensive UI for managing debug logs:

- **Real-time log viewing** with filtering by scope and level
- **Export functionality** to download debug reports
- **Upload functionality** to send reports to backend
- **Statistics** showing log counts by level and scope
- **Search functionality** to find specific logs

### 4. Debug Toggle (`src/components/DebugToggle.tsx`)

A floating button that provides easy access to the debug panel from any page.

## Integration Examples

### 1. Basic Component Integration

```typescript
import { useDebug } from '../hooks/useDebug';

export default function CharacterForm() {
  const { logAction, logValidation } = useDebug({
    component: 'CharacterForm',
    route: '/characters',
  });

  const handleSubmit = async (formData) => {
    logAction('form-submit-started', { formData });
    
    // Validate form
    const validation = validateForm(formData);
    logValidation('character-form', validation.isValid, validation.errors);
    
    if (!validation.isValid) {
      logAction('form-validation-failed', { errors: validation.errors });
      return;
    }
    
    try {
      const result = await api.createCharacter(formData);
      logAction('character-created', { characterId: result.id });
    } catch (error) {
      logAction('character-creation-failed', { error });
    }
  };
}
```

### 2. API Integration

The existing API functions have been enhanced with automatic debug logging:

```typescript
import { postJSON } from '../lib/api';

// This automatically logs the API call
const response = await postJSON('/api/generate_chain', requestData);
```

### 3. Test Flow Integration

```typescript
import { debug } from '../utils/debug-collector';

async function executeTestFlow(inputData) {
  try {
    // Phase 1: Generate
    debug.testPhase('generate', 'Starting generation', inputData);
    const generated = await generateContent(inputData);
    debug.testPhase('generate', 'Generation completed', inputData, generated);
    
    // Phase 2: Hydrate
    debug.testPhase('hydrate', 'Starting hydration', generated);
    const hydrated = await hydrateContent(generated);
    debug.testPhase('hydrate', 'Hydration completed', generated, hydrated);
    
    // Phase 3: Validate
    debug.testPhase('validate', 'Starting validation', hydrated);
    const validation = await validateContent(hydrated);
    debug.validation('content-validation', validation.isValid, validation.errors);
    
    if (!validation.isValid) {
      debug.testPhase('validate', 'Validation failed', hydrated, validation);
      return;
    }
    
    // Phase 4: Lock
    debug.testPhase('lock', 'Starting lock', hydrated);
    const locked = await lockContent(hydrated);
    debug.testPhase('lock', 'Lock completed', hydrated, locked);
    
    // Phase 5: Append
    debug.testPhase('append', 'Starting append', locked);
    const appended = await appendToContext(locked);
    debug.testPhase('append', 'Append completed', locked, appended);
    
    debug.info('test-flow', 'Complete test flow executed successfully');
    
  } catch (error) {
    debug.error('test-flow', 'Test flow failed', { error, inputData });
    throw error;
  }
}
```

### 4. Module Wrapping

For framework-agnostic debugging of any module:

```typescript
import { debug } from '../utils/debug-collector';

// Wrap any module for automatic function call logging
const wrappedApi = debug.wrapModule('character-api', {
  createCharacter: async (data) => { /* implementation */ },
  updateCharacter: async (id, data) => { /* implementation */ },
  deleteCharacter: async (id) => { /* implementation */ },
});

// All function calls are now automatically logged
await wrappedApi.createCharacter(characterData);
```

## Usage Instructions

### 1. Enable Debug Mode

Debug mode can be enabled in several ways:

- **Via Debug Panel**: Click the floating debug button and toggle "Debug ON"
- **Via localStorage**: Set `localStorage.setItem('debug_mode', 'true')`
- **Programmatically**: Call `debug.enable()`

### 2. View Logs

- Click the floating debug button to open the debug panel
- Use filters to view logs by scope, level, or search term
- View real-time statistics about log counts

### 3. Export Debug Reports

- Click "Export Report" in the debug panel
- This downloads a comprehensive JSON file containing:
  - All collected logs with timestamps
  - Environment information
  - Summary statistics
  - Error details and stack traces

### 4. Upload Debug Reports

- Click "Upload Report" in the debug panel
- This sends the debug report to `/api/debug/report` for backend analysis
- Useful for automated error reporting and analysis

## Backend Integration

The debug system includes backend endpoints for managing debug reports:

- `POST /api/debug/report` - Upload debug report
- `GET /api/debug/reports` - List uploaded reports
- `GET /api/debug/reports/:filename` - Download specific report
- `DELETE /api/debug/reports/:filename` - Delete specific report
- `GET /api/debug/health` - Health check for debug service

## Best Practices

### 1. Scope Naming

Use consistent, descriptive scope names:

```typescript
// Good
debug.info('component:CharacterForm', 'Form submitted', data);
debug.info('api:characters', 'POST /api/characters', requestData);
debug.info('test-flow:generate', 'Generation started', inputData);

// Avoid
debug.info('comp', 'done', data);
debug.info('api', 'call', requestData);
```

### 2. Data Sanitization

The debug system automatically sanitizes data to prevent:
- Circular references
- Oversized strings (>10KB)
- Sensitive information exposure

### 3. Error Context

Always include relevant context in error logs:

```typescript
try {
  await riskyOperation();
} catch (error) {
  debug.error('operation', 'Operation failed', {
    error: error.message,
    stack: error.stack,
    context: { userId, sessionId, timestamp: Date.now() }
  });
}
```

### 4. Performance Considerations

- Debug logging is disabled by default to avoid performance impact
- Logs are automatically limited to 1000 entries to prevent memory issues
- Large data objects are automatically truncated

## Validation

The debug system provides comprehensive validation:

1. **During Test Flows**: All major steps are logged with input/output snapshots
2. **Error Capture**: Every error includes scope, message, stack trace, and state snapshot
3. **Export Validation**: Debug reports include complete context for reproduction
4. **No Silent Failures**: Every unexpected state is logged with source and context

## Acceptance Criteria ✅

- ✅ Debug Mode available globally via floating button
- ✅ Logs collected per test phase and exportable as JSON
- ✅ No more silent failures — every unexpected state is logged with source and context
- ✅ Framework-agnostic design that can wrap any module
- ✅ Automatic API call logging
- ✅ Real-time log viewing with filtering and search
- ✅ Backend integration for report upload and analysis
- ✅ Comprehensive error capture including stack traces
- ✅ Environment context tracking (sessionId, route, component, timestamp)

The debug system is now fully integrated and ready for use across all frontend test flows.
