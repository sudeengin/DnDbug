/**
 * Centralized logging utility with emoji labels and color coding
 * Provides consistent logging across all application components
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

// Component configurations with emoji and color
const componentConfig = {
  BACKGROUND: {
    emoji: '🌄',
    color: colors.blue,
    name: 'BACKGROUND'
  },
  CHARACTER: {
    emoji: '🎭',
    color: colors.magenta,
    name: 'CHARACTER'
  },
  MACRO_CHAIN: {
    emoji: '🔗',
    color: colors.cyan,
    name: 'MACRO_CHAIN'
  },
  SCENE: {
    emoji: '🎬',
    color: colors.green,
    name: 'SCENE'
  },
  CONTEXT: {
    emoji: '🧠',
    color: colors.yellow,
    name: 'CONTEXT'
  },
  STORAGE: {
    emoji: '💾',
    color: colors.white,
    name: 'STORAGE'
  },
  API: {
    emoji: '🌐',
    color: colors.cyan,
    name: 'API'
  },
  AI: {
    emoji: '🤖',
    color: colors.magenta,
    name: 'AI'
  },
  LOCK: {
    emoji: '🔒',
    color: colors.red,
    name: 'LOCK'
  },
  VALIDATION: {
    emoji: '✅',
    color: colors.green,
    name: 'VALIDATION'
  },
  PROMPT: {
    emoji: '📝',
    color: colors.blue,
    name: 'PROMPT'
  },
  SERVER: {
    emoji: '⚙️',
    color: colors.white,
    name: 'SERVER'
  },
  ERROR: {
    emoji: '❌',
    color: colors.red,
    name: 'ERROR'
  }
};

// Log level configurations
const logLevels = {
  DEBUG: { emoji: '🔍', color: colors.dim, name: 'DEBUG' },
  INFO: { emoji: 'ℹ️', color: colors.white, name: 'INFO' },
  WARN: { emoji: '⚠️', color: colors.yellow, name: 'WARN' },
  ERROR: { emoji: '❌', color: colors.red, name: 'ERROR' },
  SUCCESS: { emoji: '✅', color: colors.green, name: 'SUCCESS' }
};

/**
 * Format timestamp for logs
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().substring(11, 23); // HH:MM:SS.mmm
}

/**
 * Create a logger for a specific component
 * @param {string} component - Component name from componentConfig
 * @returns {Object} Logger instance with log methods
 */
function createLogger(component) {
  const config = componentConfig[component] || componentConfig.API;
  
  const logger = {
    /**
     * Log debug information
     */
    debug: (...args) => {
      const level = logLevels.DEBUG;
      console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset}`,
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        `${level.emoji} ${level.color}${level.name}${colors.reset}`,
        ...args
      );
    },
    
    /**
     * Log general information
     */
    info: (...args) => {
      const level = logLevels.INFO;
      console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset}`,
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        `${level.emoji}`,
        ...args
      );
    },
    
    /**
     * Log warnings
     */
    warn: (...args) => {
      const level = logLevels.WARN;
      console.warn(
        `${colors.dim}[${getTimestamp()}]${colors.reset}`,
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        `${level.emoji} ${level.color}${level.name}${colors.reset}`,
        ...args
      );
    },
    
    /**
     * Log errors
     */
    error: (...args) => {
      const level = logLevels.ERROR;
      console.error(
        `${colors.dim}[${getTimestamp()}]${colors.reset}`,
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        `${level.emoji} ${level.color}${level.name}${colors.reset}`,
        ...args
      );
    },
    
    /**
     * Log success messages
     */
    success: (...args) => {
      const level = logLevels.SUCCESS;
      console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset}`,
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        `${level.emoji} ${level.color}${level.name}${colors.reset}`,
        ...args
      );
    },
    
    /**
     * Log with custom emoji and message
     */
    custom: (emoji, ...args) => {
      console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset}`,
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        emoji,
        ...args
      );
    },
    
    /**
     * Create a sub-logger with additional context
     */
    child: (context) => {
      const childLogger = createLogger(component);
      const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
      
      // Wrap all methods to include context
      Object.keys(childLogger).forEach(method => {
        if (typeof childLogger[method] === 'function' && method !== 'child') {
          const originalMethod = childLogger[method];
          childLogger[method] = (...args) => {
            originalMethod(`[${contextStr}]`, ...args);
          };
        }
      });
      
      return childLogger;
    },
    
    /**
     * Log a separator line
     */
    separator: (char = '─', length = 80) => {
      console.log(`${config.color}${char.repeat(length)}${colors.reset}`);
    },
    
    /**
     * Log a section header
     */
    section: (title) => {
      console.log(
        `\n${config.color}${'═'.repeat(80)}${colors.reset}`
      );
      console.log(
        `${config.emoji} ${config.color}${config.name}${colors.reset}`,
        `${colors.bright}${title}${colors.reset}`
      );
      console.log(
        `${config.color}${'═'.repeat(80)}${colors.reset}\n`
      );
    }
  };
  
  return logger;
}

/**
 * Create loggers for all components
 */
const loggers = {
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
  prompt: createLogger('PROMPT'),
  server: createLogger('SERVER'),
  error: createLogger('ERROR')
};

/**
 * Global logger - auto-detects component from context if possible
 */
const logger = {
  ...loggers,
  
  /**
   * Create a logger for a specific component
   */
  create: createLogger,
  
  /**
   * Log a grouped set of related messages
   */
  group: (component, title, fn) => {
    const log = loggers[component] || loggers.api;
    log.section(title);
    fn(log);
    log.separator();
  }
};

export default logger;
export { loggers, createLogger };

