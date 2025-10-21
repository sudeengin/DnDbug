import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/toast';
import MacroChainBoard from '../MacroChainBoard';
import { getJSON, postJSON, generateChain } from '../../lib/api';
import { useOnTabFocus } from '../../hooks/useOnTabFocus';
import { navigateToTab } from '../../lib/router';
import type { SessionContext, MacroChain, MacroScene } from '../../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.macroChain;

interface MacroChainPageProps {
  sessionId: string;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext | null) => void;
}

export default function MacroChainPage({ sessionId, context, onContextUpdate }: MacroChainPageProps) {
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<MacroScene[]>([]);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<'Generated' | 'Edited' | 'Locked' | 'NeedsRegen'>('Generated');
  const [error, setError] = useState<string | null>(null);
  const [generatingChain, setGeneratingChain] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Flag to prevent refetch during updates
  const [isInteracting, setIsInteracting] = useState(false); // Flag to prevent refetch during GM intent modal interactions
  const { addToast } = useToast();

  // Always re-fetch context on mount and tab focus
  useEffect(() => {
    if (sessionId) {
      refetchContext();
      // Also check the actual chain status from server if we have a chain ID
      if (currentChainId) {
        checkChainStatus();
      }
    }
  }, [sessionId]);

  useOnTabFocus(() => {
    // TEMPORARILY DISABLED: Don't refetch on tab focus to prevent data loss
    // This was causing background/characters to disappear when GM Intent modal appeared
    log.info('👀 TAB FOCUS DETECTED - REFETCH DISABLED (isUpdating:', isUpdating, ')');
    // TODO: Re-enable this with proper safeguards
    /*
    if (sessionId && !isUpdating) {
      log.info('👀 REFETCHING CONTEXT due to tab focus');
      refetchContext();
      if (currentChainId) {
        checkChainStatus();
      }
    }
    */
  });

  const refetchContext = async () => {
    try {
      setLoading(true);
      log.info('refetchContext: Fetching context for session:', sessionId);
      const response = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${sessionId}`);
      log.info('refetchContext: Context response:', response);
      
      if (response.ok && response.data) {
        onContextUpdate(response.data);
        // Extract macro chain from context
        if (response.data.blocks.custom?.macroChain?.scenes) {
          const macroChain = response.data.blocks.custom.macroChain;
          log.info('refetchContext: Found macro chain in context:', macroChain);
          log.info('refetchContext: Macro chain status from context:', macroChain.status);
          log.info('refetchContext: Setting chain status to:', macroChain.status || 'Generated');
          setChain(macroChain.scenes);
          setCurrentChainId(macroChain.chainId);
          setChainStatus(macroChain.status || 'Generated');
        } else {
          log.info('refetchContext: No macro chain found in context');
          log.info('refetchContext: Custom blocks:', response.data.blocks.custom);
          // Reset chain state if no macro chain found
          setChain([]);
          setCurrentChainId(null);
          setChainStatus('Generated');
        }
      }
    } catch (error) {
      log.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkChainStatus = async () => {
    if (!currentChainId) {
      log.info('checkChainStatus: No currentChainId, skipping');
      return;
    }
    
    log.info('checkChainStatus: Checking status for chain:', currentChainId, 'session:', sessionId);
    
    try {
      // Directly fetch the chain from the server to get the real status
      const response = await getJSON<{ ok: boolean; chain: MacroChain }>(`/api/chain/get?chainId=${currentChainId}&sessionId=${sessionId}`);
      log.info('checkChainStatus: Server response:', response);
      
      if (response.ok && response.chain) {
        log.info('checkChainStatus: Setting chain status to:', response.chain.status);
        setChainStatus(response.chain.status);
        
        // Update the context with the correct status
        if (onContextUpdate && context) {
          const updatedContext = {
            ...context,
            blocks: {
              ...context.blocks,
              custom: {
                ...context.blocks?.custom,
                macroChain: {
                  ...context.blocks?.custom?.macroChain,
                  status: response.chain.status
                }
              }
            }
          };
          log.info('checkChainStatus: Updating context with status:', response.chain.status);
          onContextUpdate(updatedContext);
          
          // Also update the server context to persist the status
          // CRITICAL: Use response.chain data, NOT old context data to avoid overwriting edits
          try {
            await postJSON('/api/context/append', {
              sessionId,
              blockType: 'custom',
              data: { 
                macroChain: response.chain  // Use fresh data from server, not stale context
              }
            });
            log.info('checkChainStatus: Updated server context with status:', response.chain.status);
          } catch (error) {
            log.error('checkChainStatus: Failed to update server context:', error);
          }
        }
      } else {
        log.info('checkChainStatus: Invalid response from server');
      }
    } catch (error) {
      log.error('Failed to check chain status:', error);
    }
  };

  const handleGenerateChain = async () => {
    if (!isBackgroundLocked || !isCharactersLocked || generatingChain) return;
    
    try {
      setGeneratingChain(true);
      setError(null);

      const res = await generateChain({ 
        sessionId, 
        requestId: crypto.randomUUID() 
      });
      
      // Store the full chain object, not just scenes
      setChain(res.data.scenes);
      setCurrentChainId(res.data.chainId); // Store the chain ID
      setChainStatus('Generated'); // Set the correct status
      
      // Update context with the generated chain
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'custom',
        data: { 
          macroChain: {
            chainId: res.data.chainId,
            scenes: res.data.scenes,
            status: res.data.status,
            version: res.data.version,
            lastUpdatedAt: res.data.lastUpdatedAt,
            meta: res.data.meta,
            createdAt: res.data.createdAt,
            updatedAt: res.data.updatedAt
          },
          macro_index: res.data.scenes.map(s => s.title)
        }
      });

      // Refresh context to show updated state
      await refetchContext();
      
      addToast({
        title: 'Macro Chain created',
        description: 'Successfully generated from locked Background',
        variant: 'success'
      });
    } catch (err: any) {
      log.error('Error generating chain:', err);
      const errorMessage = err?.status === 409 ? 'Background must be locked first' : 'Failed to create Macro Chain';
      setError(errorMessage);
      
      addToast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'error'
      });
    } finally {
      setGeneratingChain(false);
    }
  };

  const handleChainUpdate = async (updatedChain: MacroChain) => {
    log.info('handleChainUpdate called with status:', updatedChain.status);
    log.info('handleChainUpdate: Full updated chain:', updatedChain);
    
    // Set flag to prevent refetch during update
    setIsUpdating(true);
    
    try {
      setChain(updatedChain.scenes);
      setCurrentChainId(updatedChain.chainId);
      setChainStatus(updatedChain.status);
      
      // Update context with the updated chain
      if (onContextUpdate) {
        const updatedContext = {
          ...context,
          blocks: {
            ...context?.blocks,
            custom: {
              ...context?.blocks?.custom,
              macroChain: {
                chainId: updatedChain.chainId,
                scenes: updatedChain.scenes,
                status: updatedChain.status,
                version: updatedChain.version,
                lastUpdatedAt: updatedChain.lastUpdatedAt,
                meta: updatedChain.meta,
                createdAt: updatedChain.createdAt,
                updatedAt: updatedChain.updatedAt,
                lockedAt: updatedChain.lockedAt
              }
            }
          }
        };
        log.info('handleChainUpdate: Updating context with macro chain status:', updatedChain.status);
        log.info('handleChainUpdate: Full updated context macro chain:', updatedContext.blocks.custom.macroChain);
        onContextUpdate(updatedContext);
        
        // Also update the server context to persist the status
        try {
          await postJSON('/api/context/append', {
            sessionId,
            blockType: 'custom',
            data: { 
              macroChain: {
                chainId: updatedChain.chainId,
                scenes: updatedChain.scenes,
                status: updatedChain.status,
                version: updatedChain.version,
                lastUpdatedAt: updatedChain.lastUpdatedAt,
                meta: updatedChain.meta,
                createdAt: updatedChain.createdAt,
                updatedAt: updatedChain.updatedAt,
                lockedAt: updatedChain.lockedAt
              }
            }
          });
          log.info('handleChainUpdate: Updated server context with status:', updatedChain.status);
        } catch (error) {
          log.error('handleChainUpdate: Failed to update server context:', error);
        }
      } else {
        log.info('handleChainUpdate: No onContextUpdate callback available');
      }
    } finally {
      // Clear the updating flag after a short delay to allow the update to complete
      setTimeout(() => setIsUpdating(false), 500);
    }
  };

  const confirmRegenerate = () => {
    if (window.confirm('Are you sure you want to regenerate the Macro Chain? This will replace the current chain.')) {
      handleGenerateChain();
    }
  };

  // Compute state from fresh context
  const bg = context?.blocks?.background;
  const characters = context?.blocks?.characters;
  const hasBg = !!bg;
  const hasCharacters = !!characters && characters.list && characters.list.length > 0;
  const isBackgroundLocked = context?.locks?.background === true;
  const isCharactersLocked = context?.locks?.characters === true;
  const hasChain = chain.length > 0;
  
  // Version information
  const backgroundV = context?.meta?.backgroundV || 0;
  const charactersV = context?.meta?.charactersV || 0;
  const macroSnapshotV = context?.meta?.macroSnapshotV || 0;
  
  // Check if macro chain is stale
  const isMacroChainStale = hasChain && macroSnapshotV > 0 && 
    (macroSnapshotV !== (backgroundV * 1000 + charactersV));


  // No Background → Empty state + CTA
  if (!hasBg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Macro Chain</h2>
            <p className="text-gray-600">Plan your story sequence and scene flow.</p>
          </div>
        </div>
        
        <EmptyState
          title="No Background yet"
          description="Create and lock a Background to generate a Macro Chain."
          actionLabel="Go to Background"
          onAction={() => navigateToTab(sessionId, 'background')}
        />
      </div>
    );
  }

  // No Characters → Empty state + CTA
  if (!hasCharacters) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Macro Chain</h2>
            <p className="text-gray-600">Plan your story sequence and scene flow.</p>
          </div>
        </div>
        
        <EmptyState
          title="No Characters yet"
          description="Generate and lock Characters to create a Macro Chain."
          actionLabel="Go to Characters"
          onAction={() => navigateToTab(sessionId, 'characters')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Macro Chain</h2>
          <p className="text-gray-600">Plan your story sequence and scene flow.</p>
          {/* Version indicators */}
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline">Background v{backgroundV}</Badge>
            <Badge variant="outline">Characters v{charactersV}</Badge>
            {hasChain && (
              <Badge variant="outline">Macro v{Math.floor(macroSnapshotV / 1000)}.{macroSnapshotV % 1000}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasChain && (
            <Badge variant={isMacroChainStale ? "destructive" : "generated"}>
              {isMacroChainStale ? "Needs Regeneration" : "Generated"}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Stale context warning */}
        {isMacroChainStale && (
          <Alert variant="destructive">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Context has changed — regenerate Macro Chain.</h3>
                <p className="text-sm text-red-700 mt-1">
                  Background or Characters were updated. The current Macro Chain is based on outdated context.
                </p>
              </div>
            </div>
          </Alert>
        )}

        {/* Background not locked → Yellow banner + disabled button */}
        {!isBackgroundLocked && (
          <Alert variant="warning">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Background is not locked — lock it first.</h3>
              </div>
            </div>
          </Alert>
        )}

        {/* Characters not locked → Yellow banner + disabled button */}
        {!isCharactersLocked && (
          <Alert variant="warning">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Characters are not locked — lock them first.</h3>
              </div>
            </div>
          </Alert>
        )}

        {/* Create Macro Chain Button */}
        <Button 
          onClick={handleGenerateChain} 
          disabled={!isBackgroundLocked || !isCharactersLocked || generatingChain || hasChain}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingChain ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating…
            </>
          ) : hasChain ? (
            'Macro Chain Already Created'
          ) : (
            'Create Macro Chain'
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Uses the locked Background to produce 5–6 scenes (title + purpose-only objective).
        </p>

        {/* Macro Chain Board */}
        {hasChain ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Generated Macro Chain</h3>
              <Badge variant="generated">{chain.length} scenes</Badge>
            </div>
            <MacroChainBoard 
              chain={(() => {
                const chainObj = { 
                  chainId: currentChainId || 'current', 
                  scenes: chain,
                  status: chainStatus,
                  version: 1,
                  lastUpdatedAt: new Date().toISOString(),
                  meta: context?.blocks.custom?.macroChain?.meta // ✅ Include meta with isDraftIdeaBank
                };
                log.info('🔵 MacroChainPage: Passing chain to MacroChainBoard:', chainObj);
                log.info('🔵 MacroChainPage: meta value:', chainObj.meta);
                log.info('🔵 MacroChainPage: isDraftIdeaBank?', chainObj.meta?.isDraftIdeaBank);
                return chainObj;
              })()} 
              onUpdate={handleChainUpdate}
              loading={loading}
              sessionId={sessionId}
              onContextUpdate={onContextUpdate}
              background={context?.blocks.background}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Macro Chain Generated</h3>
              <p className="text-gray-600 mb-4">
                {isBackgroundLocked && isCharactersLocked
                  ? "Click 'Create Macro Chain' above to generate your story scenes."
                  : "Lock your background and characters first, then create your macro chain."
                }
              </p>
            </div>
          </div>
        )}

        {/* Regenerate Button */}
        {hasChain && (
          <Button variant="secondary" onClick={confirmRegenerate}>
            Regenerate
          </Button>
        )}
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
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
        </Alert>
      )}
    </div>
  );
}
