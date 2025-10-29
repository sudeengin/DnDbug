// Example of how to use the simple debug system in any component
import React, { useState, useEffect } from 'react';
import debug from '../lib/simpleDebug';

export default function DebugExample() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    debug.info('DebugExample', 'Component mounted', { count });
    
    return () => {
      debug.info('DebugExample', 'Component unmounted');
    };
  }, []);

  useEffect(() => {
    debug.info('DebugExample', 'Count changed', { count });
  }, [count]);

  const handleIncrement = () => {
    debug.info('DebugExample', 'Increment button clicked', { from: count, to: count + 1 });
    setCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    debug.info('DebugExample', 'Decrement button clicked', { from: count, to: count - 1 });
    setCount(prev => prev - 1);
  };

  const handleError = () => {
    debug.error('DebugExample', 'Simulated error', { count, timestamp: Date.now() });
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Debug Example</h2>
      <p className="text-gray-600">Count: {count}</p>
      
      <div className="space-x-2">
        <button
          onClick={handleIncrement}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Increment
        </button>
        
        <button
          onClick={handleDecrement}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Decrement
        </button>
        
        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Simulate Error
        </button>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>• Click buttons to generate debug logs</p>
        <p>• Use the floating debug toggle (bottom-right) to enable/disable debug mode</p>
        <p>• When debug mode is enabled, logs appear in console and can be exported</p>
      </div>
    </div>
  );
}
