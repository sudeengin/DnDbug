// Lightweight log/error helpers with conditional execution
// Only execute logging code if Debug Mode is enabled (zero performance cost when disabled)

import { debug } from './debugCollector';
import { isDebugMode } from './isDebugMode';

// Type definitions for better TypeScript support
type LogLevel = 'log' | 'error' | 'warn' | 'info';
type LogData = any;

interface LogOptions {
  scope?: string;
  data?: LogData;
  timestamp?: boolean;
}

// Core logging functions that check debug mode before executing
export const log = {
  /**
   * Log a message with optional data
   * Only executes if debug mode is enabled
   */
  info: (message: string, data?: LogData, scope: string = 'app') => {
    if (isDebugMode.enabled()) {
      debug.info(scope, message, data);
    }
  },

  /**
   * Log an error with optional data and stack trace
   * Only executes if debug mode is enabled
   */
  error: (message: string, data?: LogData, scope: string = 'app') => {
    if (isDebugMode.enabled()) {
      debug.error(scope, message, data);
    }
  },

  /**
   * Log a warning with optional data
   * Only executes if debug mode is enabled
   */
  warn: (message: string, data?: LogData, scope: string = 'app') => {
    if (isDebugMode.enabled()) {
      debug.warn(scope, message, data);
    }
  },

  /**
   * Log a debug message with optional data
   * Only executes if debug mode is enabled
   */
  debug: (message: string, data?: LogData, scope: string = 'app') => {
    if (isDebugMode.enabled()) {
      debug.log(scope, message, data);
    }
  },

  /**
   * Generic log function with level parameter
   * Only executes if debug mode is enabled
   */
  log: (level: LogLevel, message: string, data?: LogData, scope: string = 'app') => {
    if (isDebugMode.enabled()) {
      if (level === 'error') {
        debug.error(scope, message, data);
      } else if (level === 'warn') {
        debug.warn(scope, message, data);
      } else if (level === 'info') {
        debug.info(scope, message, data);
      } else {
        debug.log(scope, message, data);
      }
    }
  },
};

// Scoped logging helpers for common use cases
export const scopedLog = {
  /**
   * API-related logging
   */
  api: {
    request: (endpoint: string, method: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info('api', `${method} ${endpoint}`, { method, endpoint, data });
      }
    },
    response: (endpoint: string, method: string, data?: LogData, error?: any) => {
      if (isDebugMode.enabled()) {
        if (error) {
          debug.error('api', `${method} ${endpoint} response`, { method, endpoint, data, error });
        } else {
          debug.info('api', `${method} ${endpoint} response`, { method, endpoint, data });
        }
      }
    },
    error: (endpoint: string, method: string, error: any) => {
      if (isDebugMode.enabled()) {
        debug.error('api', `${method} ${endpoint} failed`, { method, endpoint, error });
      }
    },
  },

  /**
   * Component-related logging
   */
  component: {
    mount: (componentName: string, props?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info(`component:${componentName}`, 'Component mounted', props);
      }
    },
    unmount: (componentName: string) => {
      if (isDebugMode.enabled()) {
        debug.info(`component:${componentName}`, 'Component unmounted');
      }
    },
    update: (componentName: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info(`component:${componentName}`, 'Component updated', data);
      }
    },
    error: (componentName: string, error: any, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.error(`component:${componentName}`, 'Component error', { error, data });
      }
    },
  },

  /**
   * Test flow logging
   */
  testFlow: {
    start: (phase: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info(`test-flow:${phase}`, 'Test phase started', data);
      }
    },
    complete: (phase: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info(`test-flow:${phase}`, 'Test phase completed', data);
      }
    },
    error: (phase: string, error: any, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.error(`test-flow:${phase}`, 'Test phase failed', { error, data });
      }
    },
  },

  /**
   * Validation logging
   */
  validation: {
    start: (scope: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info(`validation:${scope}`, 'Validation started', data);
      }
    },
    pass: (scope: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info(`validation:${scope}`, 'Validation passed', data);
      }
    },
    fail: (scope: string, errors: any[], data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.error(`validation:${scope}`, 'Validation failed', { errors, data });
      }
    },
  },

  /**
   * User action logging
   */
  user: {
    action: (action: string, data?: LogData) => {
      if (isDebugMode.enabled()) {
        debug.info('user', `User action: ${action}`, data);
      }
    },
    navigation: (from: string, to: string) => {
      if (isDebugMode.enabled()) {
        debug.info('user', 'Navigation', { from, to });
      }
    },
  },
};

// Performance-aware logging helpers
export const perfLog = {
  /**
   * Log performance metrics
   * Only executes if debug mode is enabled
   */
  measure: (name: string, startTime: number, data?: LogData) => {
    if (isDebugMode.enabled()) {
      const duration = Date.now() - startTime;
      debug.info('performance', `Performance: ${name}`, { duration, ...data });
    }
  },

  /**
   * Create a performance timer
   * Returns a function that logs the duration when called
   */
  timer: (name: string, data?: LogData) => {
    const startTime = Date.now();
    return () => {
      if (isDebugMode.enabled()) {
        perfLog.measure(name, startTime, data);
      }
    };
  },
};

// Conditional execution helpers
export const conditional = {
  /**
   * Execute a function only if debug mode is enabled
   */
  execute: <T>(fn: () => T): T | undefined => {
    if (isDebugMode.enabled()) {
      return fn();
    }
    return undefined;
  },

  /**
   * Execute a function with debug logging
   */
  executeWithLog: <T>(
    fn: () => T,
    scope: string,
    message: string,
    data?: LogData
  ): T | undefined => {
    if (isDebugMode.enabled()) {
      debug.info(scope, `${message} - starting`, data);
      try {
        const result = fn();
        debug.info(scope, `${message} - completed`, { result });
        return result;
      } catch (error) {
        debug.error(scope, `${message} - failed`, { error });
        throw error;
      }
    }
    return undefined;
  },
};

// Export utilities
export const debugUtils = {
  /**
   * Get current debug statistics
   */
  getStats: () => {
    if (isDebugMode.enabled()) {
      return debug.getStats();
    }
    return null;
  },

  /**
   * Get logs for a specific scope
   */
  getLogs: (scope?: string, level?: LogLevel) => {
    if (isDebugMode.enabled()) {
      return debug.getLogs(scope, level);
    }
    return [];
  },

  /**
   * Export debug report
   */
  export: () => {
    if (isDebugMode.enabled()) {
      return debug.export();
    }
    return null;
  },

  /**
   * Download debug report
   */
  download: async (filename?: string) => {
    if (isDebugMode.enabled()) {
      await debug.download(filename);
    }
  },

  /**
   * Clear all debug logs
   */
  clear: () => {
    if (isDebugMode.enabled()) {
      debug.clear();
    }
  },
};

// Default export for convenience
export default {
  log,
  scopedLog,
  perfLog,
  conditional,
  debugUtils,
  isDebugMode,
};
