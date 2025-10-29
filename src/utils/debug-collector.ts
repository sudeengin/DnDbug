// Unified Debug & Flow Logging System
// Captures every major step of test execution with context-rich logs

export interface DebugLog {
  id: string;
  timestamp: number;
  scope: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  stack?: string;
  environment: {
    sessionId?: string;
    route?: string;
    component?: string;
    userAgent?: string;
    url?: string;
  };
}

export interface DebugReport {
  id: string;
  timestamp: number;
  sessionId?: string;
  environment: {
    userAgent: string;
    url: string;
    route: string;
    component?: string;
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

class DebugCollector {
  private logs: DebugLog[] = [];
  private isEnabled: boolean = false;
  private sessionId?: string;
  private currentRoute?: string;
  private currentComponent?: string;
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    log: typeof console.log;
  };

  constructor() {
    this.originalConsole = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      log: console.log.bind(console),
    };

    // Hook into global error handlers
    this.setupGlobalErrorHandlers();
    
    // Check if debug mode is enabled from localStorage
    this.isEnabled = localStorage.getItem('debug_mode') === 'true';
    
    if (this.isEnabled) {
      this.enable();
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
  }

  enable() {
    this.isEnabled = true;
    localStorage.setItem('debug_mode', 'true');
    
    // Override console methods to capture logs
    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.log('console', 'error', args.join(' '), { args });
    };

    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.log('console', 'warn', args.join(' '), { args });
    };

    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.log('console', 'info', args.join(' '), { args });
    };

    this.log('debug-collector', 'info', 'Debug mode enabled');
  }

  disable() {
    this.isEnabled = false;
    localStorage.setItem('debug_mode', 'false');
    
    // Restore original console methods
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.log = this.originalConsole.log;

    this.log('debug-collector', 'info', 'Debug mode disabled');
  }

  setContext(context: {
    sessionId?: string;
    route?: string;
    component?: string;
  }) {
    this.sessionId = context.sessionId;
    this.currentRoute = context.route;
    this.currentComponent = context.component;
  }

  log(scope: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    if (!this.isEnabled) return;

    const log: DebugLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      scope,
      level,
      message,
      data: this.sanitizeData(data),
      stack: level === 'error' ? this.getStackTrace() : undefined,
      environment: {
        sessionId: this.sessionId,
        route: this.currentRoute,
        component: this.currentComponent,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };

    this.logs.push(log);

    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  // Convenience methods for different log levels
  info(scope: string, message: string, data?: any) {
    this.log(scope, 'info', message, data);
  }

  warn(scope: string, message: string, data?: any) {
    this.log(scope, 'warn', message, data);
  }

  error(scope: string, message: string, data?: any) {
    this.log(scope, 'error', message, data);
  }

  debug(scope: string, message: string, data?: any) {
    this.log(scope, 'debug', message, data);
  }

  // Test flow specific methods
  logTestPhase(phase: 'generate' | 'hydrate' | 'validate' | 'lock' | 'append', 
               message: string, 
               inputData?: any, 
               outputData?: any) {
    this.log(`test-flow:${phase}`, 'info', message, {
      input: this.sanitizeData(inputData),
      output: this.sanitizeData(outputData),
      phase,
    });
  }

  logApiCall(endpoint: string, method: string, requestData?: any, responseData?: any, error?: any) {
    const level = error ? 'error' : 'info';
    this.log('api', level, `${method} ${endpoint}`, {
      endpoint,
      method,
      request: this.sanitizeData(requestData),
      response: this.sanitizeData(responseData),
      error: error ? this.sanitizeData(error) : undefined,
    });
  }

  logComponentAction(component: string, action: string, data?: any) {
    this.log(`component:${component}`, 'info', action, data);
  }

  logValidation(scope: string, isValid: boolean, errors?: any[], warnings?: any[]) {
    this.log(`validation:${scope}`, isValid ? 'info' : 'error', 
      `Validation ${isValid ? 'passed' : 'failed'}`, {
        isValid,
        errors: this.sanitizeData(errors),
        warnings: this.sanitizeData(warnings),
      });
  }

  // Export functionality
  exportReport(): DebugReport {
    const now = Date.now();
    const logs = [...this.logs]; // Create a copy
    
    const summary = {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.level === 'error').length,
      warningCount: logs.filter(log => log.level === 'warn').length,
      scopes: [...new Set(logs.map(log => log.scope))],
      timeRange: {
        start: logs.length > 0 ? logs[0].timestamp : now,
        end: logs.length > 0 ? logs[logs.length - 1].timestamp : now,
      },
    };

    return {
      id: this.generateId(),
      timestamp: now,
      sessionId: this.sessionId,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        route: this.currentRoute || 'unknown',
        component: this.currentComponent,
      },
      logs,
      summary,
    };
  }

  downloadReport(filename?: string) {
    const report = this.exportReport();
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

  async uploadReport(endpoint: string = '/debug/report') {
    const report = this.exportReport();
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.log('debug-collector', 'info', 'Debug report uploaded successfully', { result });
      return result;
    } catch (error) {
      this.log('debug-collector', 'error', 'Failed to upload debug report', { error });
      throw error;
    }
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
        info: logs.filter(log => log.level === 'info').length,
        warn: logs.filter(log => log.level === 'warn').length,
        error: logs.filter(log => log.level === 'error').length,
        debug: logs.filter(log => log.level === 'debug').length,
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

  // Framework-agnostic wrapper for any module
  wrapModule<T extends Record<string, any>>(moduleName: string, module: T): T {
    const wrapped = {} as T;
    
    for (const [key, value] of Object.entries(module)) {
      if (typeof value === 'function') {
        wrapped[key as keyof T] = ((...args: any[]) => {
          this.log(`module:${moduleName}`, 'info', `Calling ${key}`, { args: this.sanitizeData(args) });
          
          try {
            const result = value.apply(module, args);
            
            // Handle promises
            if (result && typeof result.then === 'function') {
              return result
                .then((resolved: any) => {
                  this.log(`module:${moduleName}`, 'info', `${key} resolved`, { result: this.sanitizeData(resolved) });
                  return resolved;
                })
                .catch((error: any) => {
                  this.log(`module:${moduleName}`, 'error', `${key} rejected`, { error: this.sanitizeData(error) });
                  throw error;
                });
            }
            
            this.log(`module:${moduleName}`, 'info', `${key} completed`, { result: this.sanitizeData(result) });
            return result;
          } catch (error) {
            this.log(`module:${moduleName}`, 'error', `${key} threw error`, { error: this.sanitizeData(error) });
            throw error;
          }
        }) as T[keyof T];
      } else {
        wrapped[key as keyof T] = value;
      }
    }
    
    return wrapped;
  }
}

