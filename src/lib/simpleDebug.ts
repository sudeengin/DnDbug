// Simple debug integration for components
// This provides basic debug logging without complex imports

interface SimpleDebugLog {
  timestamp: number;
  scope: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
}

class SimpleDebugCollector {
  private logs: SimpleDebugLog[] = [];
  private isEnabled: boolean = false;
  private maxLogs: number = 500;

  constructor() {
    // Check if debug mode is enabled
    this.isEnabled = this.checkDebugMode();
    
    // Store on window for global access
    if (typeof window !== 'undefined') {
      (window as any).__simpleDebug = this;
    }
  }

  private checkDebugMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      return localStorage.getItem('debug_mode') === 'true';
    } catch {
      return false;
    }
  }

  log(scope: string, level: 'info' | 'error' | 'warn', message: string, data?: any) {
    if (!this.isEnabled) return;

    this.logs.push({
      timestamp: Date.now(),
      scope,
      level,
      message,
      data: this.sanitizeData(data),
    });

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console for immediate feedback
    const logMessage = `[${scope}] ${message}`;
    if (level === 'error') {
      console.error(logMessage, data);
    } else if (level === 'warn') {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }
  }

  info(scope: string, message: string, data?: any) {
    this.log(scope, 'info', message, data);
  }

  error(scope: string, message: string, data?: any) {
    this.log(scope, 'error', message, data);
  }

  warn(scope: string, message: string, data?: any) {
    this.log(scope, 'warn', message, data);
  }

  enable() {
    this.isEnabled = true;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('debug_mode', 'true');
      } catch {
        // Ignore localStorage errors
      }
    }
    this.info('debug', 'Debug mode enabled');
  }

  disable() {
    this.isEnabled = false;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('debug_mode', 'false');
      } catch {
        // Ignore localStorage errors
      }
    }
    // Don't log this message since we're disabling debug mode
    // this.info('debug', 'Debug mode disabled');
  }

  export() {
    return {
      timestamp: Date.now(),
      logs: [...this.logs],
      summary: {
        totalLogs: this.logs.length,
        errorCount: this.logs.filter(log => log.level === 'error').length,
        warningCount: this.logs.filter(log => log.level === 'warn').length,
        scopes: Array.from(new Set(this.logs.map(log => log.scope))),
      },
    };
  }

  download(filename?: string) {
    if (typeof window === 'undefined') return;
    
    const report = this.export();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  clear() {
    this.logs = [];
    this.info('debug', 'Debug logs cleared');
  }

  getStats() {
    return {
      total: this.logs.length,
      enabled: this.isEnabled,
      hasLogs: this.logs.length > 0,
      byLevel: {
        info: this.logs.filter(log => log.level === 'info').length,
        warn: this.logs.filter(log => log.level === 'warn').length,
        error: this.logs.filter(log => log.level === 'error').length,
      },
    };
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) return data;
    
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return '[Circular Reference]';
    }
  }
}

// Create singleton instance
const simpleDebug = new SimpleDebugCollector();

// Export for use in components
export default simpleDebug;

// Convenience functions
export const debug = {
  info: (scope: string, message: string, data?: any) => simpleDebug.info(scope, message, data),
  error: (scope: string, message: string, data?: any) => simpleDebug.error(scope, message, data),
  warn: (scope: string, message: string, data?: any) => simpleDebug.warn(scope, message, data),
  enable: () => simpleDebug.enable(),
  disable: () => simpleDebug.disable(),
  export: () => simpleDebug.export(),
  download: (filename?: string) => simpleDebug.download(filename),
  clear: () => simpleDebug.clear(),
  getStats: () => simpleDebug.getStats(),
  isEnabled: () => simpleDebug.getStats().enabled,
};
