/**
 * Visual Log Viewer for HTML Test Pages
 * Displays formatted logs in a terminal-like UI within the page
 */

import logger from './logger';

interface LogEntry {
  timestamp: string;
  component: string;
  level: string;
  emoji: string;
  color: string;
  message: string;
  data?: any;
}

class LogViewer {
  private container: HTMLElement | null = null;
  private logContainer: HTMLElement | null = null;
  private entries: LogEntry[] = [];
  private maxEntries = 500;
  private autoScroll = true;
  private isPaused = false;
  private filters: Set<string> = new Set();

  /**
   * Initialize the log viewer and attach it to the page
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

    // Intercept console methods to capture logs
    this.interceptConsoleLogs();

    return this;
  }

  /**
   * Build the log viewer UI
   */
  private buildUI() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="log-viewer-wrapper" style="
        position: fixed;
        bottom: 0;
        right: 0;
        width: 100%;
        max-width: 800px;
        height: 400px;
        background: #1e1e1e;
        border-top: 2px solid #333;
        border-left: 2px solid #333;
        display: flex;
        flex-direction: column;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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
          <span style="font-weight: bold; margin-right: auto;">📊 Logs</span>
          <button id="log-viewer-clear" style="
            padding: 4px 8px;
            background: #3a3a3a;
            border: 1px solid #555;
            color: #ccc;
            cursor: pointer;
            border-radius: 3px;
          ">Clear</button>
          <button id="log-viewer-pause" style="
            padding: 4px 8px;
            background: #3a3a3a;
            border: 1px solid #555;
            color: #ccc;
            cursor: pointer;
            border-radius: 3px;
          ">⏸️ Pause</button>
          <button id="log-viewer-autoscroll" style="
            padding: 4px 8px;
            background: #3a3a3a;
            border: 1px solid #555;
            color: #4ade80;
            cursor: pointer;
            border-radius: 3px;
          ">✓ Auto-scroll</button>
          <button id="log-viewer-minimize" style="
            padding: 4px 8px;
            background: #3a3a3a;
            border: 1px solid #555;
            color: #ccc;
            cursor: pointer;
            border-radius: 3px;
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
        </div>

