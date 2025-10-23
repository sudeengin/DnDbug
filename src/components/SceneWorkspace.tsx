import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import SceneDetailEditor from './SceneDetailEditor';
import SceneContextOut from './SceneContextOut';
import SceneHistory from './SceneHistory';
import { getJSON, postJSON, lockScene, unlockScene, generateDetail } from '../lib/api';
import type { MacroScene, SceneDetail, SessionContext, ContextOut } from '../types/macro-chain';
import { canLockScene, canGenerateNext, mergeLockedContexts, getSceneStatus, type SceneStatusStore } from '../lib/status';
import logger from '@/utils/logger';

const log = logger.scene;

interface SceneWorkspaceProps {
  sessionId: string;
  scene: MacroScene;
  total: number;
  sceneIndex: number;
  context: SessionContext | null;
  onDetailUpdate: (detail: SceneDetail) => void;
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  sceneDetails: SceneStatusStore;
  onSceneSelect: (index: number) => void;
  onMarkScenesNeedsRegen: (sceneIds: string[]) => void;
}

export default function SceneWorkspace({ 
  sessionId,
  scene, 
  total,
  sceneIndex, 
  context, 
  onDetailUpdate,
  activeSubTab,
  onSubTabChange,
  sceneDetails,
  onSceneSelect,
  onMarkScenesNeedsRegen
}: SceneWorkspaceProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SceneDetail | null>(null);
  const [contextOut, setContextOut] = useState<ContextOut | null>(null);
  const [history, setHistory] = useState<any[]>([]); // Placeholder for history
  const [showGmIntent, setShowGmIntent] = useState(false);
  const [gmIntent, setGmIntent] = useState('');

  useEffect(() => {
    // Load existing detail from sceneDetails prop
    log.info('SceneWorkspace useEffect:', {
      sceneId: scene.id,
      sceneDetailsKeys: Object.keys(sceneDetails),
      sceneDetails: sceneDetails
    });
    const existingDetail = sceneDetails[scene.id];
    if (existingDetail) {
      log.info('Found existing detail:', existingDetail);
      setDetail(existingDetail);
      setContextOut(existingDetail.contextOut || existingDetail.dynamicElements?.contextOut);
    } else {
      log.info('No existing detail found for scene:', scene.id);
      setDetail(null);
      setContextOut(null);
    }
  }, [scene.id, sceneDetails]);

  const handleGenerateDetail = async () => {
    if (!context) return;
    
    log.info('SceneWorkspace sessionId:', sessionId, 'Type:', typeof sessionId);
    
    try {
      setLoading(true);
      
      // Build effective context from previous scenes
      const sceneIds = Object.keys(sceneDetails);
      const effectiveContext = mergeLockedContexts(sceneIndex - 1, sceneDetails, sceneIds);
      
      log.info('Context building for scene generation:', {
        sceneIndex,
        sceneIds,
        sceneDetailsKeys: Object.keys(sceneDetails),
        effectiveContextKeys: Object.keys(effectiveContext),
        effectiveContext
      });
      
      const requestData = {
        sceneId: scene.id,
        macroScene: {
          id: scene.id,
          order: scene.order,
          title: scene.title,
          objective: scene.objective
        },
        effectiveContext,
        sessionId
      };
      
      log.info('Request data before API call:', {
        sessionId,
        sceneId: scene.id,
        hasSessionId: !!sessionId,
        requestDataKeys: Object.keys(requestData)
      });
      
      log.info('SceneWorkspace generateDetail request:', {
        sessionId,
        sceneId: scene.id,
        requestData
      });
      
      log.info('SessionId value:', sessionId, 'Type:', typeof sessionId);
      
      const response = await generateDetail(requestData);
      
      if (response.ok) {
        log.info('GenerateDetail response:', {
          responseData: response.data,
          responseDataSceneId: response.data.sceneId,
          sceneId: scene.id
        });
        setDetail(response.data);
        setContextOut(response.data.contextOut);
        onDetailUpdate(response.data);
      }
    } catch (error) {
      log.error('Failed to generate detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetail = async (updatedDetail: SceneDetail) => {
    try {
      setLoading(true);
      
      // Append to context
      if (updatedDetail.contextOut) {
        await postJSON('/api/context/append', {
          sessionId,
          blockType: 'story_facts',
          data: {
            keyEvents: updatedDetail.contextOut.keyEvents,
            revealedInfo: updatedDetail.contextOut.revealedInfo,
            stateChanges: updatedDetail.contextOut.stateChanges
          }
        });
      }
      
      setDetail(updatedDetail);
      onDetailUpdate(updatedDetail);
    } catch (error) {
      log.error('Failed to save detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    await handleGenerateDetail();
  };

  const handleLockScene = async () => {
    if (!detail) return;
    
    try {
      setLoading(true);
      log.info('Locking scene with:', { sessionId, sceneId: scene.id, detailSceneId: detail.sceneId });
      const response = await lockScene({ sessionId, sceneId: scene.id });
      if (response.ok) {
        setDetail(response.detail);
        onDetailUpdate(response.detail);
        // Show success toast
        log.info('Scene locked successfully');
        
        // After locking, show GM Intent panel if not the last scene
        if (scene.order < total) {
          setShowGmIntent(true);
        }
      }
    } catch (error) {
      log.error('Failed to lock scene:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockScene = async () => {
    if (!detail) return;
    
    const confirmed = window.confirm('Unlock this scene? Later scenes will require regeneration.');
    if (!confirmed) return;
    
    try {
      setLoading(true);
      const response = await unlockScene({ sessionId, sceneId: scene.id });
      if (response.ok) {
        setDetail(response.detail);
        onDetailUpdate(response.detail);
        onMarkScenesNeedsRegen(response.affectedScenes);
        log.info('Scene unlocked successfully, affected scenes:', response.affectedScenes);
      }
    } catch (error) {
      log.error('Failed to unlock scene:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNext = async () => {
    if (!detail || sceneIndex >= total - 1) return;
    
    try {
      setLoading(true);
      
      // Navigate to next scene
      onSceneSelect(sceneIndex + 1);
    } catch (error) {
      log.error('Failed to navigate to next scene:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNextScene = async () => {
    if (!gmIntent.trim()) {
      alert('Please describe what you want to see next.');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await postJSON<{ ok: boolean; scene: MacroScene; chain: any }>('/api/generate_next_scene', {
        sessionId,
        previousSceneId: scene.id,
        gmIntent: gmIntent.trim()
      });
      
      if (response.ok) {
        log.info('Next scene created:', response.scene);
        // Reset GM intent panel
        setShowGmIntent(false);
        setGmIntent('');
        
        // Trigger context refresh to update background scene count
        if (onContextUpdate) {
          try {
            const contextResponse = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${sessionId}`);
            if (contextResponse.ok && contextResponse.data) {
              onContextUpdate(contextResponse.data);
            }
          } catch (contextError) {
            log.error('Failed to refresh context after generating next scene:', contextError);
          }
        }
        
        // Navigate to the new scene (it will be at sceneIndex + 1)
        // Since the chain was updated, the parent will re-render with new scenes
        // We can navigate to the next index
        setTimeout(() => {
          onSceneSelect(sceneIndex + 1);
        }, 500);
      }
    } catch (error) {
      log.error('Failed to generate next scene:', error);
      alert('Failed to generate next scene. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = getSceneStatus(scene.id, sceneDetails);
  const canGenerate = currentStatus === 'Draft';
  const canLock = !!detail && ['Generated','Edited'].includes(detail.status);
  const canUnlock = detail?.status === 'Locked';
  const canGenerateNext = detail?.status === 'Locked' && scene.order < total;

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between pb-3 border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{scene.title}</h2>
          <Badge variant={detail?.status === 'Locked' ? 'default' : 'secondary'} className="text-xs">
            {currentStatus}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canGenerate && <Button onClick={handleGenerateDetail}>Generate Detail</Button>}
          {canLock && <Button onClick={handleLockScene}>Lock Scene</Button>}
          {canUnlock && <Button variant="secondary" onClick={handleUnlockScene}>Unlock Scene</Button>}
          {canGenerateNext && <Button onClick={handleGenerateNext}>Generate Next</Button>}
        </div>
      </header>

      <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="flex-1 flex flex-col">
        <TabsList className="h-auto p-0 bg-transparent border-b">
          <TabsTrigger value="detail" className="px-6 py-3">
            Detail
          </TabsTrigger>
          <TabsTrigger value="context" className="px-6 py-3">
            Context Out
          </TabsTrigger>
          <TabsTrigger value="history" className="px-6 py-3">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="flex-1 p-6">
          <SceneDetailEditor
            sessionId={sessionId}
            macroScene={scene}
            previousSceneDetails={Object.values(sceneDetails).filter(d => {
              // Only include scenes that come before the current scene in sequence
              const currentSceneOrder = scene.order;
              const detailSceneOrder = d.sequence;
              return detailSceneOrder < currentSceneOrder;
            })}
            onSceneDetailGenerated={onDetailUpdate}
            existingDetail={detail}
            readOnly={detail?.status === 'Locked'}
          />
        </TabsContent>

        <TabsContent value="context" className="flex-1 p-6">
          <SceneContextOut data={detail?.contextOut || contextOut} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 p-6">
          <SceneHistory sceneId={scene.id} />
        </TabsContent>
      </Tabs>

      {/* GM Intent Panel - shown after locking a scene */}
      {showGmIntent && detail?.status === 'Locked' && scene.order < total && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">What do you want to see next?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Describe what should happen in the next scene. Your input will guide the AI to create Scene {scene.order + 1}.
                </p>
              </div>
              <button
                onClick={() => setShowGmIntent(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GM Intent
              </label>
              <textarea
                value={gmIntent}
                onChange={(e) => setGmIntent(e.target.value)}
                placeholder="Example: The party discovers a hidden passageway that leads to the villain's lair. They encounter guards and must decide whether to fight or sneak past..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                This will create a new draft scene based on your intent.
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGmIntent(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateNextScene}
                  disabled={!gmIntent.trim()}
                >
                  Generate Next Scene
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
