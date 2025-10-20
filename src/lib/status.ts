import type { SceneDetail } from '../types/macro-chain';

export type SceneStatus = 'Draft' | 'Generated' | 'Edited' | 'Locked' | 'NeedsRegen';

export interface SceneStatusStore {
  [sceneId: string]: SceneDetail | null;
}

/**
 * Check if a scene is locked
 */
export function isLocked(detail: SceneDetail | null): boolean {
  return detail?.status === 'Locked';
}

/**
 * Get the highest locked scene index (0-based)
 * Returns -1 if no scenes are locked
 */
export function highestLockedIndex(statusStore: SceneStatusStore, sceneIds: string[]): number {
  let highestIndex = -1;
  
  for (let i = 0; i < sceneIds.length; i++) {
    const sceneId = sceneIds[i];
    const detail = statusStore[sceneId];
    
    if (detail && detail.status === 'Locked') {
      highestIndex = i;
    }
  }
  
  return highestIndex;
}

/**
 * Check if a scene can be accessed based on lock status
 * Scene N can only be accessed if Scene N-1 is locked (or it's Scene 1)
 */
export function canAccessScene(
  sceneIndex: number,
  statusStore: SceneStatusStore,
  sceneIds: string[]
): boolean {
  // Scene 1 (index 0) can always be accessed
  if (sceneIndex === 0) {
    return true;
  }
  
  // Scene N can only be accessed if Scene N-1 is locked
  const previousSceneId = sceneIds[sceneIndex - 1];
  const previousDetail = statusStore[previousSceneId];
  
  return isLocked(previousDetail);
}

/**
 * Get the status of a scene
 */
export function getSceneStatus(
  sceneId: string,
  statusStore: SceneStatusStore
): SceneStatus {
  const detail = statusStore[sceneId];
  
  if (!detail) {
    return 'Draft';
  }
  
  return detail.status;
}

/**
 * Check if a scene can be locked
 * A scene can be locked if it has been generated (has detail content)
 */
export function canLockScene(detail: SceneDetail | null): boolean {
  return detail !== null && detail.status !== 'Locked';
}

/**
 * Check if the next scene can be generated
 * Next scene can be generated if current scene is locked and there are more scenes
 */
export function canGenerateNext(
  currentSceneIndex: number,
  totalScenes: number,
  detail: SceneDetail | null
): boolean {
  return (
    detail?.status === 'Locked' &&
    currentSceneIndex < totalScenes - 1
  );
}

/**
 * Merge context from all locked scenes up to a given index
 */
export function mergeLockedContexts(
  upToIndex: number,
  statusStore: SceneStatusStore,
  sceneIds: string[]
): {
  keyEvents: string[];
  revealedInfo: string[];
  stateChanges: Record<string, any>;
  npcRelationships?: Record<string, any>;
  environmentalState?: Record<string, any>;
  plotThreads?: Array<any>;
  playerDecisions?: Array<any>;
} {
  const merged = {
    keyEvents: [] as string[],
    revealedInfo: [] as string[],
    stateChanges: {} as Record<string, any>,
    npcRelationships: {} as Record<string, any>,
    environmentalState: {} as Record<string, any>,
    plotThreads: [] as Array<any>,
    playerDecisions: [] as Array<any>
  };
  
  // Only include contexts from locked scenes
  for (let i = 0; i <= upToIndex && i < sceneIds.length; i++) {
    const sceneId = sceneIds[i];
    const detail = statusStore[sceneId];
    
    if (detail && detail.status === 'Locked' && detail.contextOut) {
      // Merge key events
      if (detail.contextOut.keyEvents) {
        merged.keyEvents.push(...detail.contextOut.keyEvents);
      }
      
      // Merge revealed info
      if (detail.contextOut.revealedInfo) {
        merged.revealedInfo.push(...detail.contextOut.revealedInfo);
      }
      
      // Merge state changes (deep merge)
      if (detail.contextOut.stateChanges) {
        merged.stateChanges = { ...merged.stateChanges, ...detail.contextOut.stateChanges };
      }
      
      // Merge NPC relationships
      if (detail.contextOut.npcRelationships) {
        merged.npcRelationships = { ...merged.npcRelationships, ...detail.contextOut.npcRelationships };
      }
      
      // Merge environmental state
      if (detail.contextOut.environmentalState) {
        merged.environmentalState = { ...merged.environmentalState, ...detail.contextOut.environmentalState };
      }
      
      // Merge plot threads
      if (detail.contextOut.plotThreads) {
        merged.plotThreads.push(...detail.contextOut.plotThreads);
      }
      
      // Merge player decisions
      if (detail.contextOut.playerDecisions) {
        merged.playerDecisions.push(...detail.contextOut.playerDecisions);
      }
    }
  }
  
  return merged;
}

/**
 * Get status badge variant for UI
 */
export function getStatusBadgeVariant(status: SceneStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'locked' {
  switch (status) {
    case 'Draft':
      return 'outline';
    case 'Generated':
      return 'secondary';
    case 'Edited':
      return 'default';
    case 'Locked':
      return 'locked'; // Use the new locked variant with yellow background
    case 'NeedsRegen':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get status display text for UI
 */
export function getStatusDisplayText(status: SceneStatus): string {
  switch (status) {
    case 'Draft':
      return 'Draft';
    case 'Generated':
      return 'Generated';
    case 'Edited':
      return 'Edited';
    case 'Locked':
      return 'Locked';
    case 'NeedsRegen':
      return 'Needs Regen';
    default:
      return 'Unknown';
  }
}
