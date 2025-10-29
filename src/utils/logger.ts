// Logger utility for consistent logging across the application
interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

class AppLogger implements Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]) {
    console.log(`[${this.context}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`[${this.context}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    console.debug(`[${this.context}] ${message}`, ...args);
  }
}

const logger = {
  macroChain: new AppLogger('MacroChain'),
  character: new AppLogger('Character'),
  characterSheet: new AppLogger('CharacterSheet'),
  background: new AppLogger('Background'),
  scene: new AppLogger('Scene'),
  context: new AppLogger('Context'),
  project: new AppLogger('Project'),
  api: new AppLogger('API'),
  telemetry: new AppLogger('Telemetry'),
  ui: new AppLogger('UI'),
};

export default logger;