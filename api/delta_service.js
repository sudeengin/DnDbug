/**
 * Delta Service for analyzing changes between old and new SceneDetail objects
 * and determining impact on subsequent scenes
 */

export function analyzeDelta(oldDetail, newDetail) {
  const keysChanged = [];
  const summaryParts = [];
  
  // Compare keyEvents
  if (!arraysEqual(oldDetail.keyEvents || [], newDetail.keyEvents || [])) {
    keysChanged.push('keyEvents');
    summaryParts.push('key events changed');
  }
  
  // Compare revealedInfo
  if (!arraysEqual(oldDetail.revealedInfo || [], newDetail.revealedInfo || [])) {
    keysChanged.push('revealedInfo');
    summaryParts.push('revealed information changed');
  }
  
  // Compare stateChanges
  if (!objectsEqual(oldDetail.stateChanges || {}, newDetail.stateChanges || {})) {
    keysChanged.push('stateChanges');
    summaryParts.push('state changes detected');
  }
  
  // Compare contextOut deeply
  if (oldDetail.contextOut && newDetail.contextOut) {
    // Check contextOut.keyEvents
    if (!arraysEqual(oldDetail.contextOut.keyEvents || [], newDetail.contextOut.keyEvents || [])) {
      keysChanged.push('contextOut.keyEvents');
      summaryParts.push('context key events changed');
    }
    
    // Check contextOut.revealedInfo
    if (!arraysEqual(oldDetail.contextOut.revealedInfo || [], newDetail.contextOut.revealedInfo || [])) {
      keysChanged.push('contextOut.revealedInfo');
      summaryParts.push('context revealed info changed');
    }
    
    // Check contextOut.stateChanges
    if (!objectsEqual(oldDetail.contextOut.stateChanges || {}, newDetail.contextOut.stateChanges || {})) {
      keysChanged.push('contextOut.stateChanges');
      summaryParts.push('context state changes detected');
    }
    
    // Check NPC relationships
    if (!objectsEqual(oldDetail.contextOut.npcRelationships || {}, newDetail.contextOut.npcRelationships || {})) {
      keysChanged.push('contextOut.npcRelationships');
      summaryParts.push('NPC relationships changed');
    }
    
    // Check environmental state
    if (!objectsEqual(oldDetail.contextOut.environmentalState || {}, newDetail.contextOut.environmentalState || {})) {
      keysChanged.push('contextOut.environmentalState');
      summaryParts.push('environmental state changed');
    }
    
    // Check plot threads
    if (!arraysEqual(oldDetail.contextOut.plotThreads || [], newDetail.contextOut.plotThreads || [])) {
      keysChanged.push('contextOut.plotThreads');
      summaryParts.push('plot threads changed');
    }
    
    // Check player decisions
    if (!arraysEqual(oldDetail.contextOut.playerDecisions || [], newDetail.contextOut.playerDecisions || [])) {
      keysChanged.push('contextOut.playerDecisions');
      summaryParts.push('player decisions changed');
    }
  }
  
  const delta = {
    keysChanged,
    summary: summaryParts.length > 0 ? summaryParts.join('; ') : 'No significant changes detected'
  };
  
  // Determine affected scenes based on the changes
  const affectedScenes = determineAffectedScenes(delta, oldDetail.sceneId);
  
  return {
    updatedDetail: newDetail,
    delta,
    affectedScenes
  };
}

/**
 * Determines which subsequent scenes are affected by the changes
 */
function determineAffectedScenes(delta, currentSceneId) {
  const affectedScenes = [];
  
  // Extract scene number from sceneId (assuming format like "scene-1", "scene_1", etc.)
  const sceneMatch = currentSceneId.match(/scene[-_]?(\d+)/i);
  const currentSceneNumber = sceneMatch ? parseInt(sceneMatch[1]) : 1;
  
  // Determine severity based on the type of changes
  const hasHardChanges = delta.keysChanged.some(key => 
    key.includes('keyEvents') || 
    key.includes('revealedInfo') || 
    key.includes('plotThreads') ||
    key.includes('playerDecisions')
  );
  
  const hasSoftChanges = delta.keysChanged.some(key => 
    key.includes('stateChanges') || 
    key.includes('npcRelationships') ||
    key.includes('environmentalState')
  );
  
  // Only consider the next 2-3 scenes to avoid over-propagation
  const maxScenesToCheck = 3;
  
  for (let i = 1; i <= maxScenesToCheck; i++) {
    const nextSceneNumber = currentSceneNumber + i;
    const nextSceneId = `scene-${nextSceneNumber}`;
    
    let reason = '';
    let severity = 'soft';
    
    if (hasHardChanges) {
      reason = 'Previous scene had major plot changes';
      severity = 'hard';
    } else if (hasSoftChanges) {
      reason = 'Previous scene had minor state changes';
      severity = 'soft';
    }
    
    if (reason) {
      affectedScenes.push({
        sceneId: nextSceneId,
        reason,
        severity
      });
    }
  }
  
  return affectedScenes;
}

/**
 * Helper function to compare arrays for equality
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  
  // For simple arrays (strings, numbers)
  if (a.every(item => typeof item === 'string' || typeof item === 'number')) {
    return a.every((item, index) => item === b[index]);
  }
  
  // For complex arrays (objects), do a shallow comparison
  return a.every((item, index) => {
    const bItem = b[index];
    if (typeof item === 'object' && typeof bItem === 'object') {
      return objectsEqual(item, bItem);
    }
    return item === bItem;
  });
}

/**
 * Helper function to compare objects for equality
 */
function objectsEqual(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => {
    const valueA = a[key];
    const valueB = b[key];
    
    if (Array.isArray(valueA) && Array.isArray(valueB)) {
      return arraysEqual(valueA, valueB);
    }
    
    if (typeof valueA === 'object' && typeof valueB === 'object') {
      return objectsEqual(valueA, valueB);
    }
    
    return valueA === valueB;
  });
}

/**
 * Creates a regeneration plan based on affected scenes
 */
export function createRegenerationPlan(affectedScenes) {
  // Sort by severity (hard changes first) and then by scene order
  const sortedScenes = affectedScenes.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'hard' ? -1 : 1;
    }
    
    // Extract scene numbers for ordering
    const aNum = parseInt(a.sceneId.match(/scene[-_]?(\d+)/i)?.[1] || '0');
    const bNum = parseInt(b.sceneId.match(/scene[-_]?(\d+)/i)?.[1] || '0');
    return aNum - bNum;
  });
  
  return sortedScenes.map(scene => scene.sceneId);
}
