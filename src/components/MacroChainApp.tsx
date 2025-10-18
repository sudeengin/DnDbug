import { useState } from 'react';
import StoryConceptForm from './StoryConceptForm';
import MacroChainBoard from './MacroChainBoard';
import { postJSON } from '../lib/api';
import { validateGenerateChainRequest, validateMacroChain } from '../utils/macro-chain-validation';
import { telemetry } from '../utils/telemetry';
import type { GenerateChainRequest, MacroChain } from '../types/macro-chain';

export default function MacroChainApp() {
  const [chain, setChain] = useState<MacroChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleGenerateChain = async (request: GenerateChainRequest) => {
    try {
      setError(null);
      setValidationErrors([]);
      setLoading(true);

      // Validate the request
      const validation = validateGenerateChainRequest(request);
      if (!validation.isValid) {
        setValidationErrors(validation.errors.map(e => `${e.field}: ${e.message}`));
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings);
      }

      // Call the API
      const response = await postJSON<{ ok: boolean; data: MacroChain }>('/api/generate_chain', request);
      
      if (!response.ok) {
        throw new Error('Failed to generate chain');
      }

      // Validate the response
      const chainValidation = validateMacroChain(response.data);
      if (!chainValidation.isValid) {
        setValidationErrors(chainValidation.errors.map(e => `${e.field}: ${e.message}`));
        return;
      }

      // Track telemetry
      telemetry.trackGenerateChain(
        response.data.chainId,
        response.data.scenes.length,
        {
          conceptLength: request.concept.length,
          hasMeta: !!request.meta,
        }
      );

      setChain(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating chain:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChainUpdate = (updatedChain: MacroChain) => {
    setChain(updatedChain);
    
    // Track telemetry for chain updates
    telemetry.trackUpdateChain(
      updatedChain.chainId,
      1, // editCount - in a real implementation, you'd track the actual number of edits
      {
        sceneCount: updatedChain.scenes.length,
      }
    );
  };

  const handleNewChain = () => {
    setChain(null);
    setError(null);
    setValidationErrors([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Macro Chain Generator</h1>
          <p className="text-gray-600 mt-1">
            Generate 5-6 scene story chains with reorder and edit capabilities
          </p>
        </div>
        <div className="text-sm text-gray-500">
          DnDBug — Story Agent MVP
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Validation Errors</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Story Concept Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <StoryConceptForm onSubmit={handleGenerateChain} loading={loading} />
          </div>

          {/* Telemetry Info (for development) */}
          {import.meta.env.DEV && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Telemetry Info</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Events: {telemetry.getEvents().length}</div>
                <div>Chains Generated: {telemetry.getEventsByType('generate_chain').length}</div>
                <div>Chains Updated: {telemetry.getEventsByType('update_chain').length}</div>
                <div>Scenes Reordered: {telemetry.getEventsByType('reorder_scene').length}</div>
                <div>Scenes Edited: {telemetry.getEventsByType('edit_scene').length}</div>
              </div>
            </div>
          )}
        </div>

        {/* Macro Chain Board */}
        <div className="space-y-6">
          {chain ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Generated Macro Chain</h2>
                <button
                  onClick={handleNewChain}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Generate New Chain
                </button>
              </div>
              <MacroChainBoard 
                chain={chain} 
                onUpdate={handleChainUpdate}
                loading={loading}
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Macro Chain Generated</h3>
              <p className="text-gray-600">
                Fill out the story concept form and click "Generate Macro Chain" to create your first chain.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
