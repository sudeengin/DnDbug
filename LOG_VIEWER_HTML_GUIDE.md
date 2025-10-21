# Visual Log Viewer for HTML Test Pages

A terminal-style log viewer that displays color-coded, emoji-labeled logs directly in your HTML test pages!

## 🚀 Quick Start

### 1. Add to Your HTML Page

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Test Page</title>
    
    <!-- Add the log viewer script -->
    <script src="log-viewer.js"></script>
    
    <style>
        body {
            padding-bottom: 420px; /* Make room for log viewer */
        }
    </style>
</head>
<body>
    <!-- Your page content here -->
    
    <!-- Log viewer will automatically appear at bottom-right -->
</body>
</html>
```

### 2. That's It!

The log viewer will automatically:
- Capture all `console.log()`, `console.warn()`, and `console.error()` calls
- Display them in a beautiful terminal-style UI at the bottom-right
- Show timestamps, emojis, colors, and structured data

## 📊 Features

### Visual Terminal Display
- **Fixed position** at bottom-right of page
- **Terminal-style** black background with color-coded text
- **Emoji labels** for component identification
- **Timestamps** on every log entry
- **Structured data** display with syntax highlighting

### Controls
- **Clear** (🗑️) - Clear all logs
- **Pause/Resume** (⏸️/▶️) - Pause log capture
- **Auto-scroll** (✓/✗) - Toggle auto-scrolling to latest log
- **Minimize** (−/+) - Collapse/expand the viewer
- **Export** (💾) - Download logs as text file

### Filters
Filter logs by level:
- 🔍 **Debug** - Detailed debugging information
- ℹ️ **Info** - General information
- ⚠️ **Warn** - Warnings
- ❌ **Error** - Errors
- ✅ **Success** - Success messages

Click a filter button to hide/show that log level.

## 💻 Usage Examples

### Basic Logging

```javascript
// Standard console logs work automatically
console.log('This is an info message');
console.warn('This is a warning');
console.error('This is an error');

// They'll appear in the log viewer with timestamps and colors!
```

### Using Custom Logger Format

To get component-specific colors and emojis, use the styled format:

```javascript
// Context component log
console.log(
    '%c[' + new Date().toISOString().substring(11, 23) + '] %c🧠 CONTEXT %cℹ️',
    'color: #9CA3AF;',           // Timestamp color (gray)
    'color: #F59E0B; font-weight: bold;',  // Component color (yellow for CONTEXT)
    'color: #60A5FA;',           // Level color (blue for info)
    'Loading session context',   // Your message
    { sessionId: 'abc123' }     // Optional data object
);

