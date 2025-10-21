# Logger Visual Examples

This document shows what the logger output looks like in practice.

## 🖥️ Terminal Output (Backend)

### Basic Log Levels

```
[14:23:45.123] 🧠 CONTEXT 🔍 DEBUG Loading session context from storage
[14:23:45.234] 🧠 CONTEXT ℹ️ Session context loaded successfully
[14:23:45.345] 🧠 CONTEXT ⚠️ WARN Context version mismatch detected
[14:23:45.456] 🧠 CONTEXT ❌ ERROR Failed to load context: Network timeout
[14:23:45.567] 🧠 CONTEXT ✅ SUCCESS Context saved successfully
```

### Different Components

```
[14:23:45.123] 🌄 BACKGROUND ℹ️ Generating story background
[14:23:45.234] 🎭 CHARACTER ℹ️ Creating party members
[14:23:45.345] 🔗 MACRO_CHAIN ℹ️ Building adventure path
[14:23:45.456] 🎬 SCENE ℹ️ Generating opening scene
[14:23:45.567] 💾 STORAGE ✅ SUCCESS All data saved
```

### With Context (Child Logger)

```
[14:23:45.123] 🎬 SCENE ℹ️ [Scene:scene-123] Starting generation
[14:23:45.234] 🎬 SCENE ℹ️ [Scene:scene-123] Building prompt
[14:23:45.345] 🎬 SCENE ℹ️ [Scene:scene-123] Calling AI model
[14:23:45.456] 🎬 SCENE ✅ SUCCESS [Scene:scene-123] Generation complete
```

### Structured Data

```
[14:23:45.123] 🧠 CONTEXT ℹ️ Context loaded: {
  sessionId: 'session-abc123',
  version: 7,
  blocks: ['background', 'characters', 'blueprint'],
  timestamp: 1729521825123
}
```

### Section Headers

```
═══════════════════════════════════════════════════════════════════════════════
🎬 SCENE SCENE GENERATION WORKFLOW
═══════════════════════════════════════════════════════════════════════════════

[14:23:45.123] 🎬 SCENE ℹ️ Step 1: Loading context
[14:23:45.234] 🎬 SCENE ℹ️ Step 2: Building prompt
[14:23:45.345] 🎬 SCENE ℹ️ Step 3: Calling AI
[14:23:45.456] 🎬 SCENE ✅ SUCCESS Scene generated
```

### Workflow Example

```
═══════════════════════════════════════════════════════════════════════════════
⚙️ SERVER USER REQUEST PROCESSING
═══════════════════════════════════════════════════════════════════════════════

[14:23:45.123] 🌐 API ℹ️ [RequestID:req-789] Incoming request: {
  endpoint: '/api/scene/generate',
  method: 'POST'
}
[14:23:45.234] ✅ VALIDATION ℹ️ Validating request payload
[14:23:45.345] ✅ VALIDATION ✅ SUCCESS Validation passed
[14:23:45.456] 🧠 CONTEXT ℹ️ Loading session context
[14:23:45.567] 🧠 CONTEXT ✅ SUCCESS Context loaded: { version: 7 }
[14:23:45.678] 🔒 LOCK ℹ️ Checking scene lock status
[14:23:45.789] 🔒 LOCK 🔍 DEBUG No active lock found
[14:23:45.890] 🔒 LOCK ✅ SUCCESS Lock acquired
[14:23:45.901] 🤖 AI ℹ️ Preparing AI prompt
[14:23:45.912] 📝 PROMPT 🔍 DEBUG Building prompt from context
[14:23:45.923] 📝 PROMPT ℹ️ Prompt ready: { tokens: 1250 }
[14:23:46.034] 🤖 AI ℹ️ Calling AI model
[14:23:47.145] 🤖 AI ✅ SUCCESS AI response received: { tokens: 850 }
[14:23:47.256] 💾 STORAGE ℹ️ Saving scene to storage
[14:23:47.367] 💾 STORAGE ✅ SUCCESS Scene saved: { sceneId: 'scene-new-123' }
[14:23:47.478] 🧠 CONTEXT ℹ️ Updating context memory
[14:23:47.589] 🧠 CONTEXT ✅ SUCCESS Context updated: { newVersion: 8 }
[14:23:47.690] 🔒 LOCK ℹ️ Releasing scene lock
[14:23:47.701] 🔒 LOCK ✅ SUCCESS Lock released
[14:23:47.812] 🌐 API ✅ SUCCESS [RequestID:req-789] Request completed successfully
```

