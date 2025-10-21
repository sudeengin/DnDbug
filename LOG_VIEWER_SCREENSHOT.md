# Visual Log Viewer - What It Looks Like

## 📺 Screenshot Description

When you open `test-context-memory.html` (or any HTML page with `log-viewer.js`), you'll see:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                       Your Test Page Content Here                           │
│                                                                             │
│  [Buttons, forms, test controls, etc.]                                     │
│                                                                             │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── LOG VIEWER ─────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════════════════╗ │
│ ║ 📊 Terminal Logs        15 logs  [🗑️][⏸️][✓Auto][−]                  ║ │
│ ╠═══════════════════════════════════════════════════════════════════════╣ │
│ ║ 🔍Debug  ℹ️Info  ⚠️Warn  ❌Error  ✅Success         💾Export          ║ │
│ ╠═══════════════════════════════════════════════════════════════════════╣ │
│ ║                                                                         ║ │
│ ║ [14:23:45.123] 🎨 UI ℹ️ Test page loaded and ready                    ║ │
│ ║ [14:23:45.234] 📊 UI ℹ️ Visual log viewer initialized                 ║ │
│ ║ [14:23:47.456] 🧠 CONTEXT ℹ️ Loading session context                  ║ │
│ ║   ╭─────────────────────────────────────────────────────────╮          ║ │
│ ║   │ { sessionId: "test_session_123" }                       │          ║ │
│ ║   ╰─────────────────────────────────────────────────────────╯          ║ │
│ ║ [14:23:47.789] 🧠 CONTEXT ✅ SUCCESS Context loaded successfully       ║ │
│ ║   ╭─────────────────────────────────────────────────────────╮          ║ │
│ ║   │ {                                                        │          ║ │
│ ║   │   "sessionId": "test_session_123",                      │          ║ │
│ ║   │   "version": 5,                                         │          ║ │
│ ║   │   "blocks": {                                           │          ║ │
│ ║   │     "background": { ... },                             │          ║ │
│ ║   │     "characters": { ... }                              │          ║ │
│ ║   │   }                                                     │          ║ │
│ ║   │ }                                                        │          ║ │
│ ║   ╰─────────────────────────────────────────────────────────╯          ║ │
│ ║ [14:23:48.012] 🎬 SCENE ℹ️ Generating scene                           ║ │
│ ║ [14:23:49.234] 🤖 AI ℹ️ Calling Claude API                             ║ │
│ ║ [14:23:51.567] 🤖 AI ✅ SUCCESS Scene generated                        ║ │
│ ║   ╭─────────────────────────────────────────────────────────╮          ║ │
│ ║   │ { inputTokens: 2847, outputTokens: 1523 }              │          ║ │
│ ║   ╰─────────────────────────────────────────────────────────╯          ║ │
│ ║ [14:23:51.678] 💾 STORAGE ✅ SUCCESS Scene saved                       ║ │
│ ║   ╭─────────────────────────────────────────────────────────╮          ║ │
│ ║   │ { sceneId: "scene-new-123" }                            │          ║ │
│ ║   ╰─────────────────────────────────────────────────────────╯          ║ │
│ ║ [14:23:51.789] 🧠 CONTEXT ✅ SUCCESS Context updated                   ║ │
│ ║                                                                         ║ │
│ ║                                                             [Scrollbar]║ │
│ ╚═══════════════════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────────────────────┘
                      ↑
                Fixed at bottom-right corner
                Resizable and minimizable
