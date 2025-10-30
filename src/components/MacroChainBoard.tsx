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
import { Button } from './ui/button';
import type { MacroChain, MacroScene, UpdateChainRequest } from '../types/macro-chain';
import { postJSON } from '../lib/api';
import logger from '@/utils/logger';

const log = logger.macroChain;

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
  onDeleteScene,
  onGenerateNextScene,
  scenes,
  isGenerating,
  isChainLocked,
  isSceneLocked,
  lockedMacroScenes
}: { 
  scene: MacroScene; 
  isEditing: boolean; 
  onTitleEdit: (sceneId: string, newTitle: string) => void;
  onObjectiveEdit: (sceneId: string, newObjective: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onGenerateNextScene: (scene: MacroScene) => void;
  scenes: MacroScene[];
  isGenerating: boolean;
  isChainLocked: boolean;
  isSceneLocked: boolean;
  lockedMacroScenes: Set<string>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  // Determine if this scene is the next one to lock (enforce Lock & Advance)
  // Find the highest order among locked scenes and add 1
  const lockedSceneOrders = Array.from(lockedMacroScenes).map(sceneId => {
    const lockedScene = scenes.find(s => s.id === sceneId);
    return lockedScene ? lockedScene.order : 0;
  });
  const maxLockedOrder = lockedSceneOrders.length > 0 ? Math.max(...lockedSceneOrders) : 0;
  const expectedNextOrder = maxLockedOrder + 1;
  const isNextSceneToLock = scene.order === expectedNextOrder;

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
              <Button
                onClick={() => onDeleteScene(scene.id)}
                variant="destructive"
                size="sm"
                className="w-full justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Scene</span>
              </Button>
            ) : isSceneLocked ? (
              <div className="space-y-2">
                <div className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Scene Locked</span>
                </div>
                <Button
                  onClick={() => onGenerateNextScene(scene)}
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Generate Next Scene</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => onGenerateNextScene(scene)}
                  disabled={isChainLocked || !isNextSceneToLock || isGenerating}
                  variant={isChainLocked || !isNextSceneToLock ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full justify-center"
                >
                  {isChainLocked ? (
                    <span>🔒 Chain Locked</span>
                  ) : isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-700"></div>
                      <span>Generating...</span>
                    </>
                  ) : isNextSceneToLock ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Generate Scene Details</span>
                    </>
                  ) : (
                    <span>⏳ Generate Scene {expectedNextOrder} first</span>
                  )}
                </Button>
                {!isChainLocked && (
                  <Button
                    onClick={() => onDeleteScene(scene.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Scene</span>
                  </Button>
                )}
              </div>
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
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [showGmIntent, setShowGmIntent] = useState(false);
  const [gmIntent, setGmIntent] = useState('');
  const [gmIntentDebounceTimer, setGmIntentDebounceTimer] = useState<number | null>(null);
  
  const handleGmIntentChange = (value: string) => {
    setGmIntent(value);
    
    // Clear previous timer
    if (gmIntentDebounceTimer) {
      clearTimeout(gmIntentDebounceTimer);
    }
    
    // Only log GM intent changes after user stops typing for 1 second
    const timer = setTimeout(() => {
      log.info('📝 GM Intent updated:', {
        length: value.length,
        preview: value.substring(0, 50) + (value.length > 50 ? '...' : '')
      });
    }, 1000);
    
    setGmIntentDebounceTimer(timer);
  };
  const [lastLockedScene, setLastLockedScene] = useState<MacroScene | null>(null);
  const [lockedMacroScenes, setLockedMacroScenes] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Always log when chain prop changes, regardless of edit state
    log.info('🔄 Chain prop changed:', {
      chainScenesCount: chain.scenes.length,
      chainScenes: chain.scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
      localScenesCount: scenes.length,
      localScenes: scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
      isEditing,
      willUpdate: !isEditing
    });

    // Only update scenes if not currently editing to preserve edit state
    // This prevents losing edit mode when chain updates happen
    if (!isEditing) {
      log.info('✅ Updating local scenes from chain prop');
      setScenes(chain.scenes);
    } else {
      log.warn('⚠️ NOT updating local scenes - currently in edit mode. Local and chain scenes may be out of sync!', {
        localScenesCount: scenes.length,
        chainScenesCount: chain.scenes.length,
        difference: scenes.length - chain.scenes.length
      });
    }
  }, [chain.scenes, isEditing]);

  useEffect(() => {
    // Reset edit mode when chain ID changes (different chain)
    setIsEditing(false);
  }, [chain.chainId]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (gmIntentDebounceTimer) {
        clearTimeout(gmIntentDebounceTimer);
      }
    };
  }, [gmIntentDebounceTimer]);

  // Add periodic check for scene count mismatches during editing
  useEffect(() => {
    if (isEditing && scenes.length !== chain.scenes.length) {
      log.warn('🚨 SCENE COUNT MISMATCH DETECTED DURING EDITING!', {
        localScenesCount: scenes.length,
        chainScenesCount: chain.scenes.length,
        difference: scenes.length - chain.scenes.length,
        localScenes: scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
        chainScenes: chain.scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
        timestamp: new Date().toISOString()
      });
    }
  }, [isEditing, scenes.length, chain.scenes.length]);

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
          sessionId,
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
        log.error('Failed to update scene order:', error);
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
        sessionId,
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
      log.error('Failed to update scene title:', error);
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
        sessionId,
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
      log.error('Failed to update scene objective:', error);
      // Revert on error
      setScenes(chain.scenes);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) {
      return;
    }

    log.info('🗑️ Deleting scene:', {
      sceneId,
      currentScenesCount: scenes.length,
      sceneToDelete: scenes.find(s => s.id === sceneId)
    });

    const updatedScenes = scenes.filter(scene => scene.id !== sceneId);
    // Reorder remaining scenes
    const reorderedScenes = updatedScenes.map((scene, index) => ({
      ...scene,
      order: index + 1,
    }));
    
    log.info('📊 Scene deletion result:', {
      originalCount: scenes.length,
      newCount: reorderedScenes.length,
      deletedCount: scenes.length - reorderedScenes.length,
      remainingScenes: reorderedScenes.map(s => ({ id: s.id, order: s.order, title: s.title }))
    });
    
    setScenes(reorderedScenes);
    
    // Remove from locked scenes if it was locked
    setLockedMacroScenes(prev => {
      const newSet = new Set(prev);
      newSet.delete(sceneId);
      return newSet;
    });
    
    // Update lastLockedScene if we deleted it
    if (lastLockedScene?.id === sceneId) {
      // Find the highest order locked scene from remaining scenes
      const remainingLockedScenes = reorderedScenes.filter(s => lockedMacroScenes.has(s.id) && s.id !== sceneId);
      if (remainingLockedScenes.length > 0) {
        const highestLocked = remainingLockedScenes.reduce((prev, current) => 
          (current.order > prev.order) ? current : prev
        );
        setLastLockedScene(highestLocked);
      } else {
        setLastLockedScene(null);
      }
    }

    try {
      const updateRequest: UpdateChainRequest = {
        chainId: chain.chainId,
        sessionId,
        edits: [{
          type: 'delete_scene',
          sceneId,
        }],
      };

      log.info('handleDeleteScene: Sending update request', updateRequest);
      const response = await postJSON<{ ok: boolean; data: { scenes: MacroScene[] } }>('/api/update_chain', updateRequest);
      
      log.info('✅ Scene deletion API response:', {
        response,
        updatedChainScenesCount: response?.data?.scenes?.length || 'unknown',
        localScenesCount: reorderedScenes.length,
        scenesMatch: (response?.data?.scenes?.length || 0) === reorderedScenes.length
      });
      
      onUpdate({
        ...chain,
        scenes: reorderedScenes,
      });
    } catch (error) {
      log.error('Failed to delete scene:', error);
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
        sessionId,
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
      log.error('Failed to add scene:', error);
      // Revert on error
      setScenes(chain.scenes);
    }
  };





  const handleGenerateSceneDetails = (scene: MacroScene) => {
    log.info('🎯 Generate Scene Details clicked for scene:', {
      sceneId: scene.id,
      sceneOrder: scene.order,
      sceneTitle: scene.title,
      isSceneLocked: lockedMacroScenes.has(scene.id)
    });
    
    // Set the scene and show GM intent modal
    // This will work for both locked and unlocked scenes
    setLastLockedScene(scene);
    setShowGmIntent(true);
  };


  const handleGenerateNextScene = async () => {
    if (!gmIntent.trim() || !lastLockedScene) {
      alert('Please describe what you want to see next.');
      return;
    }
    
    const isSceneAlreadyLocked = lockedMacroScenes.has(lastLockedScene.id);
    
    try {
      setGeneratingSceneId('generating_next');
      
      log.info('🎯 Generating scene details with:', {
        sessionId,
        sceneId: lastLockedScene.id,
        sceneOrder: lastLockedScene.order,
        gmIntentLength: gmIntent.trim().length,
        isSceneAlreadyLocked
      });
      
      let response;
      
      if (isSceneAlreadyLocked) {
        // Scene is already locked, generate next scene
        log.info('🎯 Scene already locked, generating next scene');
        response = await postJSON<{ ok: boolean; scene: MacroScene; chain: MacroChain }>('/api/generate_next_scene', {
          sessionId,
          previousSceneId: lastLockedScene.id,
          gmIntent: gmIntent.trim()
        });
      } else {
        // Scene is not locked, we need to lock it first, then generate next scene
        log.info('🎯 Scene not locked, locking it first then generating next scene');
        
        // First, lock the scene by generating its details
        const lockResponse = await postJSON<{ ok: boolean; scene: MacroScene; chain: MacroChain }>('/api/generate_next_scene', {
          sessionId,
          previousSceneId: lastLockedScene.id,
          gmIntent: gmIntent.trim()
        });
        
        if (lockResponse.ok) {
          // Update local state to reflect the locked scene
          setLockedMacroScenes(prev => {
            const newSet = new Set([...prev, lastLockedScene.id]);
            log.info('🔒 Scene locked after details generation:', Array.from(newSet));
            return newSet;
          });
          
          // Update scenes and chain
          setScenes(lockResponse.chain.scenes);
          onUpdate(lockResponse.chain);
          
          response = lockResponse;
        } else {
          throw new Error('Failed to lock scene');
        }
      }
      
      log.info('✅ Response received:', response);
      
      if (response.ok && response.chain) {
        log.info('✅ Scene generation successful:', response.scene);
        log.info('✅ Updated chain has', response.chain.scenes.length, 'scenes');
        
        // Update local state first
        setScenes(response.chain.scenes);
        
        // Update the chain
        onUpdate(response.chain);
        
        // Update locked scenes state
        setLockedMacroScenes(prev => {
          const newSet = new Set([...prev, response.scene.id]);
          log.info('🔒 Updated locked scenes after generation:', Array.from(newSet));
          return newSet;
        });
        
        // CRITICAL: Force a context update to ensure the backend has the latest data
        try {
          log.info('🔄 Force updating context after scene generation');
          await postJSON('/api/context/append', {
            sessionId,
            blockType: 'custom',
            data: {
              macroChain: response.chain
            }
          });
          log.info('🔄 Context updated successfully');
          
          // CRITICAL: Add a small delay to ensure the context is fully saved
          await new Promise(resolve => setTimeout(resolve, 100));
          log.info('🔄 Context save delay completed');
        } catch (error) {
          log.error('🔄 Failed to update context:', error);
          // Don't fail the entire operation if context update fails
          log.warn('🔄 Continuing despite context update failure');
        }
        
        
        // Reset GM intent panel
        setShowGmIntent(false);
        setGmIntent('');
        setLastLockedScene(response.scene); // Update to the new scene so we can continue the chain
        
        log.info('✅ UI updated successfully');
      } else {
        log.error('❌ Invalid response:', response);
        alert('Unexpected response from server. Please try again.');
      }
    } catch (error: any) {
      log.error('❌ Failed to generate next scene:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to generate next scene.';
      
      if (error?.status === 409) {
        errorMessage = 'The previous scene must be locked before generating the next scene. Please lock the scene first.';
      } else if (error?.status === 400) {
        errorMessage = 'Invalid request. Please check your input and try again.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred. Please try again in a moment.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const isDraftIdeaBank = (chain.meta as any)?.isDraftIdeaBank === true;

  // Debug logging
  log.info('MacroChainBoard Debug:', {
    chainStatus: chain.status,
    chainMeta: chain.meta,
    isDraftIdeaBank,
    hasMetaObject: !!chain.meta,
    metaKeys: chain.meta ? Object.keys(chain.meta) : []
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Macro Chain ({scenes.length} scenes)
            {isEditing && scenes.length !== chain.scenes.length && (
              <span className="ml-2 text-sm text-red-600 font-normal">
                (⚠️ Local: {scenes.length}, Chain: {chain.scenes.length})
              </span>
            )}
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
          <button
            onClick={() => {
              if (isEditing) {
                // When exiting edit mode, sync local scenes with chain scenes
                log.info('🔄 Exiting edit mode - syncing scenes:', {
                  localScenesCount: scenes.length,
                  chainScenesCount: chain.scenes.length,
                  localScenes: scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
                  chainScenes: chain.scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
                  syncNeeded: scenes.length !== chain.scenes.length
                });
                
                if (scenes.length !== chain.scenes.length) {
                  log.warn('🚨 SCENE COUNT MISMATCH DETECTED!', {
                    localCount: scenes.length,
                    chainCount: chain.scenes.length,
                    difference: scenes.length - chain.scenes.length,
                    action: 'Syncing local scenes to match chain'
                  });
                }
                
                setScenes(chain.scenes);
                log.info('✅ Local scenes synced with chain scenes');
              } else {
                log.info('🔄 Entering edit mode');
              }
              setIsEditing(!isEditing);
            }}
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

      {isDraftIdeaBank && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">💡 Iterative Scene Expansion</h3>
              <p className="text-sm text-blue-700">
                {chain.status === 'Locked' ? (
                  <>
                    This chain started as 6 draft scenes. Now that it's locked, go to the <strong>Scenes tab</strong> to generate and lock Scene 1. 
                    After locking each scene, you'll be asked <strong>"What do you want to see next?"</strong> to iteratively expand your story one scene at a time.
                  </>
                ) : (
                  <>
                    These 6 scenes are draft ideas to inspire your story. You can edit titles, objectives, delete scenes, or add new ones. 
                    Click <strong>"Generate Scene Details"</strong> on any scene to start expanding it with GM intent prompts.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
                onDeleteScene={handleDeleteScene}
                onGenerateNextScene={handleGenerateSceneDetails}
                scenes={scenes}
                isGenerating={generatingSceneId === scene.id}
                isChainLocked={chain.status === 'Locked'}
                isSceneLocked={lockedMacroScenes.has(scene.id)}
                lockedMacroScenes={lockedMacroScenes}
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


      {/* GM Intent Modal - shown after locking a scene */}
      {showGmIntent && lastLockedScene && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">What do you want to see next?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You've locked Scene {lastLockedScene.order}. Describe what should happen in the next scene.
                </p>
              </div>
              <Button
                onClick={() => setShowGmIntent(false)}
                variant="secondary"
                size="sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GM Intent
              </label>
              <textarea
                value={gmIntent}
                onChange={(e) => handleGmIntentChange(e.target.value)}
                placeholder="Example: The party discovers a hidden passageway that leads to the villain's lair. They encounter guards and must decide whether to fight or sneak past..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                This will create Scene {lastLockedScene.order + 1} based on your intent.
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowGmIntent(false)}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateNextScene}
                  disabled={!gmIntent.trim() || generatingSceneId === 'generating_next'}
                  variant="primary"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  {generatingSceneId === 'generating_next' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Next Scene</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
