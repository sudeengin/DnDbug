/**
 * Browser-compatible logging utility with emoji labels and color styling
 * Provides consistent logging across all frontend components
 */

// Component configurations with emoji and color
const componentConfig = {
  BACKGROUND: {
    emoji: '🌄',
    color: '#3B82F6', // blue
    name: 'BACKGROUND'
  },
  CHARACTER: {
    emoji: '🎭',
    color: '#D946EF', // magenta
    name: 'CHARACTER'
  },
  MACRO_CHAIN: {
    emoji: '🔗',
    color: '#06B6D4', // cyan
    name: 'MACRO_CHAIN'
  },
  SCENE: {
    emoji: '🎬',
    color: '#10B981', // green
    name: 'SCENE'
  },
  CONTEXT: {
    emoji: '🧠',
    color: '#F59E0B', // yellow
    name: 'CONTEXT'
  },
  STORAGE: {
    emoji: '💾',
    color: '#6B7280', // gray
    name: 'STORAGE'
  },
  API: {
    emoji: '🌐',
    color: '#06B6D4', // cyan
    name: 'API'
  },
  AI: {
    emoji: '🤖',
    color: '#D946EF', // magenta
    name: 'AI'
  },
  LOCK: {
    emoji: '🔒',
    color: '#EF4444', // red
    name: 'LOCK'
  },
  VALIDATION: {
    emoji: '✅',
    color: '#10B981', // green
    name: 'VALIDATION'
  },
  UI: {
    emoji: '🎨',
    color: '#8B5CF6', // purple
    name: 'UI'
  },
  NETWORK: {
    emoji: '📡',
    color: '#06B6D4', // cyan
    name: 'NETWORK'
  },
  ERROR: {
    emoji: '❌',
    color: '#EF4444', // red
    name: 'ERROR'
  }
} as const;

type ComponentType = keyof typeof componentConfig;

// Log level configurations
const logLevels = {
  DEBUG: { emoji: '🔍', name: 'DEBUG' },
  INFO: { emoji: 'ℹ️', name: 'INFO' },
  WARN: { emoji: '⚠️', name: 'WARN' },
  ERROR: { emoji: '❌', name: 'ERROR' },
  SUCCESS: { emoji: '✅', name: 'SUCCESS' }
} as const;

type LogLevel = keyof typeof logLevels;

/**
 * Format timestamp for logs
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().substring(11, 23); // HH:MM:SS.mmm
}

/**
 * Create console styles for component
 */
function getStyles(component: ComponentType, level?: LogLevel) {
  const config = componentConfig[component];
  const baseStyle = `color: ${config.color}; font-weight: bold;`;
  const timeStyle = 'color: #9CA3AF; font-weight: normal;';
  const resetStyle = 'color: inherit; font-weight: normal;';
  
  return {
    time: timeStyle,
    component: baseStyle,
    reset: resetStyle
  };
}

/**
 * Logger interface
 */
interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  success: (...args: any[]) => void;
  custom: (emoji: string, ...args: any[]) => void;
  child: (context: string | object) => Logger;
  separator: (char?: string, length?: number) => void;
  section: (title: string) => void;
  group: (title: string, fn: (log: Logger) => void) => void;
  table: (data: any) => void;
}

/**
 * Create a logger for a specific component
 */
