import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import type { MacroScene, SceneDetail } from '../types/macro-chain';
import { 
  canAccessScene, 
  getStatusBadgeVariant, 
  getStatusDisplayText,
  getSceneStatus,
  type SceneStatusStore 
} from '../lib/status';

interface SceneListProps {
  items: MacroScene[];
  statusMap: SceneStatusStore;
  selected: number;
  onSelect: (sceneIndex: number) => void;
  highestLockedIndex: number;
  sessionId: string;
  onGenerateFirst: () => void;
}

export default function SceneList({ items, statusMap, selected, onSelect, highestLockedIndex, sessionId, onGenerateFirst }: SceneListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Scenes</h3>
        <p className="text-sm text-gray-600">Select a scene to detail</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {items.map((scene, index) => {
            const sceneIds = items.map(s => s.id);
            const canAccess = canAccessScene(index, statusMap, sceneIds);
            const disabled = !canAccess;
            const isFirstScene = index === 0;
            const isSelected = selected === index;
            
            // If scene can't be accessed, it should show as Draft regardless of actual status
            const status = canAccess ? getSceneStatus(scene.id, statusMap) : 'Draft';
            const isDraft = status === 'Draft';
            
            return (
              <div
                key={scene.id}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors cursor-pointer',
                  isSelected && 'bg-blue-50 border-r-2 border-blue-500',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !disabled && onSelect(index)}
                title={disabled ? 'Lock previous scene first' : 'Open'}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{scene.title}</span>
                  <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                    {getStatusDisplayText(status)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {scene.objective}
                </div>
                {isFirstScene && isDraft && (
                  <Button 
                    size="sm" 
                    className="mt-2 w-full" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onGenerateFirst(); 
                    }}
                  >
                    Generate Detail
                  </Button>
                )}
                {disabled && (
                  <p className="text-xs text-red-500 mt-1">
                    Lock previous scene first
                  </p>
                )}
              </div>
            );
          })}
        </div>
        
        {items.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">No scenes available</p>
          </div>
        )}
      </div>
    </div>
  );
}
