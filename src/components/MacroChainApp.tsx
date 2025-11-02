import { useState } from 'react';
import MacroChainBoard from './MacroChainBoard';
import { ContextPanel } from './ContextPanel';
import StoryBackgroundGenerator from './StoryBackgroundGenerator';
import BackgroundPanel from './BackgroundPanel';
import ProjectCreate from './ProjectCreate';
import ProjectList from './ProjectList';
import { postJSON } from '../lib/api';
import { validateGenerateChainRequest, validateMacroChain } from '../utils/macro-chain-validation';
import { telemetry } from '../utils/telemetry';
import { debug } from '../utils/debug-collector';
import { useDebug } from '../hooks/useDebug';
import type { GenerateChainRequest, MacroChain, SessionContext, StoryBackground } from '../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.macroChain;

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function MacroChainApp() {
  const [chain, setChain] = useState<MacroChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [context, setContext] = useState<SessionContext | null>(null);
  const [background, setBackground] = useState<any | null>(null);
  const [showProjectCreate, setShowProjectCreate] = useState(false);

  // Initialize debug logging
  const { logAction, logTestPhase, logApiCall, logValidation } = useDebug({
    component: 'MacroChainApp',
    sessionId: sessionId || undefined,
    route: '/macro-chain',
  });

  const handleProjectCreated = (createdProject: Project) => {
    setProject(createdProject);
    setSessionId(createdProject.id); // Use project ID as sessionId
    setShowProjectCreate(false);
  };

  const handleProjectSelected = (selectedProject: Project) => {
    setProject(selectedProject);
    setSessionId(selectedProject.id); // Use project ID as sessionId
  };

  const handleCreateNew = () => {
    setShowProjectCreate(true);
  };

  const handleBackgroundUpdate = (newBackground: any) => {
    setBackground(newBackground);
  };

  const handleGenerateChain = async (request: GenerateChainRequest) => {
    // CRITICAL: Log when macro chain generation is triggered
    log.info('🚨 MACRO CHAIN GENERATION REQUESTED:', {
      sessionId,
      concept: request.concept,
      meta: request.meta,
      timestamp: new Date().toISOString(),
      trigger: 'handleGenerateChain_called'
    });

    try {
      logAction('generate-chain-started', { request, sessionId });
      logTestPhase('generate', 'Starting chain generation', request);

      if (!sessionId) {
        const errorMsg = 'No active project session';
        setError(errorMsg);
        logAction('generate-chain-error', { error: errorMsg });
        return;
      }

      setError(null);
      setValidationErrors([]);
      setLoading(true);

      // Validate the request
      logTestPhase('validate', 'Validating generate chain request', request);
      const validation = validateGenerateChainRequest(request);
      logValidation('generate-chain-request', validation.isValid, validation.errors, validation.warnings);
      
      if (!validation.isValid) {
        const errors = validation.errors.map(e => `${e.field}: ${e.message}`);
        setValidationErrors(errors);
        logAction('generate-chain-validation-failed', { errors });
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        log.warn('Validation warnings:', validation.warnings);
        logAction('generate-chain-warnings', { warnings: validation.warnings });
      }

      // Store the story concept in context
      logTestPhase('append', 'Storing story concept in context', { concept: request.concept, meta: request.meta });
      try {
        await postJSON('/api/context/append', {
          sessionId,
          blockType: 'story_concept',
          data: {
            concept: request.concept,
            meta: request.meta,
            timestamp: new Date().toISOString()
          }
        });
        logAction('context-append-success', { blockType: 'story_concept' });
      } catch (error) {
        log.warn('Failed to store story concept in context:', error);
        logAction('context-append-failed', { error, blockType: 'story_concept' });
        // Continue with chain generation even if context storage fails
      }

      // Call the API with sessionId for context memory
      logTestPhase('generate', 'Calling generate chain API', { ...request, sessionId });
      const response = await postJSON<{ ok: boolean; data: MacroChain }>('/api/generate_chain', {
        ...request,
        sessionId
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate chain');
      }

      // Validate the response
      logTestPhase('validate', 'Validating generated chain', response.data);
      const chainValidation = validateMacroChain(response.data);
      logValidation('generated-chain', chainValidation.isValid, chainValidation.errors, chainValidation.warnings);
      
      if (!chainValidation.isValid) {
        const errors = chainValidation.errors.map(e => `${e.field}: ${e.message}`);
        setValidationErrors(errors);
        logAction('chain-validation-failed', { errors });
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

      logTestPhase('generate', 'Chain generation completed successfully', response.data);
      logAction('generate-chain-success', { 
        chainId: response.data.chainId, 
        sceneCount: response.data.scenes.length 
      });
      
      setChain(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      log.error('Error generating chain:', err);
      logAction('generate-chain-error', { error: errorMessage, stack: err instanceof Error ? err.stack : undefined });
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

  // Show project selection/creation if no project exists
  if (!project || !sessionId) {
    if (showProjectCreate) {
      return (
        <ProjectCreate 
          onProjectCreated={handleProjectCreated}
          onCancel={() => setShowProjectCreate(false)}
        />
      );
    }
    return <ProjectList onProjectSelected={handleProjectSelected} onCreateNew={handleCreateNew} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Macro Chain Generator</h1>
          <p className="text-gray-600 mt-1">
            Generate 5-6 scene story chains with reorder and edit capabilities
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-sm text-gray-500">Project:</span>
            <span className="text-sm font-medium text-blue-600">{project.title}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{sessionId}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setProject(null);
              setSessionId(null);
              setChain(null);
              setContext(null);
              setShowProjectCreate(false);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Switch Project
          </button>
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

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel */}
        <div className="space-y-6">
          {/* Story Background Generator */}
          <StoryBackgroundGenerator 
            onBackgroundGenerated={handleBackgroundUpdate}
            onChainGenerated={handleGenerateChain}
            loading={loading}
            sessionId={sessionId}
          />

          {/* Background Panel */}
          <BackgroundPanel 
            sessionId={sessionId} 
            onBackgroundUpdate={handleBackgroundUpdate}
          />

          {/* Context Panel */}
          <ContextPanel 
            sessionId={sessionId} 
            onContextUpdate={setContext}
          />

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
        <div className="lg:col-span-2 space-y-6">
          {chain ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Generated Macro Chain</h2>
                <Button
                  onClick={handleNewChain}
                  variant="secondary"
                  size="sm"
                >
                  Generate New Chain
                </Button>
              </div>
              <MacroChainBoard 
                chain={chain} 
                onUpdate={handleChainUpdate}
                loading={loading}
                sessionId={sessionId}
                onContextUpdate={setContext}
                background={background}
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