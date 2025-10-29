// Example integration of Vite-safe debug system
// Demonstrates how to wrap critical functions with debug logging

import { log, scopedLog, perfLog, conditional } from '../lib/debugHelpers';
import { isDebugMode } from '../lib/isDebugMode';

// Example API function with debug logging
export async function fetchUserData(userId: string) {
  const timer = perfLog.timer('fetchUserData', { userId });
  
  try {
    scopedLog.api.request('/api/users', 'GET', { userId });
    
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    scopedLog.api.response('/api/users', 'GET', data);
    log.info('User data fetched successfully', { userId, dataLength: JSON.stringify(data).length });
    
    return data;
    
  } catch (error) {
    scopedLog.api.error('/api/users', 'GET', error);
    log.error('Failed to fetch user data', { userId, error });
    throw error;
    
  } finally {
    timer(); // Log performance metrics
  }
}

// Example component function with debug logging
export function processUserForm(formData: any) {
  return conditional.executeWithLog(
    () => {
      // Validation
      scopedLog.validation.start('user-form', formData);
      
      if (!formData.email) {
        scopedLog.validation.fail('user-form', ['Email is required'], formData);
        throw new Error('Email is required');
      }
      
      if (!formData.name) {
        scopedLog.validation.fail('user-form', ['Name is required'], formData);
        throw new Error('Name is required');
      }
      
      scopedLog.validation.pass('user-form', formData);
      
      // Process data
      const processedData = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      
      log.info('Form processed successfully', { processedData });
      return processedData;
    },
    'form-processor',
    'Processing user form',
    formData
  );
}

// Example test flow function
export async function executeTestFlow(inputData: any) {
  const phases = ['generate', 'hydrate', 'validate', 'lock', 'append'];
  
  for (const phase of phases) {
    try {
      scopedLog.testFlow.start(phase, inputData);
      
      // Simulate phase execution
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = { phase, inputData, completed: true };
      
      scopedLog.testFlow.complete(phase, result);
      
    } catch (error) {
      scopedLog.testFlow.error(phase, error, inputData);
      throw error;
    }
  }
  
  log.info('Test flow completed successfully', { phases: phases.length });
}

// Example error handling with debug logging
export function handleGlobalError(error: Error, context?: any) {
  log.error('Global error occurred', { 
    message: error.message, 
    stack: error.stack,
    context 
  });
  
  // Only show user-friendly error in production
  if (isDebugMode.isProduction()) {
    console.error('An error occurred. Please try again.');
  } else {
    console.error('Debug mode - Full error details:', error);
  }
}

// Example performance monitoring
export function monitorPerformance<T>(
  name: string,
  fn: () => T,
  data?: any
): T {
  const timer = perfLog.timer(name, data);
  
  try {
    const result = fn();
    timer();
    return result;
  } catch (error) {
    timer();
    log.error(`Performance monitoring failed for ${name}`, { error, data });
    throw error;
  }
}

// Example conditional execution based on debug mode
export function debugOnlyFunction() {
  return conditional.execute(() => {
    log.info('This function only runs in debug mode');
    return 'Debug mode is enabled';
  });
}

// Export utilities for easy integration
export const debugIntegration = {
  // Wrap any function with debug logging
  wrapFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    scope: string = 'app'
  ): T => {
    return ((...args: any[]) => {
      const timer = perfLog.timer(name, { args });
      
      try {
        log.info(`${name} started`, { args }, scope);
        const result = fn(...args);
        log.info(`${name} completed`, { result }, scope);
        return result;
      } catch (error) {
        log.error(`${name} failed`, { error, args }, scope);
        throw error;
      } finally {
        timer();
      }
    }) as T;
  },

  // Wrap async function with debug logging
  wrapAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string,
    scope: string = 'app'
  ): T => {
    return (async (...args: any[]) => {
      const timer = perfLog.timer(name, { args });
      
      try {
        log.info(`${name} started`, { args }, scope);
        const result = await fn(...args);
        log.info(`${name} completed`, { result }, scope);
        return result;
      } catch (error) {
        log.error(`${name} failed`, { error, args }, scope);
        throw error;
      } finally {
        timer();
      }
    }) as T;
  },

  // Create debug-enabled component wrapper
  wrapComponent: (componentName: string) => ({
    mount: (props?: any) => scopedLog.component.mount(componentName, props),
    unmount: () => scopedLog.component.unmount(componentName),
    update: (data?: any) => scopedLog.component.update(componentName, data),
    error: (error: any, data?: any) => scopedLog.component.error(componentName, error, data),
  }),
};
