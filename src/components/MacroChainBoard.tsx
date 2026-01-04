import { useState, useEffect, useRef } from 'react';
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
import { Trash2, Plus, Edit, Check, Lock, RotateCcw, Unlock } from 'lucide-react';
import InlineEdit from './InlineEdit';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import { StyledTextarea } from './ui/styled-textarea';
import { theme } from '../lib/theme';
import { cn } from '../lib/utils';
import type { MacroChain, MacroScene, UpdateChainRequest } from '../types/macro-chain';
import { postJSON, getJSON } from '../lib/api';
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
  onEditScene,
  onLockScene,
  onUnlockScene,
  onRegenerateScene,
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
  onEditScene: (sceneId: string) => void;
  onLockScene: (scene: MacroScene) => void;
  onUnlockScene: (scene: MacroScene) => void;
  onRegenerateScene: (scene: MacroScene) => void;
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
      className={cn(
        theme.card.rounded,
        "border p-4 shadow-sm transition-all",
        isDragging ? 'shadow-lg transform rotate-2' : 'hover:shadow-md'
      )}
    >
      <div className="flex items-start space-x-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn("flex-shrink-0 w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing", theme.text.muted, "hover:text-gray-300")}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        {/* Scene Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center space-x-2">
            <span className={cn("text-sm font-medium", theme.text.muted)}>
              Scene {scene.order}
            </span>
            {isChainLocked && (
              <Badge variant="locked" className="text-xs px-2 py-1 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Chain Locked
              </Badge>
            )}
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-1", theme.text.secondary)}>
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
              <div className={cn("text-lg font-semibold", theme.text.primary)}>
                {scene.title || 'Untitled Scene'}
              </div>
            )}
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-1", theme.text.secondary)}>
              Objective
            </label>
            {isEditing ? (
              <InlineEdit
                value={scene.objective}
                onSave={(newValue) => onObjectiveEdit(scene.id, newValue)}
                placeholder="Enter scene objective..."
                multiline={true}
              />
            ) : (
              <div className={theme.text.secondary}>
                {scene.objective || 'No objective set'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={cn("pt-3 border-t flex items-center justify-end gap-2", theme.divider.default)}>
            {isEditing ? (
              <>
                <Button
                  onClick={() => onEditScene(scene.id)}
                  variant="primary"
                  size="sm"
                  className="h-8 px-2"
                  title="Done Editing"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => onDeleteScene(scene.id)}
                  variant="destructive"
                  size="sm"
                  className="h-8 px-2"
                  title="Delete Scene"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : isSceneLocked ? (
              <>
                <Badge variant="locked" className="px-2 py-1 text-xs flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Scene Locked</span>
                </Badge>
                <Button
                  onClick={() => onUnlockScene(scene)}
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2"
                  title="Unlock Scene"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() => onGenerateNextScene(scene)}
                  variant="primary"
                  size="sm"
                  className="h-8 px-2"
                  title="Generate Next Scene"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </>
            ) : (
              <>
                {!isChainLocked && (
                  <Button
                    onClick={() => onEditScene(scene.id)}
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2"
                    title="Edit Scene"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={() => onRegenerateScene(scene)}
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2"
                  title="Regenerate Scene"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </Button>
                {!isSceneLocked && (
                  <Button
                    onClick={() => onLockScene(scene)}
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2"
                    title="Lock Scene"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {isSceneLocked && (
                  <Button
                    onClick={() => onGenerateNextScene(scene)}
                    disabled={isGenerating}
                    variant="primary"
                    size="sm"
                    className="h-8 px-2"
                    title="Generate Next Scene"
                  >
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!isChainLocked && (
                  <Button
                    onClick={() => onDeleteScene(scene.id)}
                    variant="destructive"
                    size="sm"
                    className="h-8 px-2"
                    title="Delete Scene"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MacroChainBoard({ chain, onUpdate, loading = false, sessionId, onContextUpdate, background }: MacroChainBoardProps) {
  const [scenes, setScenes] = useState<MacroScene[]>(chain.scenes);
  const [editingSceneIds, setEditingSceneIds] = useState<Set<string>>(new Set());
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
  const gmIntentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Always update scenes from chain prop
    log.info('🔄 Chain prop changed:', {
      chainScenesCount: chain.scenes.length,
      chainScenes: chain.scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
      localScenesCount: scenes.length,
      localScenes: scenes.map(s => ({ id: s.id, order: s.order, title: s.title })),
      editingSceneIds: Array.from(editingSceneIds)
    });

    log.info('✅ Updating local scenes from chain prop');
    setScenes(chain.scenes);
  }, [chain.scenes]);

  useEffect(() => {
    // Reset edit mode when chain ID changes (different chain)
    setEditingSceneIds(new Set());
  }, [chain.chainId]);

  // Locked macro chain scenes are tracked in local state and persisted to localStorage
  // Load locked scenes from localStorage on mount
  useEffect(() => {
    if (sessionId && chain.chainId) {
      const storageKey = `macroChain_lockedScenes_${sessionId}_${chain.chainId}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const lockedIds = JSON.parse(stored);
          if (Array.isArray(lockedIds) && lockedIds.length > 0) {
            setLockedMacroScenes(new Set(lockedIds));
            log.info('🔒 Loaded locked scenes from localStorage:', { sceneIds: lockedIds });
          }
        }
      } catch (error) {
        log.error('Failed to load locked scenes from localStorage:', error);
      }
    }
  }, [sessionId, chain.chainId]);

  // Persist locked scenes to localStorage whenever they change
  useEffect(() => {
    if (sessionId && chain.chainId) {
      const storageKey = `macroChain_lockedScenes_${sessionId}_${chain.chainId}`;
      try {
        const lockedArray = Array.from(lockedMacroScenes);
        if (lockedArray.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(lockedArray));
          log.info('💾 Saved locked scenes to localStorage:', { sceneIds: lockedArray });
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        log.error('Failed to save locked scenes to localStorage:', error);
      }
    }
  }, [lockedMacroScenes, sessionId, chain.chainId]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (showGmIntent && gmIntentTextareaRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        gmIntentTextareaRef.current?.focus();
      }, 100);
    }
  }, [showGmIntent]);

  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (gmIntentDebounceTimer) {
        clearTimeout(gmIntentDebounceTimer);
      }
    };
  }, [gmIntentDebounceTimer]);

  const handleEditScene = (sceneId: string) => {
    setEditingSceneIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

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





  const handleGenerateSceneDetails = async (scene: MacroScene) => {
    log.info('🎯 Generate Scene Details clicked for scene:', {
      sceneId: scene.id,
      sceneOrder: scene.order,
      sceneTitle: scene.title,
      isSceneLocked: lockedMacroScenes.has(scene.id)
    });
    
    // Only show modal if scene is locked (for generating next scene)
    if (!lockedMacroScenes.has(scene.id)) {
      // For unlocked scenes, this button should generate scene details
      // But that's handled in the Scenes tab, so we'll just show a message
      alert('Please generate scene details in the Scenes tab first, then lock the scene to generate the next scene.');
      return;
    }
    
    // Find the scene in the current scenes array to ensure we have a fresh reference
    const currentScene = scenes.find(s => s.id === scene.id) || scene;
    
    // Set the scene and show GM intent modal for generating next scene
    setLastLockedScene(currentScene);
    setGmIntent(''); // Clear any previous intent
    setShowGmIntent(true);
  };


  const handleRegenerateSceneClick = async (scene: MacroScene) => {
    // Find the scene in the current scenes array to ensure we have a fresh reference
    const currentScene = scenes.find(s => s.id === scene.id) || scene;
    
    // Set the scene and show GM intent modal for regeneration
    setLastLockedScene(currentScene);
    setGmIntent(''); // Clear any previous intent
    setShowGmIntent(true);
  };

  const handleLockScene = async (scene: MacroScene) => {
    // Lock scene is just a UI state - track which macro chain scenes are locked
    setLockedMacroScenes(prev => {
      const newSet = new Set([...prev, scene.id]);
      log.info('🔒 Macro chain scene locked:', { sceneId: scene.id, lockedScenes: Array.from(newSet) });
      return newSet;
    });
  };

  const handleUnlockScene = async (scene: MacroScene) => {
    // Unlock scene - remove from locked set
    setLockedMacroScenes(prev => {
      const newSet = new Set(prev);
      newSet.delete(scene.id);
      log.info('🔓 Macro chain scene unlocked:', { sceneId: scene.id, lockedScenes: Array.from(newSet) });
      return newSet;
    });
  };

  const handleLockChain = async () => {
    if (!sessionId || !chain.chainId) {
      alert('Session ID or Chain ID is missing.');
      return;
    }

    try {
      log.info('🔒 Locking macro chain:', { chainId: chain.chainId, sessionId });
      
      const response = await postJSON<{ ok: boolean; chain: MacroChain }>('/api/chain/lock', {
        sessionId,
        chainId: chain.chainId
      });

      if (response.ok && response.chain) {
        log.info('✅ Macro chain locked successfully:', response.chain);
        onUpdate(response.chain);
        
        // Update context if onContextUpdate is provided
        if (onContextUpdate) {
          try {
            const contextResponse = await getJSON<{ ok: boolean; data: any }>(`/api/context/get?sessionId=${sessionId}`);
            if (contextResponse.ok && contextResponse.data) {
              onContextUpdate(contextResponse.data);
            }
          } catch (error) {
            log.error('Failed to refresh context after locking chain:', error);
          }
        }
      } else {
        log.error('❌ Failed to lock chain:', response);
        alert('Failed to lock macro chain. Please try again.');
      }
    } catch (error: any) {
      log.error('❌ Error locking macro chain:', error);
      alert(error?.message || 'Failed to lock macro chain. Please try again.');
    }
  };

  const handleRegenerateScene = async () => {
    if (!gmIntent.trim() || !lastLockedScene || !sessionId) {
      alert('Please describe what you want to regenerate.');
      return;
    }

    try {
      setGeneratingSceneId('regenerating_scene');
      log.info('🔄 Regenerating macro chain scene with GM intent:', {
        sceneId: lastLockedScene.id,
        gmIntentLength: gmIntent.trim().length
      });

      // Call the regenerate macro chain scene API
      const response = await postJSON<{ ok: boolean; data: { scene: MacroScene; chain: MacroChain } }>('/api/macro_chain/regenerate_scene', {
        sessionId,
        chainId: chain.chainId,
        sceneId: lastLockedScene.id,
        gmIntent: gmIntent.trim(),
        lockedSceneIds: Array.from(lockedMacroScenes)
      });

      if (response.ok && response.data) {
        log.info('✅ Scene regenerated successfully:', {
          sceneId: response.data.scene.id,
          newTitle: response.data.scene.title
        });

        // Update local state
        setScenes(response.data.chain.scenes);
        
        // Update the chain
        onUpdate(response.data.chain);

        // Close modal
        setShowGmIntent(false);
        setGmIntent('');
        log.info('✅ Macro chain scene regenerated successfully');
      } else {
        log.error('❌ Invalid response:', response);
        alert('Unexpected response from server. Please try again.');
      }
    } catch (error: any) {
      log.error('❌ Failed to regenerate scene:', error);
      alert(error?.message || 'Failed to regenerate scene. Please try again.');
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const handleGenerateNextScene = async () => {
    if (!gmIntent.trim() || !lastLockedScene) {
      alert('Please describe what you want to see next.');
      return;
    }
    
    const isSceneAlreadyLocked = lockedMacroScenes.has(lastLockedScene.id);
    
    if (!isSceneAlreadyLocked) {
      alert('The scene must be locked before generating the next scene.');
      return;
    }
    
    try {
      setGeneratingSceneId('generating_next');
      
      log.info('🎯 Generating next scene:', {
        sessionId,
        sceneId: lastLockedScene.id,
        sceneOrder: lastLockedScene.order,
        gmIntentLength: gmIntent.trim().length
      });
      
      const response = await postJSON<{ ok: boolean; data: { scene: MacroScene; chain: MacroChain } }>('/api/generate_next_scene', {
        sessionId,
        chainId: chain.chainId,
        previousSceneId: lastLockedScene.id,
        gmIntent: gmIntent.trim(),
        lockedSceneIds: Array.from(lockedMacroScenes)
      });
      
      log.info('✅ Response received:', response);
      
      if (response.ok && response.data) {
        log.info('✅ Scene generation successful:', response.data.scene);
        log.info('✅ Updated chain has', response.data.chain.scenes.length, 'scenes');
        
        // Update local state first
        setScenes(response.data.chain.scenes);
        
        // Update the chain
        onUpdate(response.data.chain);
        
        // Update locked scenes state
        setLockedMacroScenes(prev => {
          const newSet = new Set([...prev, response.data.scene.id]);
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
              macroChain: response.data.chain
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
        setLastLockedScene(response.data.scene); // Update to the new scene so we can continue the chain
        
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
          <h2 className={cn("text-xl font-semibold", theme.text.primary)}>
            Macro Chain ({scenes.length} scenes)
          </h2>
          {background && (
            <Badge variant="default" className="px-2 py-1 text-xs">
              BACKGROUND
            </Badge>
          )}
          <Badge 
            variant={chain.status === 'Locked' ? 'locked' : chain.status === 'Edited' ? 'edited' : 'generated'}
            className="px-2 py-1 text-xs"
          >
            {chain.status}
          </Badge>
        </div>
      </div>

      {isDraftIdeaBank && (
        <Alert variant="default">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-1">💡 Iterative Scene Expansion</h3>
              <p className="text-sm">
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
        </Alert>
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
                isEditing={editingSceneIds.has(scene.id) && chain.status !== 'Locked'}
                onTitleEdit={handleTitleEdit}
                onObjectiveEdit={handleObjectiveEdit}
                onDeleteScene={handleDeleteScene}
                onGenerateNextScene={handleGenerateSceneDetails}
                onEditScene={handleEditScene}
                onLockScene={handleLockScene}
                onUnlockScene={handleUnlockScene}
                onRegenerateScene={handleRegenerateSceneClick}
                scenes={scenes}
                isGenerating={generatingSceneId === scene.id || generatingSceneId === 'regenerating_scene' || generatingSceneId === 'locking_scene'}
                isChainLocked={chain.status === 'Locked'}
                isSceneLocked={lockedMacroScenes.has(scene.id)}
                lockedMacroScenes={lockedMacroScenes}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Lock Chain Button - shown when all scenes are locked and chain is not locked */}
      {!chain.status || chain.status !== 'Locked' ? (
        (() => {
          const allScenesLocked = scenes.length > 0 && scenes.every(s => lockedMacroScenes.has(s.id));
          return allScenesLocked ? (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleLockChain}
                variant="primary"
                size="sm"
                className="flex items-center space-x-2"
                disabled={!sessionId || chain.status === 'Locked'}
              >
                <Lock className="h-4 w-4" />
                <span>Lock Macro Chain</span>
              </Button>
            </div>
          ) : null;
        })()
      ) : null}

      {/* GM Intent Modal - shown for generating next scene (locked scenes) or regenerating scene */}
      {showGmIntent && lastLockedScene && (
        <div className={theme.modal.overlay}>
          <div className={theme.modal.containerLarge}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={cn("text-lg font-semibold", theme.text.primary)}>
                  {lockedMacroScenes.has(lastLockedScene.id) 
                    ? 'What do you want to see next?'
                    : 'Regenerate Scene'}
                </h3>
                <p className={cn("text-sm mt-1", theme.text.secondary)}>
                  {lockedMacroScenes.has(lastLockedScene.id)
                    ? `You've locked Scene ${lastLockedScene.order}. Describe what should happen in the next scene.`
                    : `Regenerate Scene ${lastLockedScene.order} with your GM intent.`}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowGmIntent(false);
                  setGmIntent('');
                }}
                variant="secondary"
                size="sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="mb-4">
              <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                {lockedMacroScenes.has(lastLockedScene.id) 
                  ? 'GM Intent for Next Scene'
                  : 'GM Intent for Regeneration'}
              </label>
              <StyledTextarea
                ref={gmIntentTextareaRef}
                value={gmIntent}
                onChange={(e) => handleGmIntentChange(e.target.value)}
                placeholder={
                  lockedMacroScenes.has(lastLockedScene.id)
                    ? "Example: The party discovers a hidden passageway that leads to the villain's lair. They encounter guards and must decide whether to fight or sneak past..."
                    : "Describe how you want to modify or improve this scene..."
                }
                className="w-full h-32 resize-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between">
              <p className={cn("text-xs", theme.text.muted)}>
                {lockedMacroScenes.has(lastLockedScene.id) 
                  ? `This will create Scene ${lastLockedScene.order + 1} based on your intent.`
                  : 'This will regenerate the scene details based on your intent.'}
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setShowGmIntent(false);
                    setGmIntent('');
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                {lockedMacroScenes.has(lastLockedScene.id) ? (
                  // Scene is locked - show Generate Next Scene button
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
                ) : (
                  // Scene is not locked - show Regenerate button
                  <Button
                    onClick={handleRegenerateScene}
                    disabled={!gmIntent.trim() || generatingSceneId === 'regenerating_scene'}
                    variant="primary"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    {generatingSceneId === 'regenerating_scene' ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Regenerating...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        <span>Regenerate Scene</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
