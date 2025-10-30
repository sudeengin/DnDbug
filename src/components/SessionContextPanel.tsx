import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getJSON, postJSON } from '../lib/api';
import type { SessionContext } from '../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.context;

interface SessionContextPanelProps {
  sessionId: string;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext | null) => void;
}

export default function SessionContextPanel({ sessionId, context, onContextUpdate }: SessionContextPanelProps) {
  const [loading, setLoading] = useState(false);
  const [includedBlocks, setIncludedBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sessionId && !context) {
      fetchContext();
    }
  }, [sessionId]);

  // Refresh context when component becomes visible (tab switch)
  useEffect(() => {
    if (sessionId && context) {
      // Always refresh when component mounts or context changes
      fetchContext();
    }
  }, [sessionId, context?.version]);

  const fetchContext = async () => {
    try {
      setLoading(true);
      const response = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${sessionId}`);
      if (response.ok && response.data) {
        onContextUpdate(response.data);
        // Initialize included blocks
        setIncludedBlocks(new Set(Object.keys(response.data.blocks)));
      }
    } catch (error) {
      log.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockInclusion = (blockType: string) => {
    const newIncluded = new Set(includedBlocks);
    if (newIncluded.has(blockType)) {
      newIncluded.delete(blockType);
    } else {
      newIncluded.add(blockType);
    }
    setIncludedBlocks(newIncluded);
  };

  const getBlockDisplayName = (blockType: string): string => {
    const names: Record<string, string> = {
      blueprint: 'Blueprint',
      player_hooks: 'Player Hooks',
      world_seeds: 'World Seeds',
      style_prefs: 'Style Preferences',
      custom: 'Custom Data',
      background: 'Background'
    };
    return names[blockType] || blockType;
  };

  const getBlockDescription = (blockType: string): string => {
    const descriptions: Record<string, string> = {
      blueprint: 'Core story concept and theme',
      player_hooks: 'Character motivations and ties',
      world_seeds: 'Factions, locations, and constraints',
      style_prefs: 'Language, tone, and pacing preferences',
      custom: 'Additional custom context data',
      background: 'Generated story background'
    };
    return descriptions[blockType] || 'Context block';
  };

  const getBlockIcon = (blockType: string) => {
    const icons: Record<string, string> = {
      blueprint: '🎯',
      player_hooks: '👥',
      world_seeds: '🌍',
      style_prefs: '🎨',
      custom: '📝',
      background: '📚'
    };
    return icons[blockType] || '📄';
  };

  const getBlockStatus = (blockType: string, blockData: any, locks: Record<string, boolean>) => {
    const isLocked = locks[blockType] === true;
    const blockExists = blockData && (
      Array.isArray(blockData) ? blockData.length > 0 : 
      typeof blockData === 'object' ? Object.keys(blockData).length > 0 : 
      !!blockData
    );

    if (isLocked) {
      return { status: 'locked', color: 'bg-green-500', tooltip: 'Locked (finalized)' };
    } else if (blockExists) {
      return { status: 'draft', color: 'bg-yellow-400', tooltip: 'Draft (not locked)' };
    } else {
      return { status: 'empty', color: 'bg-gray-300', tooltip: 'Empty (no data yet)' };
    }
  };

  if (!context) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Context Available</h3>
        <p className="text-gray-600">
          Generate content to build your session context.
        </p>
      </div>
    );
  }

  const blocks = context.blocks;
  const locks = context.locks || {};

  return (
    <div className="space-y-6">
      {/* Status Legend */}
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-blue-900">Status Indicators</h4>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchContext}
            disabled={loading}
            className="text-xs"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <div className="flex items-center space-x-4 text-xs text-blue-800">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span>Locked</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
            <span>Draft</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
            <span>Empty</span>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-1">Indicates status of each context block</p>
      </div>

      {/* Context Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Context Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Blocks:</span>
            <span className="ml-2 font-medium">{Object.keys(blocks).length}</span>
          </div>
          <div>
            <span className="text-gray-500">Locked:</span>
            <span className="ml-2 font-medium">{Object.values(locks).filter(Boolean).length}</span>
          </div>
          <div>
            <span className="text-gray-500">Included:</span>
            <span className="ml-2 font-medium">{includedBlocks.size}</span>
          </div>
          <div>
            <span className="text-gray-500">Version:</span>
            <span className="ml-2 font-medium">{context.version}</span>
          </div>
        </div>
      </div>

      {/* Context Blocks */}
      <div className="space-y-4">
        {Object.entries(blocks).map(([blockType, blockData]) => {
          const isIncluded = includedBlocks.has(blockType);
          const blockStatus = getBlockStatus(blockType, blockData, locks);
          
          return (
            <div key={blockType} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{getBlockIcon(blockType)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {getBlockDisplayName(blockType)}
                      </h4>
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${blockStatus.color}`}
                        title={blockStatus.tooltip}
                      />
                      {blockStatus.status === 'locked' && (
                        <Badge variant="upToDate" className="text-xs">Locked</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {getBlockDescription(blockType)}
                    </p>
                    <div className="text-xs text-gray-500">
                      {blockStatus.status === 'empty' ? 'No data yet' : 'Data available'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={isIncluded ? "primary" : "secondary"}
                    onClick={() => toggleBlockInclusion(blockType)}
                    disabled={!blockData}
                  >
                    {isIncluded ? 'Included' : 'Include'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(blocks).length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Context Blocks</h3>
          <p className="text-gray-600">
            Generate background and other content to build your session context.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading context...</span>
          </div>
        </div>
      )}
    </div>
  );
}
