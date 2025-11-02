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

  async export() {
    // Run health check before exporting
    const healthCheck = await this.runHealthCheck();
    
    return {
      timestamp: Date.now(),
      logs: [...this.logs],
      summary: {
        totalLogs: this.logs.length,
        errorCount: this.logs.filter(log => log.level === 'error').length,
        warningCount: this.logs.filter(log => log.level === 'warn').length,
        scopes: Array.from(new Set(this.logs.map(log => log.scope))),
      },
      healthCheck: healthCheck,
      anomalies: this.detectAnomalies(),
    };
  }

  private async runHealthCheck() {
    try {
      // Extract sessionId from logs if available
      const sessionId = this.extractSessionId();
      
      if (!sessionId) {
        return {
          status: 'skipped',
          reason: 'No session ID found in logs'
        };
      }

      // Call health check endpoint
      const response = await fetch(`/api/context/health?sessionId=${sessionId}`);
      if (!response.ok) {
        return {
          status: 'error',
          reason: 'Health check endpoint failed'
        };
      }

      const result = await response.json();
      return {
        status: 'completed',
        sessionId,
        validation: result.data?.health || null
      };
    } catch (error) {
      return {
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractSessionId(): string | null {
    // Look for session ID in recent logs
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const log = this.logs[i];
      if (log.data?.sessionId) {
        return log.data.sessionId;
      }
      if (log.data?.response?.data?.sessionId) {
        return log.data.response.data.sessionId;
      }
    }
    return null;
  }

  private detectAnomalies() {
    const anomalies = [];

    // Detect API validation errors (400 status)
    const validationErrors = this.logs.filter(
      log => log.level === 'error' && log.data?.status === 400
    );
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        anomalies.push({
          type: 'API_VALIDATION_ERROR',
          severity: 'high',
          message: error.data?.errorMessage || error.message,
          url: error.data?.url || 'unknown',
          status: 400,
          field: error.data?.fieldName,
          details: error.data?.errorResponse,
          timestamp: error.timestamp
        });
      });
    }

    // Detect frequent errors
    const recentErrors = this.logs.filter(
      log => log.level === 'error' && log.timestamp > Date.now() - 60000
    );
    if (recentErrors.length > 5) {
      anomalies.push({
        type: 'FREQUENT_ERRORS',
        severity: 'high',
        message: `Detected ${recentErrors.length} errors in the last minute`,
        count: recentErrors.length,
        samples: recentErrors.slice(0, 3).map(e => e.message)
      });
    }

    // Detect repeated API failures
    const apiErrors = this.logs.filter(
      log => log.scope === 'api' && log.level === 'error'
    );
    if (apiErrors.length > 3) {
      const errorsByUrl = new Map<string, number>();
      apiErrors.forEach(log => {
        const url = log.data?.url || 'unknown';
        errorsByUrl.set(url, (errorsByUrl.get(url) || 0) + 1);
      });
      
      errorsByUrl.forEach((count, url) => {
        if (count > 2) {
          anomalies.push({
            type: 'REPEATED_API_FAILURE',
            severity: 'medium',
            message: `API endpoint ${url} failed ${count} times`,
            url,
            count
          });
        }
      });
    }

    // Detect missing context data
    const contextLogs = this.logs.filter(
      log => log.scope === 'api' && log.message.includes('GET /api/context/get')
    );
    const emptyContexts = contextLogs.filter(
      log => log.data?.response?.data?.blocks && 
             Object.keys(log.data.response.data.blocks).length === 0
    );
    if (emptyContexts.length > 0) {
      anomalies.push({
        type: 'EMPTY_CONTEXT',
        severity: 'low',
        message: `Found ${emptyContexts.length} context fetch(es) with no data`,
        count: emptyContexts.length
      });
    }

    // Detect slow API calls (over 5 seconds)
    const apiCalls = this.logs.filter(log => log.scope === 'api');
    const slowCalls = [];
    for (let i = 0; i < apiCalls.length - 1; i++) {
      const start = apiCalls[i];
      const end = apiCalls[i + 1];
      if (start.message.startsWith('GET') || start.message.startsWith('POST')) {
        const duration = end.timestamp - start.timestamp;
        if (duration > 5000) {
          slowCalls.push({
            url: start.message,
            duration: duration,
            timestamp: start.timestamp
          });
        }
      }
    }
    if (slowCalls.length > 0) {
      anomalies.push({
        type: 'SLOW_API_CALLS',
        severity: 'low',
        message: `Detected ${slowCalls.length} slow API call(s) (>5 seconds)`,
        calls: slowCalls
      });
    }

    return anomalies;
  }

  async download(filename?: string) {
    if (typeof window === 'undefined') return;
    
    const report = await this.export();
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
  export: async () => await simpleDebug.export(),
  download: async (filename?: string) => await simpleDebug.download(filename),
  clear: () => simpleDebug.clear(),
  getStats: () => simpleDebug.getStats(),
  isEnabled: () => simpleDebug.getStats().enabled,
};
