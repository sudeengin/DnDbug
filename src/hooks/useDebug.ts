// React hook for Debug & Flow Logging integration
import React, { useEffect, useRef, useCallback } from 'react';
import { debug } from '../lib/debugCollector';
import { isDebugMode } from '../lib/isDebugMode';

export interface UseDebugOptions {
  component: string;
  sessionId?: string;
  route?: string;
  autoLogProps?: boolean;
  autoLogState?: boolean;
}

export function useDebug(options: UseDebugOptions) {
  const { component, sessionId, route, autoLogProps = false, autoLogState = false } = options;
  const prevPropsRef = useRef<any>();
  const prevStateRef = useRef<any>();

  // Set context when component mounts
  useEffect(() => {
    if (isDebugMode.enabled()) {
      debug.info(component, 'Component mounted', { sessionId, route });
    }
    
    return () => {
      if (isDebugMode.enabled()) {
        debug.info(component, 'Component unmounted');
      }
    };
  }, [component, sessionId, route]);

  // Auto-log prop changes
  useEffect(() => {
    if (autoLogProps && prevPropsRef.current !== undefined) {
      debug.component(component, 'Props changed', {
        previous: prevPropsRef.current,
        current: arguments[0], // This won't work as expected, need different approach
      });
    }
    prevPropsRef.current = arguments[0];
  });

  // Auto-log state changes
  useEffect(() => {
    if (autoLogState && prevStateRef.current !== undefined) {
      debug.component(component, 'State changed', {
        previous: prevStateRef.current,
        current: arguments[0], // This won't work as expected, need different approach
      });
    }
    prevStateRef.current = arguments[0];
  });

  const logAction = useCallback((action: string, data?: any) => {
    if (isDebugMode.enabled()) {
      debug.info(component, action, data);
    }
  }, [component]);

  const logTestPhase = useCallback((
    phase: 'generate' | 'hydrate' | 'validate' | 'lock' | 'append',
    message: string,
    inputData?: any,
    outputData?: any
  ) => {
    if (isDebugMode.enabled()) {
      debug.info(`test-flow:${phase}`, message, { inputData, outputData });
    }
  }, []);

  const logApiCall = useCallback((
    endpoint: string,
    method: string,
    requestData?: any,
    responseData?: any,
    error?: any
  ) => {
    if (isDebugMode.enabled()) {
      if (error) {
        debug.error('api', `${method} ${endpoint}`, { requestData, responseData, error });
      } else {
        debug.info('api', `${method} ${endpoint}`, { requestData, responseData });
      }
    }
  }, []);

  const logValidation = useCallback((
    scope: string,
    isValid: boolean,
    errors?: any[],
    warnings?: any[]
  ) => {
    if (isDebugMode.enabled()) {
      if (isValid) {
        debug.info(`validation:${scope}`, 'Validation passed', { errors, warnings });
      } else {
        debug.error(`validation:${scope}`, 'Validation failed', { errors, warnings });
      }
    }
  }, []);

  return {
    logAction,
    logTestPhase,
    logApiCall,
    logValidation,
    debug,
  };
}

// Higher-order component for automatic debugging
export function withDebug<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  options: Partial<UseDebugOptions> = {}
) {
  const WithDebugComponent = (props: P) => {
    const debugHook = useDebug({
      component: componentName,
      ...options,
    });

    // Log component render
    debugHook.logAction('Component rendered', { props });

    return React.createElement(WrappedComponent, props);
  };

  WithDebugComponent.displayName = `withDebug(${componentName})`;
  return WithDebugComponent;
}

// Hook for tracking async operations
export function useAsyncDebug(component: string) {
  const logAsync = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>,
    inputData?: any
  ): Promise<T> => {
    debug.component(component, `${operation} started`, inputData);
    
    try {
      const result = await asyncFn();
      debug.component(component, `${operation} completed`, { result });
      return result;
    } catch (error) {
      debug.component(component, `${operation} failed`, { error });
      throw error;
    }
  }, [component]);

  return { logAsync };
}

// Hook for form debugging
export function useFormDebug(component: string, formName: string) {
  const logFormEvent = useCallback((event: string, data?: any) => {
    debug.component(component, `Form ${formName}: ${event}`, data);
  }, [component, formName]);

  const logFormValidation = useCallback((isValid: boolean, errors?: any[]) => {
    debug.validation(`${component}:${formName}`, isValid, errors);
  }, [component, formName]);

  const logFormSubmit = useCallback(async <T>(
    submitFn: () => Promise<T>,
    formData?: any
  ): Promise<T> => {
    logFormEvent('submit started', formData);
    
    try {
      const result = await submitFn();
      logFormEvent('submit completed', { result });
      return result;
    } catch (error) {
      logFormEvent('submit failed', { error });
      throw error;
    }
  }, [logFormEvent]);

  return {
    logFormEvent,
    logFormValidation,
    logFormSubmit,
  };
}

export default useDebug;
