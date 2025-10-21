import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import BackgroundPanel from '../BackgroundPanel';
import StoryBackgroundGenerator from '../StoryBackgroundGenerator';
import { getJSON, postJSON } from '../../lib/api';
import type { SessionContext, BackgroundData } from '../../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.background;

interface BackgroundPageProps {
  sessionId: string;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext | null) => void;
}

export default function BackgroundPage({ sessionId, context, onContextUpdate }: BackgroundPageProps) {
  const [loading, setLoading] = useState(false);
  const [background, setBackground] = useState<BackgroundData | null>(null);

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
        setBackground(response.data.blocks.background || null);
      }
    } catch (error) {
      log.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackgroundGenerated = async (newBackground: BackgroundData) => {
    try {
      setLoading(true);
      // Append background to context
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'background',
        data: newBackground
      });
      
      // Refresh context
      await fetchContext();
      setBackground(newBackground);
    } catch (error) {
      log.error('Failed to save background:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = async (locked: boolean) => {
    try {
      setLoading(true);
      await postJSON('/api/context/lock', {
        sessionId,
        blockType: 'background',
        locked
      });
      
      // Refresh context
      await fetchContext();
    } catch (error) {
      log.error('Failed to toggle lock:', error);
    } finally {
      setLoading(false);
    }
  };

  const isBackgroundLocked = context?.locks?.background || false;
  const hasBackground = !!context?.blocks.background;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Story Background</h2>
          <p className="text-gray-600">Generate and lock your story foundation.</p>
        </div>
        <div className="flex items-center space-x-2">
          {hasBackground && (
            <Badge variant={isBackgroundLocked ? "upToDate" : "needsRegen"}>
              {isBackgroundLocked ? "Locked" : "Unlocked"}
            </Badge>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {hasBackground && !isBackgroundLocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Background Not Locked</h3>
              <div className="mt-2 text-sm text-yellow-700">
                Lock your background to ensure consistent generation in the Macro Chain phase.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <StoryBackgroundGenerator 
          onBackgroundGenerated={handleBackgroundGenerated}
          onLockToggle={handleLockToggle}
          loading={loading}
          sessionId={sessionId}
          isLocked={isBackgroundLocked}
        />
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
