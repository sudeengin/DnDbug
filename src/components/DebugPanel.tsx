// Debug Panel Component for managing debug mode and viewing logs
import React, { useState, useEffect } from 'react';
import type { DebugLog } from '../lib/debugCollector';
import { debug } from '../lib/debugCollector';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DebugLog[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stats, setStats] = useState(debug.getStats());

  // Refresh logs and stats
  const refreshData = () => {
    setLogs(debug.getLogs());
    setStats(debug.getStats());
  };

  // Filter logs based on selected criteria
  useEffect(() => {
    let filtered = [...logs];

    if (selectedScope) {
      filtered = filtered.filter(log => log.scope === selectedScope);
    }

    if (selectedLevel) {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.scope.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedScope, selectedLevel, searchTerm]);

  // Auto-refresh logs every 2 seconds when panel is open
  useEffect(() => {
    if (!isOpen) return;

    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleExport = () => {
    debug.download();
  };

  const handleUpload = async () => {
    try {
      await debug.upload();
      alert('Debug report uploaded successfully!');
    } catch (error) {
      alert(`Failed to upload debug report: ${error}`);
    }
  };

  const handleClear = () => {
    debug.clear();
    refreshData();
  };

  const toggleDebugMode = () => {
    if (debug.isEnabled()) {
      debug.disable();
    } else {
      debug.enable();
    }
    refreshData();
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getUniqueScopes = () => {
    return [...new Set(logs.map(log => log.scope))].sort();
  };

  const getUniqueLevels = () => {
    return [...new Set(logs.map(log => log.level))].sort();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Debug Panel</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleDebugMode}
              className={`px-3 py-1 rounded text-sm font-medium ${
                debug.isEnabled() 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {debug.isEnabled() ? 'Debug ON' : 'Debug OFF'}
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200"
            >
              Export Report
            </button>
            <button
              onClick={handleUpload}
              className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium hover:bg-purple-200"
            >
              Upload Report
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200"
            >
              Clear Logs
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Logs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.byLevel.error}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.byLevel.warn}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.byLevel.info}</div>
              <div className="text-sm text-gray-600">Info</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Scopes</option>
              {getUniqueScopes().map(scope => (
                <option key={scope} value={scope}>{scope}</option>
              ))}
            </select>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              {getUniqueLevels().map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {logs.length === 0 ? 'No logs available' : 'No logs match the current filters'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{log.scope}</span>
                        <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <div className="text-sm text-gray-900 mb-2">{log.message}</div>
                      {log.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            Data ({Object.keys(log.data).length} properties)
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stack && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            Stack Trace
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