function createLogger(component: ComponentType): Logger {
  const config = componentConfig[component];
  
  const logger: Logger = {
    /**
     * Log debug information
     */
    debug: (...args: any[]) => {
      const level = logLevels.DEBUG;
      const styles = getStyles(component);
      console.log(
        `%c[${getTimestamp()}] %c${config.emoji} ${config.name} %c${level.emoji} ${level.name}`,
        styles.time,
        styles.component,
        styles.reset,
        ...args
      );
    },
    
    /**
     * Log general information
     */
    info: (...args: any[]) => {
      const level = logLevels.INFO;
      const styles = getStyles(component);
      console.log(
        `%c[${getTimestamp()}] %c${config.emoji} ${config.name} %c${level.emoji}`,
        styles.time,
        styles.component,
        styles.reset,
        ...args
      );
    },
    
    /**
     * Log warnings
     */
    warn: (...args: any[]) => {
      const level = logLevels.WARN;
      const styles = getStyles(component);
      console.warn(
        `%c[${getTimestamp()}] %c${config.emoji} ${config.name} %c${level.emoji} ${level.name}`,
        styles.time,
        styles.component,
        styles.reset,
        ...args
      );
    },
    
    /**
     * Log errors
     */
    error: (...args: any[]) => {
      const level = logLevels.ERROR;
      const styles = getStyles(component);
      console.error(
        `%c[${getTimestamp()}] %c${config.emoji} ${config.name} %c${level.emoji} ${level.name}`,
        styles.time,
        styles.component,
        'color: #EF4444; font-weight: bold;',
        ...args
      );
    },
    
    /**
     * Log success messages
     */
    success: (...args: any[]) => {
      const level = logLevels.SUCCESS;
      const styles = getStyles(component);
      console.log(
        `%c[${getTimestamp()}] %c${config.emoji} ${config.name} %c${level.emoji} ${level.name}`,
        styles.time,
        styles.component,
        'color: #10B981; font-weight: bold;',
        ...args
      );
    },
    
    /**
     * Log with custom emoji and message
     */
    custom: (emoji: string, ...args: any[]) => {
      const styles = getStyles(component);
      console.log(
        `%c[${getTimestamp()}] %c${config.emoji} ${config.name} %c${emoji}`,
        styles.time,
        styles.component,
        styles.reset,
        ...args
      );
    },
    
    /**
     * Create a sub-logger with additional context
     */
    child: (context: string | object) => {
      const childLogger = createLogger(component);
      const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
      
      // Wrap all methods to include context
      const wrappedLogger = { ...childLogger };
      (['debug', 'info', 'warn', 'error', 'success', 'custom'] as const).forEach(method => {
        const originalMethod = childLogger[method];
        (wrappedLogger as any)[method] = (...args: any[]) => {
          if (method === 'custom') {
            originalMethod(args[0], `[${contextStr}]`, ...args.slice(1));
          } else {
            originalMethod(`[${contextStr}]`, ...args);
          }
        };
      });
      
      return wrappedLogger;
    },
    
    /**
     * Log a separator line
     */
    separator: (char = '─', length = 80) => {
      const styles = getStyles(component);
      console.log(`%c${char.repeat(length)}`, styles.component);
    },
    
    /**
     * Log a section header
     */
    section: (title: string) => {
      const styles = getStyles(component);
      console.log(
        `\n%c${'═'.repeat(80)}\n%c${config.emoji} ${config.name} %c${title}\n%c${'═'.repeat(80)}\n`,
        styles.component,
        styles.component,
        'font-weight: bold; font-size: 1.1em;',
        styles.component
      );
    },
    
    /**
     * Log a grouped set of related messages
     */
    group: (title: string, fn: (log: Logger) => void) => {
      const styles = getStyles(component);
      console.group(`%c${config.emoji} ${config.name} %c${title}`, styles.component, 'font-weight: bold;');
      fn(logger);
      console.groupEnd();
    },
    
    /**
     * Log data as a table
     */
    table: (data: any) => {
      const styles = getStyles(component);
      console.log(`%c${config.emoji} ${config.name}`, styles.component);
      console.table(data);
    }
  };
  
  return logger;
}

/**
 * Create loggers for all components
 */
export const loggers = {
  background: createLogger('BACKGROUND'),
  character: createLogger('CHARACTER'),
  macroChain: createLogger('MACRO_CHAIN'),
  scene: createLogger('SCENE'),
  context: createLogger('CONTEXT'),
  storage: createLogger('STORAGE'),
  api: createLogger('API'),
  ai: createLogger('AI'),
  lock: createLogger('LOCK'),
  validation: createLogger('VALIDATION'),
  ui: createLogger('UI'),
  network: createLogger('NETWORK'),
  error: createLogger('ERROR')
};

/**
 * Main logger export with utility methods
 */
export const logger = {
  ...loggers,
  
  /**
   * Create a logger for a specific component
   */
  create: createLogger,
  
  /**
   * Log a grouped set of related messages
   */
  group: (component: ComponentType, title: string, fn: (log: Logger) => void) => {
    const log = loggers[component.toLowerCase() as keyof typeof loggers] || loggers.api;
    log.group(title, fn);
  }
};

export default logger;

