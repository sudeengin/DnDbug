// Example component demonstrating debug system integration
import React, { useState } from 'react';
import { useDebug } from '../hooks/useDebug';
import { debug } from '../utils/debug-collector';

interface TestFlowExampleProps {
  sessionId?: string;
}

export default function TestFlowExample({ sessionId }: TestFlowExampleProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { logAction, logTestPhase, logValidation } = useDebug({
    component: 'TestFlowExample',
    sessionId,
    route: '/test-flow',
  });

  const simulateTestFlow = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      logAction('test-flow-started', { timestamp: Date.now() });

      // Phase 1: Generate
      logTestPhase('generate', 'Starting content generation', { type: 'test-content' });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      const generated = { id: 'gen-123', content: 'Generated test content' };
      logTestPhase('generate', 'Generation completed', { type: 'test-content' }, generated);

      // Phase 2: Hydrate
      logTestPhase('hydrate', 'Starting content hydration', generated);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      const hydrated = { ...generated, hydrated: true, metadata: { processed: true } };
      logTestPhase('hydrate', 'Hydration completed', generated, hydrated);

      // Phase 3: Validate
      logTestPhase('validate', 'Starting content validation', hydrated);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate validation
      const validation = { isValid: true, errors: [], warnings: ['Minor formatting issue'] };
      logValidation('content-validation', validation.isValid, validation.errors, validation.warnings);
      
      if (!validation.isValid) {
        logTestPhase('validate', 'Validation failed', hydrated, validation);
        throw new Error('Validation failed');
      }
      logTestPhase('validate', 'Validation passed', hydrated, validation);

      // Phase 4: Lock
      logTestPhase('lock', 'Starting content lock', hydrated);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate lock
      const locked = { ...hydrated, locked: true, lockId: 'lock-456' };
      logTestPhase('lock', 'Lock completed', hydrated, locked);

      // Phase 5: Append
      logTestPhase('append', 'Starting context append', locked);
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate append
      const appended = { ...locked, appended: true, contextId: 'ctx-789' };
      logTestPhase('append', 'Append completed', locked, appended);

      logAction('test-flow-completed', { 
        result: appended,
        duration: Date.now() - Date.now() + 2800 // Approximate duration
      });

      setResult(appended);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logAction('test-flow-failed', { 
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
      setIsRunning(false);
    }
  };

  const simulateError = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      logAction('error-simulation-started', { timestamp: Date.now() });
      
      // Simulate an error during generation
      logTestPhase('generate', 'Starting error simulation', { simulateError: true });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Throw an error
      throw new Error('Simulated generation error for testing');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logAction('error-simulation-completed', { 
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    debug.clear();
    logAction('logs-cleared', { timestamp: Date.now() });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Flow Example</h2>
        <p className="text-gray-600 mb-6">
          This component demonstrates the debug system in action. It simulates a complete test flow
          with all phases: generate → hydrate → validate → lock → append.
        </p>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={simulateTestFlow}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Running Test Flow...' : 'Run Complete Test Flow'}
            </button>

            <button
              onClick={simulateError}
              disabled={isRunning}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Simulating Error...' : 'Simulate Error'}
            </button>

            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Debug Logs
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-red-800 font-medium">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-800 font-medium">Result:</h3>
              <pre className="text-green-700 text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Click "Run Complete Test Flow" to see a successful test flow with all phases logged</li>
              <li>Click "Simulate Error" to see how errors are captured and logged</li>
              <li>Click the floating debug button (bottom-right) to view all collected logs</li>
              <li>Use the debug panel to filter logs, export reports, or upload to backend</li>
              <li>Click "Clear Debug Logs" to reset the debug collection</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-yellow-800 font-medium">Debug System Features Demonstrated:</h3>
        <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1 mt-2">
          <li><strong>Test Phase Logging:</strong> Each phase (generate, hydrate, validate, lock, append) is logged with input/output data</li>
          <li><strong>Error Capture:</strong> Errors include stack traces and context information</li>
          <li><strong>Component Integration:</strong> Automatic component context tracking</li>
          <li><strong>Action Logging:</strong> User actions and state changes are logged</li>
          <li><strong>Validation Logging:</strong> Validation results with errors and warnings</li>
          <li><strong>Real-time Monitoring:</strong> All logs are available in the debug panel immediately</li>
        </ul>
      </div>
    </div>
  );
}
