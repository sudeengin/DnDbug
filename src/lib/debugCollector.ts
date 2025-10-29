// Vite-safe frontend Debug Mode and unified log collector
// Uses typeof window check to avoid SSR errors and stores logs in window.__debugCollector

export interface DebugLog {
  id: string;
  timestamp: number;
  scope: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
  stack?: string;
}

interface DebugReport {
  id: string;
  timestamp: number;
  environment: {
    userAgent: string;
    url: string;
    debugMode: boolean;
  };
  logs: DebugLog[];
  summary: {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    scopes: string[];
    timeRange: {
      start: number;
      end: number;
    };
  };
}

class ViteSafeDebugCollector {
  private logs: DebugLog[] = [];
  private isEnabled: boolean = false;
  private maxLogs: number = 1000;
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    log: typeof console.log;
  } | null = null;

  constructor() {
    // Only initialize if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    // Check if debug mode is enabled
    this.isEnabled = this.checkDebugMode();
    
    // Store collector instance on window for global access
    (window as any).__debugCollector = this;
    
    // Set up global error handlers only if debug mode is enabled
    if (this.isEnabled) {
      this.setupGlobalErrorHandlers();
    }
  }

  private checkDebugMode(): boolean {
    try {
      // Check environment variable first (for build-time control)
      if (typeof process !== 'undefined' && (process as any).env?.VITE_DEBUG_MODE === 'true') {
        return true;
      }
      
      // Check localStorage
      return localStorage.getItem('debug_mode') === 'true';
    } catch (error) {
      // If localStorage access fails, default to false
      return false;
    }
  }

  private setupGlobalErrorHandlers() {
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('global', 'error', 'Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
      });
    });

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.log('global', 'error', 'Global Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });

    // Intercept console methods to catch React warnings and API errors
    this.setupConsoleInterceptors();
  }

  enable() {
    if (typeof window === 'undefined') return;
    
    this.isEnabled = true;
    try {
      localStorage.setItem('debug_mode', 'true');
    } catch (error) {
      // Ignore localStorage errors
    }
    
    this.setupGlobalErrorHandlers();
    this.log('debug-collector', 'info', 'Debug mode enabled');
  }

  private setupConsoleInterceptors() {
    if (typeof window === 'undefined') return;

    // Store original console methods if not already stored
    if (!this.originalConsole) {
      this.originalConsole = {
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        log: console.log.bind(console),
      };
    }

    const originalError = this.originalConsole.error;
    const originalWarn = this.originalConsole.warn;
    const self = this;

    // Override console.error to catch API 404 errors and other issues
    console.error = function(...args: any[]) {
      originalError.apply(console, args);
      
      if (!self.isEnabled) return;
      
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg?.toString) return arg.toString();
        return JSON.stringify(arg);
      }).join(' ');

      // Detect API 404 errors
      if (message.includes('404') || message.includes('Not Found')) {
        const match = message.match(/(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/);
        if (match) {
          const method = match[1];
          const endpoint = match[2];
          self.log('api:missing-endpoint', 'error', `Missing API endpoint: ${method} ${endpoint}`, {
            method,
            endpoint,
            message,
            stack: new Error().stack,
            issueType: 'missing-api-endpoint',
            severity: 'high',
            recommendation: `Add ${method} ${endpoint} route to server.js`
          });
          return;
        }
      }

      // Detect fetch errors
      if (message.includes('fetch') && (message.includes('404') || message.includes('failed'))) {
        const urlMatch = message.match(/http[s]?:\/\/[^\s]+/);
        if (urlMatch) {
          self.log('api:fetch-error', 'error', `API fetch failed: ${urlMatch[0]}`, {
            url: urlMatch[0],
            message,
            issueType: 'api-fetch-failure',
            severity: 'high'
          });
        }
      }

      // Pass through to original error logger
      self.log('console', 'error', message, { args, stack: new Error().stack });
    };

    // Override console.warn to catch React warnings
    console.warn = function(...args: any[]) {
      originalWarn.apply(console, args);
      
      if (!self.isEnabled) return;
      
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg?.toString) return arg.toString();
        return JSON.stringify(arg);
      }).join(' ');

      // Detect accessibility warnings (missing aria-label)
      if (message.includes('aria-label') || message.includes('aria-labelledby')) {
        if (message.includes('must specify') || message.includes('provide a visible label')) {
          const componentMatch = message.match(/([A-Z][a-zA-Z]*\.tsx?:\d+)/) || 
                                 message.match(/([A-Z][a-zA-Z0-9]*)/);
          const component = componentMatch ? componentMatch[1] : 'Unknown';
          
          self.log('react:accessibility', 'warn', 'Missing accessibility label', {
            message,
            component,
            issueType: 'missing-aria-label',
            severity: 'medium',
            recommendation: 'Add aria-label or aria-labelledby attribute to the element',
            stack: new Error().stack
          });
          return;
        }
      }

      // Detect nested button warnings
      if (message.includes('cannot be a descendant of') || message.includes('cannot contain a nested')) {
        if (message.includes('button') || message.includes('<button>')) {
          const componentMatch = message.match(/([A-Z][a-zA-Z]*\.tsx?:\d+)/) || 
                                 message.match(/([A-Z][a-zA-Z0-9]*)/);
          const component = componentMatch ? componentMatch[1] : 'Unknown';
          
          self.log('react:dom-nesting', 'error', 'Nested button elements detected', {
            message,
            component,
            issueType: 'nested-buttons',
            severity: 'high',
            recommendation: 'Remove isPressable from Card component or change Button to a non-button element',
            stack: new Error().stack
          });
          return;
        }
      }

      // Detect DOM nesting validation errors
      if (message.includes('validateDOMNesting') || message.includes('cannot be nested')) {
        const componentMatch = message.match(/([A-Z][a-zA-Z]*\.tsx?:\d+)/) || 
                               message.match(/([A-Z][a-zA-Z0-9]*)/);
        const component = componentMatch ? componentMatch[1] : 'Unknown';
        
        self.log('react:dom-nesting', 'error', 'Invalid DOM nesting detected', {
          message,
          component,
          issueType: 'invalid-dom-nesting',
          severity: 'high',
          stack: new Error().stack
        });
        return;
      }

      // Pass through to main log method
      self.log('console', 'warn', message, { args });
    };
  }

  disable() {
    if (typeof window === 'undefined') return;
    
    this.isEnabled = false;
    try {
      localStorage.setItem('debug_mode', 'false');
    } catch (error) {
      // Ignore localStorage errors
    }

    // Restore original console methods
    if (this.originalConsole) {
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
      console.log = this.originalConsole.log;
    }
    
    this.log('debug-collector', 'info', 'Debug mode disabled');
  }

  log(scope: string, level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any) {
    // Early return if debug mode is disabled (no performance cost)
    if (!this.isEnabled) return;

    const logEntry: DebugLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      scope,
      level,
      message,
      data: this.sanitizeData(data),
      stack: level === 'error' ? this.getStackTrace() : undefined,
    };

    this.logs.push(logEntry);

    // Keep only last maxLogs entries to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  error(scope: string, message: string, data?: any) {
    this.log(scope, 'error', message, data);
  }

  warn(scope: string, message: string, data?: any) {
    this.log(scope, 'warn', message, data);
  }

  info(scope: string, message: string, data?: any) {
    this.log(scope, 'info', message, data);
  }

  export(): DebugReport {
    const now = Date.now();
    const logs = [...this.logs]; // Create a copy
    
    const summary = {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.level === 'error').length,
      warningCount: logs.filter(log => log.level === 'warn').length,
      scopes: Array.from(new Set(logs.map(log => log.scope))),
      timeRange: {
        start: logs.length > 0 ? logs[0].timestamp : now,
        end: logs.length > 0 ? logs[logs.length - 1].timestamp : now,
      },
    };

    return {
      id: this.generateId(),
      timestamp: now,
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
        debugMode: this.isEnabled,
      },
      logs,
      summary,
    };
  }

  downloadReport(filename?: string) {
    if (typeof window === 'undefined') return;
    
    const report = this.export();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `debug-report-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.log('debug-collector', 'info', 'Debug report downloaded', { filename: link.download });
  }

  clear() {
    this.logs = [];
    this.log('debug-collector', 'info', 'Debug logs cleared');
  }

  getLogs(scope?: string, level?: string): DebugLog[] {
    let filtered = [...this.logs];
    
    if (scope) {
      filtered = filtered.filter(log => log.scope === scope);
    }
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    return filtered;
  }

  getStats() {
    const logs = this.logs;
    return {
      total: logs.length,
      byLevel: {
        log: logs.filter(log => log.level === 'log').length,
        info: logs.filter(log => log.level === 'info').length,
        warn: logs.filter(log => log.level === 'warn').length,
        error: logs.filter(log => log.level === 'error').length,
      },
      byScope: logs.reduce((acc, log) => {
        acc[log.scope] = (acc[log.scope] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timeRange: logs.length > 0 ? {
        start: logs[0].timestamp,
        end: logs[logs.length - 1].timestamp,
        duration: logs[logs.length - 1].timestamp - logs[0].timestamp,
      } : null,
    };
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) return data;
    
    try {
      // Handle circular references and large objects
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        
        // Limit string length
        if (typeof value === 'string' && value.length > 10000) {
          return value.substring(0, 10000) + '...[truncated]';
        }
        
        return value;
      }));
    } catch (error) {
      return `[Error serializing data: ${error}]`;
    }
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2).join('\n') : '';
  }
}

// Create singleton instance
const debugCollector = new ViteSafeDebugCollector();

  // Export convenience functions that check debug mode before executing
export const debug = {
  // Mode control
  enable: () => debugCollector.enable(),
  disable: () => debugCollector.disable(),
  isEnabled: () => debugCollector['isEnabled'],
  
  // Logging functions (only execute if debug mode is enabled)
  log: (scope: string, message: string, data?: any) => 
    debugCollector.log(scope, 'log', message, data),
  error: (scope: string, message: string, data?: any) => 
    debugCollector.error(scope, message, data),
  warn: (scope: string, message: string, data?: any) => 
    debugCollector.warn(scope, message, data),
  info: (scope: string, message: string, data?: any) => 
    debugCollector.info(scope, message, data),
  
  // Export functionality
  export: () => debugCollector.export(),
  download: (filename?: string) => debugCollector.downloadReport(filename),
  upload: async (endpoint?: string) => {
    // Simple upload implementation for Vite-safe version
    const report = debugCollector.export();
    try {
      const response = await fetch(endpoint || '/api/debug/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      return response.json();
    } catch (error) {
      console.error('Failed to upload debug report:', error);
      throw error;
    }
  },
  clear: () => debugCollector.clear(),
  
  // Query functions
  getLogs: (scope?: string, level?: string) => debugCollector.getLogs(scope, level),
  getStats: () => debugCollector.getStats(),
};

// Export the collector instance for advanced usage
export { debugCollector };

export default debug;
