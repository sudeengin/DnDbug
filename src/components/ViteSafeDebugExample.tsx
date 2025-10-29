// Example component demonstrating Vite-safe debug system
import React, { useState, useEffect } from 'react';
import { log, scopedLog, perfLog, conditional } from '../lib/debugHelpers';
import { isDebugMode } from '../lib/isDebugMode';

export default function ViteSafeDebugExample() {
  const [count, setCount] = useState(0);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  // Monitor debug mode changes
  useEffect(() => {
    const checkDebugMode = () => {
      const enabled = isDebugMode.enabled();
      setIsDebugEnabled(enabled);
      
      if (enabled) {
        log.info('Debug mode enabled in component');
      }
    };

    checkDebugMode();
    const interval = setInterval(checkDebugMode, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Component mount logging
  useEffect(() => {
    scopedLog.component.mount('ViteSafeDebugExample', { count });
    
    return () => {
      scopedLog.component.unmount('ViteSafeDebugExample');
    };
  }, []);

  // Component update logging
  useEffect(() => {
    scopedLog.component.update('ViteSafeDebugExample', { count });
  }, [count]);

  const handleIncrement = () => {
    const timer = perfLog.timer('increment-counter', { currentCount: count });
    
    try {
      log.info('Incrementing counter', { from: count, to: count + 1 });
      setCount(prev => prev + 1);
      
      // Simulate some work
      setTimeout(() => {
        timer();
        log.info('Counter increment completed', { newCount: count + 1 });
      }, 100);
      
    } catch (error) {
      timer();
      log.error('Failed to increment counter', { error, count });
    }
  };

  const handleDecrement = () => {
    const timer = perfLog.timer('decrement-counter', { currentCount: count });
    
    try {
      log.info('Decrementing counter', { from: count, to: count - 1 });
      setCount(prev => prev - 1);
      
      setTimeout(() => {
        timer();
        log.info('Counter decrement completed', { newCount: count - 1 });
      }, 100);
      
    } catch (error) {
      timer();
      log.error('Failed to decrement counter', { error, count });
    }
  };

  const handleToggleDebug = () => {
    const wasEnabled = isDebugMode.enabled();
    const newState = isDebugMode.toggle();
    
    log.info('Debug mode toggled', { 
      from: wasEnabled, 
      to: newState,
      timestamp: Date.now()
    });
    
    setIsDebugEnabled(newState);
  };

  const handleSimulateError = () => {
    try {
      scopedLog.testFlow.start('error-simulation', { count });
      
      // Simulate an error
      throw new Error('Simulated error for testing');
      
    } catch (error) {
      scopedLog.testFlow.error('error-simulation', error, { count });
      scopedLog.component.error('ViteSafeDebugExample', error, { count });
    }
  };

  const handleConditionalFunction = () => {
    const result = conditional.execute(() => {
      log.info('This function only runs in debug mode');
      return 'Debug mode is enabled!';
    });
    
    if (result) {
      alert(result);
    } else {
      alert('Debug mode is disabled - function not executed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Vite-Safe Debug System Example
        </h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Debug Mode: <span className={`font-medium ${isDebugEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {isDebugEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Counter: {count}
              </p>
            </div>
            <button
              onClick={handleToggleDebug}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isDebugEnabled 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              {isDebugEnabled ? 'Disable Debug' : 'Enable Debug'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleIncrement}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Increment (+1)
          </button>
          
          <button
            onClick={handleDecrement}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Decrement (-1)
          </button>
          
          <button
            onClick={handleSimulateError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Simulate Error
          </button>
          
          <button
            onClick={handleConditionalFunction}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Conditional Function
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-blue-800 font-medium mb-2">Features Demonstrated:</h3>
          <ul className="text-blue-700 text-sm list-disc list-inside space-y-1">
            <li><strong>SSR Safety:</strong> All window/localStorage access is guarded with typeof checks</li>
            <li><strong>Zero Performance Cost:</strong> When debug mode is disabled, no logging code executes</li>
            <li><strong>Component Logging:</strong> Mount, unmount, and update events are tracked</li>
            <li><strong>Performance Monitoring:</strong> Function execution times are measured</li>
            <li><strong>Error Capture:</strong> Errors are logged with full context and stack traces</li>
            <li><strong>Conditional Execution:</strong> Functions only run when debug mode is enabled</li>
            <li><strong>Scoped Logging:</strong> Different types of logs (user, component, test-flow)</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-yellow-800 font-medium mb-2">Instructions:</h3>
          <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
            <li>Toggle debug mode on/off to see the difference</li>
            <li>Click buttons to generate different types of logs</li>
            <li>When debug mode is enabled, click the floating "Export Logs" button to download logs</li>
            <li>Check the browser console to see debug messages (only when enabled)</li>
            <li>Try the "Conditional Function" button to see conditional execution</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
