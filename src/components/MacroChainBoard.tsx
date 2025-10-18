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
import type { MacroChain, MacroScene, UpdateChainRequest } from '../types/macro-chain';
import { postJSON } from '../lib/api';

interface MacroChainBoardProps {
  chain: MacroChain;
  onUpdate: (updatedChain: MacroChain) => void;
  loading?: boolean;
}

// Sortable Scene Item Component
function SortableSceneItem({ 
  scene, 
  isEditing, 
  onTitleEdit, 
  onObjectiveEdit 
}: { 
  scene: MacroScene; 
  isEditing: boolean; 
  onTitleEdit: (sceneId: string, newTitle: string) => void;
  onObjectiveEdit: (sceneId: string, newObjective: string) => void;
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
        </div>
      </div>
    </div>
  );
}

export default function MacroChainBoard({ chain, onUpdate, loading = false }: MacroChainBoardProps) {
  const [scenes, setScenes] = useState<MacroScene[]>(chain.scenes);
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setScenes(chain.scenes);
  }, [chain.scenes]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Macro Chain ({scenes.length} scenes)
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isEditing
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
          disabled={loading}
        >
          {isEditing ? '✓ Done Editing' : '✏️ Edit Chain'}
        </button>
      </div>

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
                isEditing={isEditing}
                onTitleEdit={handleTitleEdit}
                onObjectiveEdit={handleObjectiveEdit}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!isEditing && (
        <div className="text-sm text-gray-500 text-center py-4">
          Click "Edit Chain" to reorder scenes and edit titles/objectives
        </div>
      )}
    </div>
  );
}