// Scene component log
console.log(
    '%c[' + new Date().toISOString().substring(11, 23) + '] %c🎬 SCENE %c✅ SUCCESS',
    'color: #9CA3AF;',
    'color: #10B981; font-weight: bold;',
    'color: #10B981;',
    'Scene generated successfully',
    { sceneId: 'scene-456', tokens: 1250 }
);
```

### Manual Logging (Without Console)

You can also log directly to the viewer:

```javascript
// Manual log entry
window.logViewer.log('CONTEXT', 'info', 'Manual log entry', { 
    data: 'some data' 
});
```

## 🎨 Component Colors & Emojis

| Component | Emoji | Color | Usage |
|-----------|-------|-------|-------|
| BACKGROUND | 🌄 | Blue | Story background |
| CHARACTER | 🎭 | Magenta | Character ops |
| MACRO_CHAIN | 🔗 | Cyan | Macro chain |
| SCENE | 🎬 | Green | Scene generation |
| CONTEXT | 🧠 | Yellow | Context memory |
| STORAGE | 💾 | Gray | Storage ops |
| API | 🌐 | Cyan | API calls |
| AI | 🤖 | Magenta | AI interactions |
| LOCK | 🔒 | Red | Lock management |
| UI | 🎨 | Purple | UI events |
| NETWORK | 📡 | Cyan | Network requests |

## 📝 Real-World Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Context Memory Test</title>
    <script src="log-viewer.js"></script>
    <style>
        body { padding-bottom: 420px; }
    </style>
</head>
<body>
    <h1>Context Memory Test</h1>
    <button onclick="testContext()">Test Context Load</button>
    
    <script>
        async function testContext() {
            const sessionId = 'test-123';
            
            // Log the start
            console.log(
                '%c[' + new Date().toISOString().substring(11, 23) + '] %c🧠 CONTEXT %cℹ️',
                'color: #9CA3AF;',
                'color: #F59E0B; font-weight: bold;',
                'color: #60A5FA;',
                'Loading session context',
                { sessionId }
            );
            
            try {
                const response = await fetch(`/api/context/get?sessionId=${sessionId}`);
                const data = await response.json();
                
                if (data.ok) {
                    // Success log
                    console.log(
                        '%c[' + new Date().toISOString().substring(11, 23) + '] %c🧠 CONTEXT %c✅ SUCCESS',
                        'color: #9CA3AF;',
                        'color: #F59E0B; font-weight: bold;',
                        'color: #10B981;',
                        'Context loaded successfully',
                        data.data
                    );
                } else {
                    // Warning
                    console.warn(
                        '%c[' + new Date().toISOString().substring(11, 23) + '] %c🧠 CONTEXT %c⚠️ WARN',
                        'color: #9CA3AF;',
                        'color: #F59E0B; font-weight: bold;',
                        'color: #FBBF24;',
                        'Context not found'
                    );
                }
            } catch (error) {
                // Error log
                console.error(
                    '%c[' + new Date().toISOString().substring(11, 23) + '] %c🧠 CONTEXT %c❌ ERROR',
                    'color: #9CA3AF;',
                    'color: #F59E0B; font-weight: bold;',
                    'color: #EF4444;',
                    'Failed to load context',
                    { error: error.message }
                );
            }
        }
        
        // Welcome message on page load
        console.log(
            '%c[' + new Date().toISOString().substring(11, 23) + '] %c🎨 UI %cℹ️',
            'color: #9CA3AF;',
            'color: #8B5CF6; font-weight: bold;',
            'color: #60A5FA;',
            'Test page loaded and ready'
        );
    </script>
</body>
</html>
```

## 🎯 What You'll See

When the page loads, you'll see a terminal-style log viewer at the bottom-right showing:

```
[14:23:45.123] 🎨 UI ℹ️ Test page loaded and ready
```

When you click the test button:

```
[14:23:47.456] 🧠 CONTEXT ℹ️ Loading session context
  { sessionId: "test-123" }
[14:23:47.789] 🧠 CONTEXT ✅ SUCCESS Context loaded successfully
  {
    "sessionId": "test-123",
    "version": 5,
    "blocks": { ... }
  }
```

## 💡 Tips

### 1. **Adjust Layout**
Add padding to your page content to prevent overlap:
```css
body {
    padding-bottom: 420px; /* Height of log viewer */
}
```

### 2. **Minimize When Not Needed**
Click the **−** button to collapse the viewer to just the toolbar.

### 3. **Pause During Heavy Operations**
Click **⏸️ Pause** to stop capturing logs temporarily.

### 4. **Export for Analysis**
Click **💾 Export** to download logs as a text file.

### 5. **Filter Noise**
Click on log level buttons (Debug, Info, etc.) to hide less important logs.

### 6. **Scroll Through History**
The viewer keeps the last 500 log entries. Turn off auto-scroll to review older logs.

## 🔧 Customization

### Change Position
Edit `log-viewer.js` to change the viewer position:

```javascript
// In the buildUI() method, find:
position: fixed;
bottom: 0;      // Change to top: 0 for top-right
right: 0;       // Change to left: 0 for left side
```

### Change Size
```javascript
width: 100%;
max-width: 900px;  // Make wider/narrower
height: 400px;     // Make taller/shorter
```

### Change Max Entries
```javascript
this.maxEntries = 500;  // Increase for more history
```

## 📦 Files

- `log-viewer.js` - Standalone viewer (for HTML pages)
- `src/utils/log-viewer.ts` - TypeScript version (for React/build systems)

## 🎬 Demo

See `test-context-memory.html` for a complete working example!

## ❓ Troubleshooting

### Viewer Not Appearing
- Make sure `log-viewer.js` path is correct
- Check browser console for errors
- Ensure script loads before any console calls

### Logs Not Captured
- The viewer intercepts console methods on load
- Any logs before the script loads won't be captured
- Put the script in `<head>` to capture early logs

### Styled Logs Not Working
- Check format string includes `%c` markers
- Ensure color strings come before message
- Follow the exact format shown in examples

---

**Enjoy your beautiful terminal-style logs!** 🎉

