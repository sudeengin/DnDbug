/**
 * Visual Log Viewer for HTML Test Pages (Standalone)
 * Include this script in your HTML test pages to get a visual terminal-like log viewer
 * 
 * Usage:
 *   <script src="log-viewer.js"></script>
 *   <div id="log-viewer"></div>
 *   
 *   // Logs will automatically appear in the viewer
 *   console.log('Hello world');
 */

(function() {
  'use strict';

  class LogViewer {
    constructor() {
      this.entries = [];
      this.maxEntries = 500;
      this.autoScroll = true;
      this.isPaused = false;
      this.filters = new Set();
      this.container = null;
      this.logContainer = null;
    }

    /**
     * Initialize the log viewer
     */
    init(containerId = 'log-viewer') {
      // Create container if it doesn't exist
      this.container = document.getElementById(containerId);
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = containerId;
        document.body.appendChild(this.container);
      }

      // Build the UI
      this.buildUI();

      // Intercept console methods
      this.interceptConsoleLogs();

      return this;
    }

    /**
     * Build the log viewer UI
     */
    buildUI() {
      if (!this.container) return;

      this.container.innerHTML = `
        <div class="log-viewer-wrapper" style="
          position: fixed;
          bottom: 0;
          right: 0;
          width: 100%;
          max-width: 900px;
          height: 400px;
          background: #1e1e1e;
          border-top: 2px solid #333;
          border-left: 2px solid #333;
          display: flex;
          flex-direction: column;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-size: 12px;
          z-index: 10000;
          box-shadow: -2px -2px 10px rgba(0,0,0,0.3);
        ">
          <!-- Toolbar -->
          <div class="log-viewer-toolbar" style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: #2d2d2d;
            border-bottom: 1px solid #444;
            color: #ccc;
            font-size: 11px;
          ">
            <span style="font-weight: bold; margin-right: auto;">📊 Terminal Logs</span>
            <span id="log-viewer-count" style="color: #888; font-size: 10px;">0 logs</span>
            <button id="log-viewer-clear" style="
              padding: 4px 8px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #ccc;
              cursor: pointer;
              border-radius: 3px;
              font-size: 11px;
            ">🗑️ Clear</button>
            <button id="log-viewer-pause" style="
              padding: 4px 8px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #ccc;
              cursor: pointer;
              border-radius: 3px;
              font-size: 11px;
            ">⏸️ Pause</button>
            <button id="log-viewer-autoscroll" style="
              padding: 4px 8px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #4ade80;
              cursor: pointer;
              border-radius: 3px;
              font-size: 11px;
            ">✓ Auto-scroll</button>
            <button id="log-viewer-minimize" style="
              padding: 4px 8px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #ccc;
              cursor: pointer;
              border-radius: 3px;
              font-size: 11px;
            ">−</button>
          </div>

          <!-- Filter Bar -->
          <div class="log-viewer-filters" style="
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 6px 8px;
            background: #252525;
            border-bottom: 1px solid #333;
          ">
            <button class="filter-btn" data-level="debug" style="
              padding: 2px 6px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #9CA3AF;
              cursor: pointer;
              border-radius: 3px;
              font-size: 10px;
            ">🔍 Debug</button>
            <button class="filter-btn" data-level="info" style="
              padding: 2px 6px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #60A5FA;
              cursor: pointer;
              border-radius: 3px;
              font-size: 10px;
            ">ℹ️ Info</button>
            <button class="filter-btn" data-level="warn" style="
              padding: 2px 6px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #FBBF24;
              cursor: pointer;
              border-radius: 3px;
              font-size: 10px;
            ">⚠️ Warn</button>
            <button class="filter-btn" data-level="error" style="
              padding: 2px 6px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #EF4444;
              cursor: pointer;
              border-radius: 3px;
              font-size: 10px;
            ">❌ Error</button>
            <button class="filter-btn" data-level="success" style="
              padding: 2px 6px;
              background: #3a3a3a;
              border: 1px solid #555;
              color: #10B981;
              cursor: pointer;
              border-radius: 3px;
              font-size: 10px;
            ">✅ Success</button>
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button id="log-viewer-export" style="
                padding: 2px 6px;
                background: #3a3a3a;
                border: 1px solid #555;
                color: #60A5FA;
                cursor: pointer;
                border-radius: 3px;
                font-size: 10px;
              ">💾 Export</button>
            </div>
          </div>

          <!-- Log Container -->
          <div id="log-viewer-logs" style="
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 8px;
            background: #1e1e1e;
            color: #ccc;
            line-height: 1.5;
          "></div>
        </div>
      `;

      this.logContainer = document.getElementById('log-viewer-logs');
      this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
      const clearBtn = document.getElementById('log-viewer-clear');
      const pauseBtn = document.getElementById('log-viewer-pause');
      const autoScrollBtn = document.getElementById('log-viewer-autoscroll');
      const minimizeBtn = document.getElementById('log-viewer-minimize');
      const exportBtn = document.getElementById('log-viewer-export');

      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clear());
      }

      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          this.isPaused = !this.isPaused;
          pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
          pauseBtn.style.color = this.isPaused ? '#FBBF24' : '#ccc';
        });
      }

      if (autoScrollBtn) {
        autoScrollBtn.addEventListener('click', () => {
          this.autoScroll = !this.autoScroll;
          autoScrollBtn.textContent = this.autoScroll ? '✓ Auto-scroll' : '✗ Auto-scroll';
          autoScrollBtn.style.color = this.autoScroll ? '#4ade80' : '#666';
        });
      }

      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
          const wrapper = this.container.querySelector('.log-viewer-wrapper');
          if (wrapper) {
            if (wrapper.style.height === '30px') {
              wrapper.style.height = '400px';
              minimizeBtn.textContent = '−';
            } else {
              wrapper.style.height = '30px';
              minimizeBtn.textContent = '+';
            }
          }
        });
      }

      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportLogs());
      }

      // Filter buttons
      const filterBtns = document.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const level = btn.getAttribute('data-level');
          if (!level) return;

          if (this.filters.has(level)) {
            this.filters.delete(level);
            btn.style.opacity = '1';
          } else {
            this.filters.add(level);
            btn.style.opacity = '0.3';
          }

          this.render();
        });
      });
    }

    /**
     * Intercept console logs
     */
    interceptConsoleLogs() {
      const self = this;
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;

      console.log = function(...args) {
        originalLog.apply(console, args);
        self.captureLog('info', args);
      };

      console.warn = function(...args) {
        originalWarn.apply(console, args);
        self.captureLog('warn', args);
      };

      console.error = function(...args) {
        originalError.apply(console, args);
        self.captureLog('error', args);
      };
    }

    /**
     * Capture a log entry
     */
    captureLog(level, args) {
      if (this.isPaused) return;

      const entry = this.parseLogArgs(level, args);
      
      this.entries.push(entry);
      
      if (this.entries.length > this.maxEntries) {
        this.entries.shift();
      }

      this.render();
      this.updateCount();
    }

    /**
     * Parse log arguments
     */
    parseLogArgs(level, args) {
      const timestamp = new Date().toISOString().substring(11, 23);
      
      // Check for our custom logger format
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes('%c')) {
        // Extract component info
        const emojiMatch = firstArg.match(/([🌄🎭🔗🎬🧠💾🌐🤖🔒✅📝⚙️🎨📡❌])\s+(\w+)/);
        const timeMatch = firstArg.match(/\[(.+?)\]/);
        const levelMatch = firstArg.match(/(🔍|ℹ️|⚠️|❌|✅)/g);
        
        if (emojiMatch) {
          const [, emoji, component] = emojiMatch;
          const time = timeMatch ? timeMatch[1] : timestamp;
          
          // Get color from args (second arg usually contains color style)
          const colorMatch = args.length > 1 && typeof args[1] === 'string' ? 
            args[1].match(/color:\s*([^;]+)/) : null;
          const color = colorMatch ? colorMatch[1] : '#ccc';
          
          // Detect level from emoji or message
          let detectedLevel = level;
          if (firstArg.includes('DEBUG')) detectedLevel = 'debug';
          else if (firstArg.includes('WARN')) detectedLevel = 'warn';
          else if (firstArg.includes('ERROR')) detectedLevel = 'error';
          else if (firstArg.includes('SUCCESS')) detectedLevel = 'success';
          else if (levelMatch) {
            const levelEmoji = levelMatch[levelMatch.length - 1];
            if (levelEmoji === '🔍') detectedLevel = 'debug';
            else if (levelEmoji === '⚠️') detectedLevel = 'warn';
            else if (levelEmoji === '❌') detectedLevel = 'error';
            else if (levelEmoji === '✅') detectedLevel = 'success';
          }
          
          // Get message (skip format strings and styles)
          const messageArgs = args.slice(3).filter(arg => 
            typeof arg !== 'string' || !arg.startsWith('color:')
          );
          
          const message = messageArgs.map(arg => 
            typeof arg === 'object' ? '' : String(arg)
          ).join(' ');
          
          const dataObjects = messageArgs.filter(arg => 
            typeof arg === 'object' && arg !== null
          );
          
          return {
            timestamp: time,
            component,
            level: detectedLevel,
            emoji,
            color,
            message: message.trim(),
            data: dataObjects.length > 0 ? dataObjects : undefined
          };
        }
      }

      // Fallback for plain console logs
      const message = args.map(arg => 
        typeof arg === 'object' ? '' : String(arg)
      ).join(' ');
      
      const dataObjects = args.filter(arg => 
        typeof arg === 'object' && arg !== null
      );

      return {
        timestamp,
        component: 'CONSOLE',
        level,
        emoji: this.getLevelEmoji(level),
        color: '#888',
        message: message.trim(),
        data: dataObjects.length > 0 ? dataObjects : undefined
      };
    }

    /**
     * Get emoji for log level
     */
    getLevelEmoji(level) {
      const emojis = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        success: '✅'
      };
      return emojis[level] || 'ℹ️';
    }

    /**
     * Render all entries
     */
    render() {
      if (!this.logContainer) return;

      const filteredEntries = this.entries.filter(entry => 
        !this.filters.has(entry.level)
      );

      this.logContainer.innerHTML = filteredEntries.map(entry => 
        this.renderEntry(entry)
      ).join('');

      if (this.autoScroll) {
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
      }
    }

    /**
     * Render a single entry
     */
    renderEntry(entry) {
      const levelColors = {
        debug: '#9CA3AF',
        info: '#60A5FA',
        warn: '#FBBF24',
        error: '#EF4444',
        success: '#10B981'
      };

      const levelColor = levelColors[entry.level] || '#ccc';
      const dataHtml = entry.data && entry.data.length > 0 ? 
        entry.data.map(obj => `
          <pre style="
            margin: 4px 0 4px 20px;
            padding: 6px 8px;
            background: #2d2d2d;
            border-left: 3px solid ${levelColor};
            color: #aaa;
            font-size: 11px;
            overflow-x: auto;
            border-radius: 2px;
          ">${this.escapeHtml(JSON.stringify(obj, null, 2))}</pre>
        `).join('') : '';

      return `
        <div style="
          padding: 3px 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.5;
          border-bottom: 1px solid #2a2a2a;
        ">
          <span style="color: #666; font-size: 11px;">[${entry.timestamp}]</span>
          <span style="color: ${entry.color}; font-weight: 500;">${entry.emoji} ${entry.component}</span>
          <span style="color: ${levelColor};">${this.getLevelEmoji(entry.level)}</span>
          <span style="color: #ddd;">${this.escapeHtml(entry.message)}</span>
          ${dataHtml}
        </div>
      `;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    }

    /**
     * Update log count display
     */
    updateCount() {
      const countEl = document.getElementById('log-viewer-count');
      if (countEl) {
        countEl.textContent = `${this.entries.length} logs`;
      }
    }

    /**
     * Clear all logs
     */
    clear() {
      this.entries = [];
      this.render();
      this.updateCount();
    }

    /**
     * Export logs to file
     */
    exportLogs() {
      const text = this.entries.map(entry => {
        let line = `[${entry.timestamp}] ${entry.emoji} ${entry.component} ${this.getLevelEmoji(entry.level)} ${entry.message}`;
        if (entry.data && entry.data.length > 0) {
          line += '\n' + entry.data.map(obj => JSON.stringify(obj, null, 2)).join('\n');
        }
        return line;
      }).join('\n');

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    /**
     * Manual log method
     */
    log(component, level, message, data) {
      if (this.isPaused) return;

      this.entries.push({
        timestamp: new Date().toISOString().substring(11, 23),
        component: component.toUpperCase(),
        level,
        emoji: this.getLevelEmoji(level),
        color: this.getComponentColor(component),
        message,
        data: data ? [data] : undefined
      });

      if (this.entries.length > this.maxEntries) {
        this.entries.shift();
      }

      this.render();
      this.updateCount();
    }

    /**
     * Get component color
     */
    getComponentColor(component) {
      const colors = {
        BACKGROUND: '#3B82F6',
        CHARACTER: '#D946EF',
        MACRO_CHAIN: '#06B6D4',
        SCENE: '#10B981',
        CONTEXT: '#F59E0B',
        STORAGE: '#6B7280',
        API: '#06B6D4',
        AI: '#D946EF',
        LOCK: '#EF4444',
        VALIDATION: '#10B981',
        UI: '#8B5CF6',
        NETWORK: '#06B6D4',
        ERROR: '#EF4444',
        CONSOLE: '#888'
      };
      return colors[component.toUpperCase()] || '#ccc';
    }
  }

  // Create global instance
  window.logViewer = new LogViewer();

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.logViewer.init();
    });
  } else {
    window.logViewer.init();
  }

})();

