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

  useEffect(() => {
    // Load existing detail from sceneDetails prop
    const existingDetail = sceneDetails[scene.id];
    if (existingDetail) {
      setDetail(existingDetail);
      setContextOut(existingDetail.contextOut);
    } else {
      setDetail(null);
      setContextOut(null);
    }
  }, [scene.id, sceneDetails]);

  const handleGenerateDetail = async () => {
    if (!context) return;
    
    try {
      setLoading(true);
      
      // Build effective context from previous scenes
      const sceneIds = Object.keys(sceneDetails);
      const effectiveContext = mergeLockedContexts(sceneIndex - 1, sceneDetails, sceneIds);
      
      const response = await generateDetail({
        sceneId: scene.id,
        macroScene: {
          id: scene.id,
          order: scene.order,
          title: scene.title,
          objective: scene.objective
        },
        effectiveContext,
        sessionId
      });
      
      if (response.ok) {
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
      const response = await lockScene({ sessionId, sceneId: detail.sceneId });
      if (response.ok) {
        setDetail(response.detail);
        onDetailUpdate(response.detail);
        // Show success toast
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
      const response = await unlockScene({ sessionId, sceneId: detail.sceneId });
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
            macroScene={scene}
            previousSceneDetails={[]} // TODO: Get actual previous scene details
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