        <!-- Log Container -->
        <div id="log-viewer-logs" style="
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          background: #1e1e1e;
          color: #ccc;
          line-height: 1.4;
        "></div>
      </div>
    `;

    this.logContainer = document.getElementById('log-viewer-logs');

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up UI event listeners
   */
  private setupEventListeners() {
    const clearBtn = document.getElementById('log-viewer-clear');
    const pauseBtn = document.getElementById('log-viewer-pause');
    const autoScrollBtn = document.getElementById('log-viewer-autoscroll');
    const minimizeBtn = document.getElementById('log-viewer-minimize');

    clearBtn?.addEventListener('click', () => this.clear());
    
    pauseBtn?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      if (pauseBtn) {
        pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
        pauseBtn.style.color = this.isPaused ? '#FBBF24' : '#ccc';
      }
    });

    autoScrollBtn?.addEventListener('click', () => {
      this.autoScroll = !this.autoScroll;
      if (autoScrollBtn) {
        autoScrollBtn.textContent = this.autoScroll ? '✓ Auto-scroll' : '✗ Auto-scroll';
        autoScrollBtn.style.color = this.autoScroll ? '#4ade80' : '#666';
      }
    });

    minimizeBtn?.addEventListener('click', () => {
      const wrapper = this.container?.querySelector('.log-viewer-wrapper') as HTMLElement;
      if (wrapper) {
        if (wrapper.style.height === '30px') {
          wrapper.style.height = '400px';
          if (minimizeBtn) minimizeBtn.textContent = '−';
        } else {
          wrapper.style.height = '30px';
          if (minimizeBtn) minimizeBtn.textContent = '+';
        }
      }
    });

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const level = btn.getAttribute('data-level');
        if (!level) return;

        if (this.filters.has(level)) {
          this.filters.delete(level);
          (btn as HTMLElement).style.opacity = '1';
        } else {
          this.filters.add(level);
          (btn as HTMLElement).style.opacity = '0.3';
        }

        this.render();
      });
    });
  }

  /**
   * Intercept console logs to capture them
   */
  private interceptConsoleLogs() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      this.captureLog('info', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      this.captureLog('warn', args);
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      this.captureLog('error', args);
    };
  }

  /**
   * Capture a log entry
   */
  private captureLog(level: string, args: any[]) {
    if (this.isPaused) return;

    // Try to parse our custom log format
    const entry = this.parseLogArgs(level, args);
    
    this.entries.push(entry);
    
    // Limit entries
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.render();
  }

  /**
   * Parse log arguments to extract component, emoji, etc.
   */
  private parseLogArgs(level: string, args: any[]): LogEntry {
    const timestamp = new Date().toISOString().substring(11, 23);
    
    // Check if this is our custom logger format (styled with %)
    const firstArg = args[0];
    if (typeof firstArg === 'string' && firstArg.includes('%c')) {
      // Extract timestamp, emoji, component name from the format string
      const matches = firstArg.match(/\[(.+?)\].*?([🌄🎭🔗🎬🧠💾🌐🤖🔒✅📝⚙️🎨📡❌])\s+(\w+)/);
      
      if (matches) {
        const [, time, emoji, component] = matches;
        
        // Get the color from args[2] (component color)
        const color = args[1]?.match(/color:\s*([^;]+)/)?.[1] || '#ccc';
        
        // Get the actual message (after the format strings and style args)
        const messageStart = args.findIndex((arg, idx) => idx > 2 && typeof arg === 'string');
        const message = args.slice(messageStart).map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        return {
          timestamp: time,
          component,
          level: this.detectLevel(firstArg, message),
          emoji,
          color,
          message,
          data: args.slice(messageStart + 1).filter(arg => typeof arg === 'object')
        };
      }
    }

    // Fallback for non-custom logs
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    return {
      timestamp,
      component: 'CONSOLE',
      level,
      emoji: this.getLevelEmoji(level),
      color: '#ccc',
      message,
      data: args.filter(arg => typeof arg === 'object')
    };
  }

  /**
   * Detect log level from message
   */
  private detectLevel(formatStr: string, message: string): string {
    if (formatStr.includes('DEBUG') || message.includes('DEBUG')) return 'debug';
    if (formatStr.includes('WARN') || message.includes('WARN')) return 'warn';
    if (formatStr.includes('ERROR') || message.includes('ERROR')) return 'error';
    if (formatStr.includes('SUCCESS') || message.includes('SUCCESS')) return 'success';
    return 'info';
  }

  /**
   * Get emoji for log level
   */
  private getLevelEmoji(level: string): string {
    const emojis: Record<string, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    return emojis[level] || 'ℹ️';
  }

  /**
   * Render all log entries
   */
  private render() {
    if (!this.logContainer) return;

    const filteredEntries = this.entries.filter(entry => 
      !this.filters.has(entry.level)
    );

    this.logContainer.innerHTML = filteredEntries.map(entry => 
      this.renderEntry(entry)
    ).join('');

    // Auto-scroll to bottom
    if (this.autoScroll) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  /**
   * Render a single log entry
   */
  private renderEntry(entry: LogEntry): string {
    const levelColors: Record<string, string> = {
      debug: '#9CA3AF',
      info: '#60A5FA',
      warn: '#FBBF24',
      error: '#EF4444',
      success: '#10B981'
    };

    const levelColor = levelColors[entry.level] || '#ccc';

    return `
      <div style="
        padding: 2px 0;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
      ">
        <span style="color: #666;">[${entry.timestamp}]</span>
        <span style="color: ${entry.color};">${entry.emoji} ${entry.component}</span>
        <span style="color: ${levelColor};">${this.getLevelEmoji(entry.level)}</span>
        <span style="color: #ddd;">${this.escapeHtml(entry.message)}</span>
        ${entry.data && entry.data.length > 0 ? `
          <pre style="
            margin: 4px 0 4px 20px;
            padding: 4px 8px;
            background: #2d2d2d;
            border-left: 2px solid ${levelColor};
            color: #aaa;
            font-size: 11px;
            overflow-x: auto;
          ">${this.escapeHtml(JSON.stringify(entry.data[0], null, 2))}</pre>
        ` : ''}
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all log entries
   */
  clear() {
    this.entries = [];
    this.render();
  }

  /**
   * Add a manual log entry
   */
  log(component: string, level: string, message: string, data?: any) {
    if (this.isPaused) return;

    this.entries.push({
      timestamp: new Date().toISOString().substring(11, 23),
      component,
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
  }

  /**
   * Get color for component
   */
  private getComponentColor(component: string): string {
    const colors: Record<string, string> = {
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
      ERROR: '#EF4444'
    };
    return colors[component.toUpperCase()] || '#ccc';
  }
}

// Create and export singleton instance
export const logViewer = new LogViewer();

// Auto-initialize if in browser and DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => logViewer.init());
  } else {
    logViewer.init();
  }
}

export default logViewer;

