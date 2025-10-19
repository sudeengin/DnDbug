import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import InlineEdit from './InlineEdit';
import SceneDetailEditor from './SceneDetailEditor';
import type { MacroChain, MacroScene, UpdateChainRequest, SceneDetail, LockChainRequest, UnlockChainRequest } from '../types/macro-chain';
import { postJSON } from '../lib/api';

interface MacroChainBoardProps {
  chain: MacroChain;
  onUpdate: (updatedChain: MacroChain) => void;
  loading?: boolean;
  sessionId?: string | null;
  onContextUpdate?: (context: any) => void;
  background?: any;
}

// Sortable Scene Item Component
function SortableSceneItem({ 
  scene, 
  isEditing, 
  onTitleEdit, 
  onObjectiveEdit,
  onGenerateDetail,
  onDeleteScene,
  sceneDetails,
  scenes,
  isGenerating,
  isChainLocked
}: { 
  scene: MacroScene; 
  isEditing: boolean; 
  onTitleEdit: (sceneId: string, newTitle: string) => void;
  onObjectiveEdit: (sceneId: string, newObjective: string) => void;
  onGenerateDetail: (scene: MacroScene, previousDetails: SceneDetail[]) => void;
  onDeleteScene: (sceneId: string) => void;
  sceneDetails: SceneDetail[];
  scenes: MacroScene[];
  isGenerating: boolean;
  isChainLocked: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all ${
        isDragging ? 'shadow-lg transform rotate-2' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start space-x-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        {/* Scene Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">
              Scene {scene.order}
            </span>
            {isEditing && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                Drag to reorder
              </span>
            )}
            {isChainLocked && (
              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Chain Locked
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            {isEditing ? (
              <InlineEdit
                value={scene.title}
                onSave={(newValue) => onTitleEdit(scene.id, newValue)}
                placeholder="Enter scene title..."
                className="text-lg font-semibold"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {scene.title || 'Untitled Scene'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objective
            </label>
            {isEditing ? (
              <InlineEdit
                value={scene.objective}
                onSave={(newValue) => onObjectiveEdit(scene.id, newValue)}
                placeholder="Enter scene objective..."
                multiline={true}
                className="text-gray-700"
              />
            ) : (
              <div className="text-gray-700">
                {scene.objective || 'No objective set'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-200">
            {isEditing ? (
              <button
                onClick={() => onDeleteScene(scene.id)}
                className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Scene</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  // Get previous scene details for context
                  const previousDetails = sceneDetails.filter(detail => {
                    // Find the scene order for this detail
                    const sceneForDetail = scenes.find(s => s.id === detail.sceneId);
                    return sceneForDetail && sceneForDetail.order < scene.order;
                  });
                  onGenerateDetail(scene, previousDetails);
                }}
                disabled={isGenerating || isChainLocked}
                className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : isChainLocked ? (
                  <span>🔒 Chain Locked</span>
                ) : (
                  <span>🎭 Open Scene Editor</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MacroChainBoard({ chain, onUpdate, loading = false, sessionId, onContextUpdate, background }: MacroChainBoardProps) {
  const [scenes, setScenes] = useState<MacroScene[]>(chain.scenes);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedScene, setSelectedScene] = useState<MacroScene | null>(null);
  const [sceneDetails, setSceneDetails] = useState<SceneDetail[]>([]);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setScenes(chain.scenes);
  }, [chain.scenes]);

  useEffect(() => {
    // Reset scene details when chain changes
    setSceneDetails([]);
    setSelectedScene(null);
  }, [chain.chainId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = scenes.findIndex((scene) => scene.id === active.id);
      const newIndex = scenes.findIndex((scene) => scene.id === over?.id);

      const newScenes = arrayMove(scenes, oldIndex, newIndex);
      
      // Update order numbers
      const updatedScenes = newScenes.map((scene, index) => ({
        ...scene,
        order: index + 1,
      }));

      setScenes(updatedScenes);

      // Send update to server
      try {
        const updateRequest: UpdateChainRequest = {
          chainId: chain.chainId,
          edits: [{
            type: 'reorder',
            sceneId: active.id as string,
            newOrder: newIndex + 1,
          }],
        };

        await postJSON('/api/update_chain', updateRequest);
        
        // Update the chain with new order
        onUpdate({
          ...chain,
          scenes: updatedScenes,
        });
      } catch (error) {
        console.error('Failed to update scene order:', error);
        // Revert on error
        setScenes(chain.scenes);
      }
    }
  };

  const handleTitleEdit = async (sceneId: string, newTitle: string) => {
    const updatedScenes = scenes.map(scene =>
      scene.id === sceneId ? { ...scene, title: newTitle } : scene
    );
    setScenes(updatedScenes);

    try {
      const updateRequest: UpdateChainRequest = {
        chainId: chain.chainId,
        edits: [{
          type: 'edit_title',
          sceneId,
          newValue: newTitle,
        }],
      };

      await postJSON('/api/update_chain', updateRequest);
      
      onUpdate({
        ...chain,
        scenes: updatedScenes,
      });
    } catch (error) {
      console.error('Failed to update scene title:', error);
      // Revert on error
      setScenes(chain.scenes);
    }
  };

  const handleObjectiveEdit = async (sceneId: string, newObjective: string) => {
    const updatedScenes = scenes.map(scene =>
      scene.id === sceneId ? { ...scene, objective: newObjective } : scene
    );
    setScenes(updatedScenes);

    try {
      const updateRequest: UpdateChainRequest = {
        chainId: chain.chainId,
        edits: [{
          type: 'edit_objective',
          sceneId,
          newValue: newObjective,
        }],
      };

      await postJSON('/api/update_chain', updateRequest);
      
      onUpdate({
        ...chain,
        scenes: updatedScenes,
      });
    } catch (error) {
      console.error('Failed to update scene objective:', error);
      // Revert on error
      setScenes(chain.scenes);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) {
      return;
    }

    const updatedScenes = scenes.filter(scene => scene.id !== sceneId);
    // Reorder remaining scenes
    const reorderedScenes = updatedScenes.map((scene, index) => ({
      ...scene,
      order: index + 1,
    }));
    setScenes(reorderedScenes);

    try {
      const updateRequest: UpdateChainRequest = {
        chainId: chain.chainId,
        edits: [{
          type: 'delete_scene',
          sceneId,
        }],
      };

      await postJSON('/api/update_chain', updateRequest);
      
      onUpdate({
        ...chain,
        scenes: reorderedScenes,
      });
    } catch (error) {
      console.error('Failed to delete scene:', error);
      // Revert on error
      setScenes(chain.scenes);
    }
  };

  const handleAddScene = async () => {
    const newScene: MacroScene = {
      id: `scene-${Date.now()}`,
      order: scenes.length + 1,
      title: 'New Scene',
      objective: 'Enter scene objective...',
    };

    const updatedScenes = [...scenes, newScene];
    setScenes(updatedScenes);

    try {
      const updateRequest: UpdateChainRequest = {
        chainId: chain.chainId,
        edits: [{
          type: 'add_scene',
          sceneData: newScene,
        }],
      };

      await postJSON('/api/update_chain', updateRequest);
      
      onUpdate({
        ...chain,
        scenes: updatedScenes,
      });
    } catch (error) {
      console.error('Failed to add scene:', error);
      // Revert on error
      setScenes(chain.scenes);
    }
  };

  const handleGenerateDetail = async (scene: MacroScene, previousDetails: SceneDetail[]) => {
    try {
      setGeneratingSceneId(scene.id);
      
      // Create effective context from previous scenes
      const effectiveContext = createEffectiveContext(previousDetails);
      
      const request = {
        sceneId: scene.id,
        macroScene: scene,
        effectiveContext,
        sessionId
      };
      
      const response = await postJSON<{ ok: boolean; data: SceneDetail }>('/api/generate_detail', request);
      
      if (response.ok) {
        // Update scene details
        setSceneDetails(prev => {
          const existingIndex = prev.findIndex(detail => detail.sceneId === response.data.sceneId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = response.data;
            return updated;
          } else {
            return [...prev, response.data];
          }
        });
        
        // Append contextOut to session context
        if (sessionId && response.data.contextOut) {
          try {
            await postJSON('/api/context/append', {
              sessionId,
              blockType: 'story_facts',
              data: {
                fromScene: response.data.sceneId,
                sceneTitle: response.data.title,
                keyEvents: response.data.contextOut.keyEvents || [],
                revealedInfo: response.data.contextOut.revealedInfo || [],
                stateChanges: response.data.contextOut.stateChanges || {},
                npcRelationships: response.data.contextOut.npcRelationships || {},
                environmentalState: response.data.contextOut.environmentalState || {},
                plotThreads: response.data.contextOut.plotThreads || [],
                playerDecisions: response.data.contextOut.playerDecisions || [],
                timestamp: new Date().toISOString()
              }
            });
            
            // Refresh context panel
            if (onContextUpdate) {
              const contextResponse = await postJSON(`/api/context/get?sessionId=${sessionId}`);
              if (contextResponse.ok) {
                onContextUpdate(contextResponse.data);
              }
            }
          } catch (contextError) {
            console.error('Failed to append contextOut to session context:', contextError);
          }
        }
        
        // Show the generated detail
        setSelectedScene(scene);
      }
    } catch (error) {
      console.error('Error generating scene detail:', error);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const createEffectiveContext = (previousDetails: SceneDetail[]) => {
    const effectiveContext = {
      keyEvents: [],
      revealedInfo: [],
      stateChanges: {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    };

    // Process only the last 2 scenes to avoid context overflow
    const recentDetails = previousDetails.slice(-2);

    recentDetails.forEach(detail => {
      if (detail.contextOut) {
        // Merge key events
        if (detail.contextOut.keyEvents && Array.isArray(detail.contextOut.keyEvents)) {
          effectiveContext.keyEvents.push(...detail.contextOut.keyEvents);
        }

        // Merge revealed info
        if (detail.contextOut.revealedInfo && Array.isArray(detail.contextOut.revealedInfo)) {
          effectiveContext.revealedInfo.push(...detail.contextOut.revealedInfo);
        }

        // Merge state changes (later scenes override earlier ones)
        if (detail.contextOut.stateChanges && typeof detail.contextOut.stateChanges === 'object') {
          Object.assign(effectiveContext.stateChanges, detail.contextOut.stateChanges);
        }

        // Merge NPC relationships
        if (detail.contextOut.npcRelationships && typeof detail.contextOut.npcRelationships === 'object') {
          Object.assign(effectiveContext.npcRelationships, detail.contextOut.npcRelationships);
        }

        // Merge environmental state
        if (detail.contextOut.environmentalState && typeof detail.contextOut.environmentalState === 'object') {
          Object.assign(effectiveContext.environmentalState, detail.contextOut.environmentalState);
        }

        // Merge plot threads
        if (detail.contextOut.plotThreads && Array.isArray(detail.contextOut.plotThreads)) {
          effectiveContext.plotThreads.push(...detail.contextOut.plotThreads);
        }

        // Merge player decisions
        if (detail.contextOut.playerDecisions && Array.isArray(detail.contextOut.playerDecisions)) {
          effectiveContext.playerDecisions.push(...detail.contextOut.playerDecisions);
        }
      }
    });

    return effectiveContext;
  };

  const handleSceneDetailGenerated = (sceneDetail: SceneDetail) => {
    // Update or add scene detail
    setSceneDetails(prev => {
      const existingIndex = prev.findIndex(detail => detail.sceneId === sceneDetail.sceneId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = sceneDetail;
        return updated;
      } else {
        return [...prev, sceneDetail];
      }
    });
  };

  const handleLockChain = async () => {
    if (!sessionId) {
      console.error('No session ID available for locking chain');
      return;
    }

    try {
      setIsLocking(true);
      
      console.log('Attempting to lock chain:', {
        sessionId,
        chainId: chain.chainId
      });
      
      const request: LockChainRequest = {
        sessionId,
        chainId: chain.chainId
      };
      
      const response = await postJSON<{ ok: boolean; chain: MacroChain }>('/api/chain/lock', request);
      
      if (response.ok) {
        console.log('Chain locked successfully, updating with:', response.chain);
        onUpdate(response.chain);
      } else {
        console.error('Failed to lock chain');
      }
    } catch (error) {
      console.error('Error locking chain:', error);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockChain = async () => {
    if (!sessionId) {
      console.error('No session ID available for unlocking chain');
      return;
    }

    try {
      setIsUnlocking(true);
      
      console.log('Attempting to unlock chain:', {
        sessionId,
        chainId: chain.chainId
      });
      
      const request: UnlockChainRequest = {
        sessionId,
        chainId: chain.chainId
      };
      
      const response = await postJSON<{ ok: boolean; chain: MacroChain; affectedScenes: string[] }>('/api/chain/unlock', request);
      
      if (response.ok) {
        console.log('Chain unlocked successfully, updating with:', response.chain);
        onUpdate(response.chain);
        console.log('Affected scenes:', response.affectedScenes);
      } else {
        console.error('Failed to unlock chain');
      }
    } catch (error) {
      console.error('Error unlocking chain:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Macro Chain ({scenes.length} scenes)
          </h2>
          {background && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              BACKGROUND
            </span>
          )}
          <span className={`px-2 py-1 text-xs rounded ${
            chain.status === 'Locked' 
              ? 'bg-red-100 text-red-800' 
              : chain.status === 'Edited'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {chain.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing && (
            <button
              onClick={handleAddScene}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200"
              disabled={loading}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Scene
            </button>
          )}
          {chain.status === 'Locked' ? (
            <button
              onClick={handleUnlockChain}
              disabled={isUnlocking || loading}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnlocking ? (
                <>
                  <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Unlocking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock Chain
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleLockChain}
              disabled={isLocking || loading}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLocking ? (
                <>
                  <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Locking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Lock Chain
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditing
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            disabled={loading || chain.status === 'Locked'}
          >
            {isEditing ? '✓ Done Editing' : '✏️ Edit Chain'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        disabled={chain.status === 'Locked'}
      >
        <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {scenes.map((scene) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                isEditing={isEditing && chain.status !== 'Locked'}
                onTitleEdit={handleTitleEdit}
                onObjectiveEdit={handleObjectiveEdit}
                onGenerateDetail={handleGenerateDetail}
                onDeleteScene={handleDeleteScene}
                sceneDetails={sceneDetails}
                scenes={scenes}
                isGenerating={generatingSceneId === scene.id}
                isChainLocked={chain.status === 'Locked'}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!isEditing && (
        <div className="text-sm text-gray-500 text-center py-4">
          Click "Edit Chain" to reorder scenes, edit titles/objectives, and manage scenes
        </div>
      )}

      {/* Scene Detail Editor */}
      {selectedScene && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Scene Detail: {selectedScene.title}
            </h3>
            <button
              onClick={() => setSelectedScene(null)}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
          <SceneDetailEditor
            macroScene={selectedScene}
            previousSceneDetails={sceneDetails}
            onSceneDetailGenerated={handleSceneDetailGenerated}
            background={background}
          />
        </div>
      )}
    </div>
  );
}
