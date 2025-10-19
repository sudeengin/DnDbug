import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import SceneList from '../SceneList';
import SceneWorkspace from '../SceneWorkspace';
import { getJSON } from '../../lib/api';
import { getSessionIdFromUrl, getSceneFromUrl } from '../../lib/router';
import type { SessionContext, MacroChain, SceneDetail } from '../../types/macro-chain';
import { type SceneStatusStore, getSceneStatus, canAccessScene, highestLockedIndex } from '../../lib/status';

interface ScenesPageProps {
  sessionId: string;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext | null) => void;
}

export default function ScenesPage({ sessionId, context, onContextUpdate }: ScenesPageProps) {
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<MacroChain | null>(null);
  const [selectedScene, setSelectedScene] = useState<number>(0);
  const [sceneDetails, setSceneDetails] = useState<SceneStatusStore>({});
  const [activeSubTab, setActiveSubTab] = useState('detail');

  // Get sessionId from URL if not provided
  const effectiveSessionId = sessionId || getSessionIdFromUrl() || '';

  useEffect(() => {
    if (effectiveSessionId && !context) {
      fetchContext();
    }
    
    // Get selected scene from URL
    const urlScene = getSceneFromUrl();
    if (urlScene !== null) {
      setSelectedScene(urlScene - 1); // Convert to 0-based index
    }
  }, [effectiveSessionId]);

  const fetchContext = async () => {
    try {
      setLoading(true);
      const response = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${effectiveSessionId}`);
      if (response.ok && response.data) {
        onContextUpdate(response.data);
        // Extract macro chain from context
        if (response.data.blocks.custom?.macroChain) {
          setChain(response.data.blocks.custom.macroChain);
        }
      }
    } catch (error) {
      console.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  // Also fetch context when it changes from parent
  useEffect(() => {
    if (context && context.blocks.custom?.macroChain) {
      setChain(context.blocks.custom.macroChain);
    }
  }, [context]);

  const handleSceneSelect = (sceneIndex: number) => {
    // Check if scene can be accessed
    const sceneIds = chain?.scenes.map(s => s.id) || [];
    if (!canAccessScene(sceneIndex, sceneDetails, sceneIds)) {
      console.warn(`Cannot access scene ${sceneIndex}: previous scene not locked`);
      return;
    }
    
    setSelectedScene(sceneIndex);
    // Update URL
    window.location.hash = `#tab=scenes&scene=${sceneIndex + 1}`;
  };

  const handleSceneDetailUpdate = (detail: SceneDetail) => {
    setSceneDetails(prev => ({
      ...prev,
      [detail.sceneId]: detail
    }));
  };

  const handleMarkScenesNeedsRegen = (sceneIds: string[]) => {
    setSceneDetails(prev => {
      const updated = { ...prev };
      sceneIds.forEach(sceneId => {
        if (updated[sceneId]) {
          updated[sceneId] = {
            ...updated[sceneId],
            status: 'NeedsRegen',
            lastUpdatedAt: new Date().toISOString(),
            version: (updated[sceneId].version || 0) + 1
          };
        }
      });
      return updated;
    });
  };

  const getSceneStatusForIndex = (sceneIndex: number): 'Draft' | 'Generated' | 'Edited' | 'Locked' | 'NeedsRegen' => {
    const scene = chain?.scenes[sceneIndex];
    if (!scene) return 'Draft';
    return getSceneStatus(scene.id, sceneDetails);
  };

  const hasChain = !!chain;
  const scenes = chain?.scenes || [];
  const sceneIds = scenes.map(s => s.id);
  const highestLocked = highestLockedIndex(sceneDetails, sceneIds);
  
  // Version information
  const backgroundV = context?.meta?.backgroundV || 0;
  const charactersV = context?.meta?.charactersV || 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? -1 : 1;
        const newIndex = Math.max(0, Math.min(scenes.length - 1, selectedScene + direction));
        if (canAccessScene(newIndex, sceneDetails, sceneIds)) {
          handleSceneSelect(newIndex);
        }
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        // Handle lock action - this will be implemented in SceneWorkspace
        const currentScene = scenes[selectedScene];
        if (currentScene) {
          // Trigger lock action on current scene
          console.log('Lock action triggered for scene:', currentScene.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScene, scenes, sceneDetails, sceneIds]);

  return (
    <div className="flex h-full flex-col">
      {/* Header with version indicators */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Scene Details</h2>
            <p className="text-sm text-gray-600">Generate and manage individual scene content</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Background v{backgroundV}</Badge>
            <Badge variant="outline">Characters v{charactersV}</Badge>
          </div>
        </div>
      </div>
      
      <div className="flex h-full">
        {/* Left Pane - Scene List */}
        <aside className="w-80 border-r bg-white">
        <SceneList
          items={scenes}
          statusMap={sceneDetails}
          selected={selectedScene}
          onSelect={handleSceneSelect}
          highestLockedIndex={highestLocked}
          sessionId={effectiveSessionId}
          onGenerateFirst={async () => {
            // Handle first scene generation
            if (scenes.length > 0) {
              handleSceneSelect(0);
            }
          }}
        />
      </aside>

      {/* Right Pane - Scene Workspace */}
      <div className="flex-1 flex flex-col">
        {scenes.length > 0 && selectedScene < scenes.length ? (
          <SceneWorkspace
            sessionId={effectiveSessionId}
            scene={scenes[selectedScene]}
            total={scenes.length}
            sceneIndex={selectedScene}
            context={context}
            onDetailUpdate={handleSceneDetailUpdate}
            activeSubTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
            sceneDetails={sceneDetails}
            onSceneSelect={handleSceneSelect}
            onMarkScenesNeedsRegen={handleMarkScenesNeedsRegen}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scene Selected</h3>
              <p className="text-gray-600">
                Select a scene from the list to begin detailing.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}