// Create singleton instance
export const debugCollector = new DebugCollector();

// Export convenience functions
export const debug = {
  enable: () => debugCollector.enable(),
  disable: () => debugCollector.disable(),
  isEnabled: () => debugCollector['isEnabled'],
  setContext: (context: { sessionId?: string; route?: string; component?: string }) => 
    debugCollector.setContext(context),
  log: (scope: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) =>
    debugCollector.log(scope, level, message, data),
  info: (scope: string, message: string, data?: any) => debugCollector.info(scope, message, data),
  warn: (scope: string, message: string, data?: any) => debugCollector.warn(scope, message, data),
  error: (scope: string, message: string, data?: any) => debugCollector.error(scope, message, data),
  debug: (scope: string, message: string, data?: any) => debugCollector.debug(scope, message, data),
  testPhase: (phase: 'generate' | 'hydrate' | 'validate' | 'lock' | 'append', message: string, inputData?: any, outputData?: any) =>
    debugCollector.logTestPhase(phase, message, inputData, outputData),
  apiCall: (endpoint: string, method: string, requestData?: any, responseData?: any, error?: any) =>
    debugCollector.logApiCall(endpoint, method, requestData, responseData, error),
  component: (component: string, action: string, data?: any) =>
    debugCollector.logComponentAction(component, action, data),
  validation: (scope: string, isValid: boolean, errors?: any[], warnings?: any[]) =>
    debugCollector.logValidation(scope, isValid, errors, warnings),
  export: () => debugCollector.exportReport(),
  download: (filename?: string) => debugCollector.downloadReport(filename),
  upload: (endpoint?: string) => debugCollector.uploadReport(endpoint),
  clear: () => debugCollector.clear(),
  getLogs: (scope?: string, level?: string) => debugCollector.getLogs(scope, level),
  getStats: () => debugCollector.getStats(),
  wrapModule: <T extends Record<string, any>>(moduleName: string, module: T) =>
    debugCollector.wrapModule(moduleName, module),
};

export default debugCollector;