```

## 🎨 Actual Appearance

### Dark Terminal Theme
- **Background**: Dark charcoal (#1e1e1e)
- **Text**: Light gray (#ccc)
- **Timestamps**: Dimmed gray (#666)
- **Components**: Color-coded (blue, magenta, cyan, green, yellow, etc.)
- **Data boxes**: Darker background (#2d2d2d) with colored left border

### Toolbar (Top Bar)
```
📊 Terminal Logs         15 logs  [🗑️ Clear][⏸️ Pause][✓ Auto-scroll][−]
```
- Dark gray background (#2d2d2d)
- Light gray text (#ccc)
- Interactive buttons that highlight on hover

### Filter Bar (Second Row)
```
🔍 Debug  ℹ️ Info  ⚠️ Warn  ❌ Error  ✅ Success         💾 Export
```
- Slightly lighter dark background (#252525)
- Color-coded buttons matching log levels
- Click to toggle opacity (hide/show levels)

### Log Entries
Each log entry shows:
1. **Timestamp** - `[14:23:45.123]` in gray
2. **Component** - `🧠 CONTEXT` in component color (yellow for context)
3. **Level** - `ℹ️` or `✅ SUCCESS` in level color
4. **Message** - in light gray
5. **Data** (optional) - in code box with syntax highlighting

### Data Display
```
╭──────────────────────────────────────╮
│ {                                    │
│   "key": "value",                    │
│   "nested": { ... }                  │
│ }                                     │
╰──────────────────────────────────────╯
```
- Indented under parent log
- Dark background box
- Color-coded left border matching log level
- Pretty-printed JSON

## 🎯 Component Colors

Visual appearance of each component:

- 🌄 **BACKGROUND** - Bright blue (#3B82F6)
- 🎭 **CHARACTER** - Vibrant magenta (#D946EF)
- 🔗 **MACRO_CHAIN** - Cyan (#06B6D4)
- 🎬 **SCENE** - Green (#10B981)
- 🧠 **CONTEXT** - Orange/yellow (#F59E0B)
- 💾 **STORAGE** - Gray (#6B7280)
- 🌐 **API** - Cyan (#06B6D4)
- 🤖 **AI** - Magenta (#D946EF)
- 🔒 **LOCK** - Red (#EF4444)
- ✅ **VALIDATION** - Green (#10B981)
- 🎨 **UI** - Purple (#8B5CF6)
- 📡 **NETWORK** - Cyan (#06B6D4)

## 🎬 Interactive Elements

### Buttons Change State
- **Pause** → Changes to **▶️ Resume** in yellow when paused
- **Auto-scroll** → Changes color when toggled (green ✓ / gray ✗)
- **Minimize** → Changes to **+** when collapsed
- **Filter buttons** → Fade to 30% opacity when hiding that level

### Hover Effects
- Buttons lighten on hover
- Smooth transitions
- Cursor changes to pointer

### Scrolling
- Smooth auto-scroll to latest entry
- Manual scrolling disables auto-scroll briefly
- Scrollbar appears when needed

## 📏 Dimensions

### Default Size
- **Width**: Up to 900px (responsive, full width on smaller screens)
- **Height**: 400px
- **Position**: Fixed at bottom-right corner

### Minimized
- **Height**: 30px (just the toolbar)
- **Width**: Same as default
- Click + to expand back to full size

### Responsive
- Adjusts width on smaller screens
- Always stays at bottom-right
- Scrolls internally when content overflows

## 🎨 Typography

### Font Family
```css
font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
```
Professional monospace font for terminal feel

### Font Sizes
- **Timestamps**: 11px
- **Main text**: 12px
- **Toolbar**: 11px
- **Filter buttons**: 10px
- **Data boxes**: 11px

## 🌈 Color Palette

### Background Colors
- **Main**: #1e1e1e (dark charcoal)
- **Toolbar**: #2d2d2d (slightly lighter)
- **Filter bar**: #252525 (between main and toolbar)
- **Data boxes**: #2d2d2d (same as toolbar)
- **Buttons**: #3a3a3a (light gray)

### Text Colors
- **Primary text**: #ccc (light gray)
- **Timestamps**: #666 (dimmed gray)
- **Data text**: #aaa (medium gray)
- **Info**: #60A5FA (blue)
- **Success**: #10B981 (green)
- **Warning**: #FBBF24 (yellow)
- **Error**: #EF4444 (red)
- **Debug**: #9CA3AF (gray)

## 💡 Usage Tips

### Best Viewed
1. **Full Screen** - More room for logs
2. **Dark Mode** - Matches terminal aesthetic
3. **Wide Screen** - See more of longer log lines

### Customization
Edit `log-viewer.js` to:
- Change colors
- Adjust size/position
- Modify font
- Change max entries
- Add custom features

## 🎉 The Result

A **beautiful, functional, terminal-style log viewer** that:
- ✅ Feels like a professional terminal
- ✅ Updates in real-time
- ✅ Shows structured data clearly
- ✅ Provides full interactivity
- ✅ Requires zero build tools
- ✅ Works in any HTML page

**Just add one `<script>` tag and you're done!** 🚀

---

Open `test-context-memory.html` in your browser to see it live! 🎬

