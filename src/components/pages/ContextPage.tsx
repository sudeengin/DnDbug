import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import SessionContextPanel from '../SessionContextPanel';
import { getJSON } from '../../lib/api';
import type { SessionContext } from '../../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.context;

interface ContextPageProps {
  sessionId: string;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext | null) => void;
}

export default function ContextPage({ sessionId, context, onContextUpdate }: ContextPageProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId && !context) {
      fetchContext();
    }
  }, [sessionId]);

  const fetchContext = async () => {
    try {
      setLoading(true);
      const response = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${sessionId}`);
      if (response.ok && response.data) {
        onContextUpdate(response.data);
      }
    } catch (error) {
      log.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchContext();
  };

  const getContextStats = () => {
    if (!context) return { blocks: 0, locked: 0 };
    
    const blocks = Object.keys(context.blocks).length;
    const locked = Object.values(context.locks || {}).filter(Boolean).length;
    
    return { blocks, locked };
  };

  const stats = getContextStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Context</h2>
          <p className="text-gray-600">View and manage your session's context blocks and memory.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{stats.blocks} blocks</Badge>
            <Badge variant="upToDate">{stats.locked} locked</Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Context Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Context Blocks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.blocks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Locked Blocks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.locked}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Version</p>
              <p className="text-2xl font-semibold text-gray-900">{context?.version || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Context Blocks</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your session's context blocks and their inclusion in generation.
          </p>
        </div>
        <div className="p-6">
          <SessionContextPanel 
            sessionId={sessionId}
            context={context}
            onContextUpdate={onContextUpdate}
          />
        </div>
      </div>

      {/* Context Information */}
      {context && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Context Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Session ID</label>
              <p className="text-sm text-gray-900 font-mono">{context.sessionId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Version</label>
              <p className="text-sm text-gray-900">{context.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-sm text-gray-900">{new Date(context.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Locks</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(context.locks || {}).map(([key, locked]) => (
                  <Badge 
                    key={key} 
                    variant={locked ? "upToDate" : "outline"}
                    className="text-xs"
                  >
                    {key}: {locked ? 'locked' : 'unlocked'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
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
