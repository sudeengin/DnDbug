// Simple debug toggle button
import React, { useState, useEffect } from 'react';
import { debug } from '../lib/simpleDebug';

export default function SimpleDebugToggle() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [showAutoExport, setShowAutoExport] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const enabled = debug.isEnabled();
      setIsEnabled(enabled);
      
      const stats = debug.getStats();
      setLogCount(stats.total);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    if (isEnabled) {
      // If turning debug mode OFF and there are logs, auto-export
      if (logCount > 0) {
        const filename = `debug-auto-export-${new Date().toISOString().slice(0, 19)}.json`;
        debug.download(filename);
        console.log(`🔍 Debug: Auto-exported ${logCount} logs to ${filename}`);
        setShowAutoExport(true);
        // Hide the notification after 3 seconds
        setTimeout(() => setShowAutoExport(false), 3000);
      }
      debug.disable();
    } else {
      debug.enable();
    }
    setIsEnabled(!isEnabled);
  };

  const handleExport = () => {
    debug.download();
  };

  const handleClear = () => {
    debug.clear();
    setLogCount(0);
  };

  if (!isEnabled && logCount === 0) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-50 bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg transition-colors"
        title="Enable Debug Mode"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2">
      {/* Auto-export notification */}
      {showAutoExport && (
        <div className="bg-green-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg animate-pulse">
          ✓ Auto-exported {logCount} logs
        </div>
      )}
      
      {/* Log count indicator */}
      {logCount > 0 && (
        <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
          {logCount} logs
        </div>
      )}
      
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`p-3 rounded-full shadow-lg transition-colors ${
          isEnabled 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-gray-600 hover:bg-gray-700'
        } text-white`}
        title={isEnabled ? 'Disable Debug Mode' : 'Enable Debug Mode'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Export button - always show when there are logs, regardless of debug mode */}
      {logCount > 0 && (
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors"
          title={`Export ${logCount} Debug Logs`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      )}

      {/* Clear button - always show when there are logs */}
      {logCount > 0 && (
        <button
          onClick={handleClear}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-colors"
          title="Clear Debug Logs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
