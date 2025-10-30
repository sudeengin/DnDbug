import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import SceneDetailEditor from './SceneDetailEditor';
import SceneContextOut from './SceneContextOut';
import SceneHistory from './SceneHistory';
import { getJSON, postJSON, lockScene, unlockScene, generateDetail, generateNextScene } from '../lib/api';
import type { MacroScene, SceneDetail, SessionContext, ContextOut } from '../types/macro-chain';
import { canLockScene, canGenerateNext, mergeLockedContexts, getSceneStatus, type SceneStatusStore } from '../lib/status';

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
  const [gmIntent, setGmIntent] = useState('');
  const [showGmIntent, setShowGmIntent] = useState(false);

  useEffect(() => {
    // Load existing detail from sceneDetails prop
    console.log('SceneWorkspace useEffect:', {
      sceneId: scene.id,
      sceneDetailsKeys: Object.keys(sceneDetails),
      sceneDetails: sceneDetails
    });
    const existingDetail = sceneDetails[scene.id];
    if (existingDetail) {
      console.log('Found existing detail:', existingDetail);
      setDetail(existingDetail);
      setContextOut(existingDetail.contextOut || existingDetail.dynamicElements?.contextOut);
    } else {
      console.log('No existing detail found for scene:', scene.id);
      setDetail(null);
      setContextOut(null);
    }
  }, [scene.id, sceneDetails]);

  const handleGenerateDetail = async () => {
    if (!context) return;
    
    console.log('SceneWorkspace sessionId:', sessionId, 'Type:', typeof sessionId);
    
    try {
      setLoading(true);
      
      // Build effective context from previous scenes
      const sceneIds = Object.keys(sceneDetails);
      const effectiveContext = mergeLockedContexts(sceneIndex - 1, sceneDetails, sceneIds);
      
      console.log('Context building for scene generation:', {
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
      
      console.log('Request data before API call:', {
        sessionId,
        sceneId: scene.id,
        hasSessionId: !!sessionId,
        requestDataKeys: Object.keys(requestData)
      });
      
      console.log('SceneWorkspace generateDetail request:', {
        sessionId,
        sceneId: scene.id,
        requestData
      });
      
      console.log('SessionId value:', sessionId, 'Type:', typeof sessionId);
      
      const response = await generateDetail(requestData);
      
      if (response.ok) {
        console.log('GenerateDetail response:', {
          responseData: response.data,
          responseDataSceneId: response.data.sceneId,
          sceneId: scene.id
        });
        setDetail(response.data);
        setContextOut(response.data.contextOut);
        onDetailUpdate(response.data);
      }
    } catch (error) {
      console.error('Failed to generate detail:', error);
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
      console.error('Failed to save detail:', error);
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
      console.log('Locking scene with:', { sessionId, sceneId: scene.id, detailSceneId: detail.sceneId });
      const response = await lockScene({ sessionId, sceneId: scene.id });
      if (response.ok) {
        setDetail(response.detail);
        onDetailUpdate(response.detail);
        // Show GM Intent panel after successful lock
        setShowGmIntent(true);
        console.log('Scene locked successfully');
      }
    } catch (error) {
      console.error('Failed to lock scene:', error);
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
        console.log('Scene unlocked successfully, affected scenes:', response.affectedScenes);
      }
    } catch (error) {
      console.error('Failed to unlock scene:', error);
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
      console.error('Failed to navigate to next scene:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNextScene = async () => {
    if (!gmIntent.trim()) {
      console.error('Please describe what you want next.');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await generateNextScene({
        sessionId,
        previousSceneId: scene.id,
        gmIntent: gmIntent.trim()
      });
      
      if (response.ok) {
        console.log('Next scene created:', response.data);
        // Navigate to the new scene
        onSceneSelect(sceneIndex + 1);
        // Hide GM Intent panel
        setShowGmIntent(false);
        setGmIntent('');
      }
    } catch (error) {
      console.error('Failed to generate next scene:', error);
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
          {canGenerate && (
            <Button onClick={handleGenerateDetail} variant="primary">Generate Detail</Button>
          )}
          {canLock && (
            <Button onClick={handleLockScene} variant="primary">Lock Scene</Button>
          )}
          {canUnlock && (
            <Button variant="secondary" onClick={handleUnlockScene}>Unlock Scene</Button>
          )}
          {canGenerateNext && (
            <Button onClick={handleGenerateNext} variant="primary">Generate Next</Button>
          )}
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

      {/* GM Intent Panel - Show after scene is locked */}
      {showGmIntent && detail?.status === 'Locked' && (
        <div className="border-t bg-blue-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-500 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900 mb-2">What do you want to see next?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Describe what should happen in the next scene. The AI will use your intent along with the story context to generate the next scene.
                </p>
                <div className="space-y-4">
                  <Textarea
                    value={gmIntent}
                    onChange={(e) => setGmIntent(e.target.value)}
                    placeholder="e.g., The party discovers a hidden chamber with ancient artifacts, or The villain reveals their true identity..."
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={handleGenerateNextScene}
                      disabled={!gmIntent.trim() || loading}
                      variant="primary"
                    >
                      {loading ? 'Generating...' : 'Generate Next Scene'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowGmIntent(false);
                        setGmIntent('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
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
