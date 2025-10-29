// Floating Export Logs button for manual debug report download
// Only shows when debug mode is enabled

import React, { useState, useEffect } from 'react';
import { debugUtils } from '../lib/debugHelpers';
import { isDebugMode } from '../lib/isDebugMode';

interface ExportLogsButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export default function ExportLogsButton({ 
  position = 'bottom-right',
  className = ''
}: ExportLogsButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [logCount, setLogCount] = useState(0);

  // Check if debug mode is enabled and update visibility
  useEffect(() => {
    const checkDebugMode = () => {
      const enabled = isDebugMode.enabled();
      setIsVisible(enabled);
      
      if (enabled) {
        const stats = debugUtils.getStats();
        setLogCount(stats?.total || 0);
      }
    };

    // Check initially
    checkDebugMode();

    // Set up interval to check for debug mode changes
    const interval = setInterval(checkDebugMode, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    if (!isDebugMode.enabled()) return;

    setIsExporting(true);
    
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `debug-logs-${timestamp}.json`;
      
      // Download the report
      debugUtils.download(filename);
      
      // Log the export action
      debugUtils.getStats(); // This will trigger a log if debug mode is enabled
      
    } catch (error) {
      console.error('Failed to export debug logs:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearLogs = () => {
    if (!isDebugMode.enabled()) return;
    
    debugUtils.clear();
    setLogCount(0);
  };

  // Don't render if debug mode is disabled
  if (!isVisible) {
    return null;
  }

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div className="flex flex-col items-end space-y-2">
        {/* Log count indicator */}
        {logCount > 0 && (
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
            {logCount} logs
          </div>
        )}
        
        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting || logCount === 0}
          className={`
            bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg 
            transition-colors duration-200 flex items-center justify-center
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isExporting ? 'animate-pulse' : ''}
          `}
          title={`Export ${logCount} debug logs`}
        >
          {isExporting ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </button>

        {/* Clear logs button (only show if there are logs) */}
        {logCount > 0 && (
          <button
            onClick={handleClearLogs}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
            title="Clear all debug logs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Alternative compact version for minimal UI
export function CompactExportLogsButton({ className = '' }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    const checkDebugMode = () => {
      const enabled = isDebugMode.enabled();
      setIsVisible(enabled);
      
      if (enabled) {
        const stats = debugUtils.getStats();
        setLogCount(stats?.total || 0);
      }
    };

    checkDebugMode();
    const interval = setInterval(checkDebugMode, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible || logCount === 0) {
    return null;
  }

  return (
    <button
      onClick={() => debugUtils.download()}
      className={`
        fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 
        text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium
        transition-colors duration-200 ${className}
      `}
      title={`Export ${logCount} debug logs`}
    >
      Export Logs ({logCount})
    </button>
  );
}
