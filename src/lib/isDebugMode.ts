// Debug mode utility for environment and localStorage flag management
// Vite-safe implementation with SSR guards

interface DebugModeConfig {
  environmentVariable?: string;
  localStorageKey?: string;
  defaultValue?: boolean;
}

class DebugModeManager {
  private config: Required<DebugModeConfig>;
  private cachedValue: boolean | null = null;
  private lastCheck: number = 0;
  private cacheTimeout: number = 1000; // Cache for 1 second

  constructor(config: DebugModeConfig = {}) {
    this.config = {
      environmentVariable: config.environmentVariable || 'VITE_DEBUG_MODE',
      localStorageKey: config.localStorageKey || 'debug_mode',
      defaultValue: config.defaultValue || false,
    };
  }

  /**
   * Check if debug mode is enabled
   * Uses caching to avoid repeated localStorage access
   */
  isEnabled(): boolean {
    // Return cached value if still valid
    if (this.cachedValue !== null && Date.now() - this.lastCheck < this.cacheTimeout) {
      return this.cachedValue;
    }

    // Check environment variable first (for build-time control)
    const envValue = this.checkEnvironmentVariable();
    if (envValue !== null) {
      this.cachedValue = envValue;
      this.lastCheck = Date.now();
      return envValue;
    }

    // Check localStorage (browser only)
    const localStorageValue = this.checkLocalStorage();
    if (localStorageValue !== null) {
      this.cachedValue = localStorageValue;
      this.lastCheck = Date.now();
      return localStorageValue;
    }

    // Return default value
    this.cachedValue = this.config.defaultValue;
    this.lastCheck = Date.now();
    return this.config.defaultValue;
  }

  /**
   * Enable debug mode
   * Only works in browser environment
   */
  enable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      localStorage.setItem(this.config.localStorageKey, 'true');
      this.cachedValue = true;
      this.lastCheck = Date.now();
      return true;
    } catch (error) {
      // localStorage might be disabled or full
      return false;
    }
  }

  /**
   * Disable debug mode
   * Only works in browser environment
   */
  disable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      localStorage.setItem(this.config.localStorageKey, 'false');
      this.cachedValue = false;
      this.lastCheck = Date.now();
      return true;
    } catch (error) {
      // localStorage might be disabled or full
      return false;
    }
  }

  /**
   * Toggle debug mode
   * Only works in browser environment
   */
  toggle(): boolean {
    return this.isEnabled() ? this.disable() : this.enable();
  }

  /**
   * Get debug mode status as string for display
   */
  getStatus(): 'enabled' | 'disabled' | 'unknown' {
    if (typeof window === 'undefined') {
      return 'unknown';
    }

    return this.isEnabled() ? 'enabled' : 'disabled';
  }

  /**
   * Get debug mode configuration
   */
  getConfig(): DebugModeConfig {
    return { ...this.config };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedValue = null;
    this.lastCheck = 0;
  }

  /**
   * Check if we're in a browser environment
   */
  isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Check if we're in a development environment
   */
  isDevelopment(): boolean {
    if (typeof process !== 'undefined' && (process as any).env) {
      const env = (process as any).env;
      return env.NODE_ENV === 'development' || 
             env.MODE === 'development' ||
             env.DEV === 'true';
    }
    return false;
  }

  /**
   * Check if we're in a production environment
   */
  isProduction(): boolean {
    if (typeof process !== 'undefined' && (process as any).env) {
      const env = (process as any).env;
      return env.NODE_ENV === 'production' || 
             env.MODE === 'production' ||
             env.PROD === 'true';
    }
    return false;
  }

  private checkEnvironmentVariable(): boolean | null {
    if (typeof process === 'undefined' || !(process as any).env) {
      return null;
    }

    const envValue = (process as any).env[this.config.environmentVariable];
    if (envValue === undefined) {
      return null;
    }

    // Parse boolean values
    if (envValue === 'true' || envValue === '1') {
      return true;
    }
    if (envValue === 'false' || envValue === '0') {
      return false;
    }

    return null;
  }

  private checkLocalStorage(): boolean | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const value = localStorage.getItem(this.config.localStorageKey);
      if (value === null) {
        return null;
      }

      return value === 'true';
    } catch (error) {
      // localStorage might be disabled
      return null;
    }
  }
}

// Create default instance
const debugModeManager = new DebugModeManager();

// Export convenience functions
export const isDebugMode = {
  enabled: () => debugModeManager.isEnabled(),
  enable: () => debugModeManager.enable(),
  disable: () => debugModeManager.disable(),
  toggle: () => debugModeManager.toggle(),
  status: () => debugModeManager.getStatus(),
  config: () => debugModeManager.getConfig(),
  clearCache: () => debugModeManager.clearCache(),
  isBrowser: () => debugModeManager.isBrowser(),
  isDevelopment: () => debugModeManager.isDevelopment(),
  isProduction: () => debugModeManager.isProduction(),
};

// Export the manager instance for advanced usage
export { debugModeManager };

// Export types
export type { DebugModeConfig };

export default isDebugMode;