### Error Scenario

```
[14:23:45.123] 🎬 SCENE ℹ️ Attempting scene generation
[14:23:45.234] 🎬 SCENE 🔍 DEBUG Processing step 1
[14:23:45.345] 🎬 SCENE 🔍 DEBUG Processing step 2
[14:23:45.456] 🎬 SCENE ❌ ERROR Operation failed: {
  error: 'Network timeout',
  stack: 'Error: Network timeout at generateScene (/api/generate_detail.js:45:11)'
}
[14:23:45.567] ❌ ERROR ❌ ERROR Error details: {
  component: 'scene',
  operation: 'generate',
  timestamp: '2025-10-21T14:23:45.567Z',
  error: 'Network timeout'
}
[14:23:45.678] 🎬 SCENE ⚠️ WARN Attempting retry...
[14:23:46.789] 🎬 SCENE ✅ SUCCESS Retry successful
```

## 🌐 Browser Console Output (Frontend)

### Standard Logs

Console will show styled output with:
- **Timestamps** in gray
- **Component names** in their designated colors
- **Emoji icons** for quick scanning
- **Expandable objects** for structured data

Example appearance in browser DevTools:

```
[14:23:45.123] 🎬 SCENE ℹ️ Generating scene
    ↓ { sceneId: "scene-123", sessionId: "abc" }
[14:23:45.234] 🎬 SCENE ✅ SUCCESS Scene generated
    ↓ { tokens: 850, duration: "1.2s" }
```

### Grouped Logs

```
▼ 🎬 SCENE Scene Generation Process
  [14:23:45.123] 🎬 SCENE ℹ️ Loading context
  [14:23:45.234] 🎬 SCENE ℹ️ Building prompt
  [14:23:45.345] 🎬 SCENE ℹ️ Calling AI model
  [14:23:45.456] 🎬 SCENE ✅ SUCCESS Scene generated successfully
```

### Table Output

```
[14:23:45.123] 🎬 SCENE

┌─────────┬──────────────┬──────────┬──────────┐
│ (index) │     name     │  status  │  tokens  │
├─────────┼──────────────┼──────────┼──────────┤
│    0    │  'Scene 1'   │ 'active' │   1250   │
│    1    │  'Scene 2'   │ 'pending'│    0     │
│    2    │  'Scene 3'   │ 'draft'  │   850    │
└─────────┴──────────────┴──────────┴──────────┘
```

## 🎨 Color Reference

In actual terminal/console output, you'll see these colors:

- 🌄 **BACKGROUND** - Blue (#3B82F6)
- 🎭 **CHARACTER** - Magenta (#D946EF)
- 🔗 **MACRO_CHAIN** - Cyan (#06B6D4)
- 🎬 **SCENE** - Green (#10B981)
- 🧠 **CONTEXT** - Yellow/Orange (#F59E0B)
- 💾 **STORAGE** - Gray (#6B7280)
- 🌐 **API** - Cyan (#06B6D4)
- 🤖 **AI** - Magenta (#D946EF)
- 🔒 **LOCK** - Red (#EF4444)
- ✅ **VALIDATION** - Green (#10B981)
- 🎨 **UI** - Purple (#8B5CF6)
- 📡 **NETWORK** - Cyan (#06B6D4)
- ❌ **ERROR** - Red (#EF4444)

## 📊 Real-World Example

Complete workflow from user request to response:

```
═══════════════════════════════════════════════════════════════════════════════
⚙️ SERVER NEW SCENE GENERATION REQUEST
═══════════════════════════════════════════════════════════════════════════════

[14:23:45.001] 🌐 API ℹ️ POST /api/scene/generate { sessionId: 'abc123' }
[14:23:45.010] ✅ VALIDATION 🔍 DEBUG Validating request body
[14:23:45.020] ✅ VALIDATION ✅ SUCCESS Request valid

[14:23:45.030] 🧠 CONTEXT ℹ️ Loading session context for abc123
[14:23:45.045] 💾 STORAGE 🔍 DEBUG Session context loaded: abc123
[14:23:45.050] 🧠 CONTEXT ✅ SUCCESS Loaded existing session context for abc123 - version: 12

[14:23:45.060] 🔒 LOCK ℹ️ Acquiring lock for scene generation
[14:23:45.065] 🔒 LOCK ✅ SUCCESS Lock acquired: scene-gen-abc123

[14:23:45.070] 🌄 BACKGROUND 🔍 DEBUG Processing background: {
  premise: 'Epic fantasy adventure in...',
  tone_rules: ['Dark and gritty', 'High stakes'],
  stakes: ['Kingdom in peril', 'Ancient evil awakens']
}

[14:23:45.100] 🎭 CHARACTER ℹ️ Loading party composition
[14:23:45.110] 🎭 CHARACTER ℹ️ Party ready: 4 characters

[14:23:45.120] 🔗 MACRO_CHAIN ℹ️ Loading macro chain state
[14:23:45.125] 🔗 MACRO_CHAIN ℹ️ Current beat: intro-2 (The Call to Action)

[14:23:45.135] 📝 PROMPT ℹ️ Building scene generation prompt
[14:23:45.200] 📝 PROMPT ✅ SUCCESS Prompt built: 2,847 tokens

[14:23:45.210] 🤖 AI ℹ️ Calling Claude API
[14:23:45.220] 📡 NETWORK 🔍 DEBUG POST https://api.anthropic.com/v1/messages
[14:23:47.350] 📡 NETWORK ✅ SUCCESS Response received: 200 OK
[14:23:47.360] 🤖 AI ✅ SUCCESS Scene generated: {
  inputTokens: 2847,
  outputTokens: 1523,
  duration: '2.14s',
  model: 'claude-3-5-sonnet-20241022'
}

[14:23:47.370] ✅ VALIDATION ℹ️ Validating AI response structure
[14:23:47.380] ✅ VALIDATION ✅ SUCCESS Response valid

[14:23:47.390] 💾 STORAGE ℹ️ Saving scene to storage
[14:23:47.420] 💾 STORAGE ✅ SUCCESS Scene saved: scene-new-456

[14:23:47.430] 🧠 CONTEXT ℹ️ Updating context memory
[14:23:47.445] 🧠 CONTEXT ℹ️ Appending scene context output
[14:23:47.460] 💾 STORAGE ✅ SUCCESS Session context updated: abc123
[14:23:47.465] 🧠 CONTEXT ✅ SUCCESS Context updated: { newVersion: 13 }

[14:23:47.475] 🔒 LOCK ℹ️ Releasing lock: scene-gen-abc123
[14:23:47.480] 🔒 LOCK ✅ SUCCESS Lock released

[14:23:47.490] 🌐 API ✅ SUCCESS Scene generation complete: {
  sceneId: 'scene-new-456',
  duration: '2.489s',
  tokens: { input: 2847, output: 1523 }
}

═══════════════════════════════════════════════════════════════════════════════
```

## 🎯 Key Visual Features

1. **Timestamps** - Track timing and performance
2. **Emojis** - Quick component identification
3. **Colors** - Visual organization and scanning
4. **Structured Data** - Expandable objects for details
5. **Sections** - Clear workflow boundaries
6. **Log Levels** - Appropriate detail levels
7. **Context** - Session/request tracking with child loggers

## 🚀 Try It Yourself

Run the demo to see it in action:

```bash
node test-logger-demo.js
```

You'll see all these examples live with actual colors and formatting in your terminal!

---

**Note**: Colors and formatting will appear in terminals that support ANSI escape codes (most modern terminals) and in browser developer consoles.

