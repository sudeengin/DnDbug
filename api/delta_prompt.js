/**
 * Prompt template for semantic delta analysis using AI
 * This provides more nuanced analysis than the programmatic delta service
 */

export function buildDeltaAnalysisPrompt(oldDetail, newDetail) {
  const languageDirective = "All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms.";
  
  return `You are a DnD scene editor. Compare the old and new scene details below and analyze the changes.

OLD_DETAIL:
${JSON.stringify(oldDetail, null, 2)}

NEW_DETAIL:
${JSON.stringify(newDetail, null, 2)}

TASKS:
1. Compare both versions semantically
2. Identify changed keys (context-related)
3. Summarize the delta in natural language
4. Determine affected subsequent scenes and assign importance level
5. Return updated detail, delta summary, and affected scenes list

OUTPUT SCHEMA:
{
  "updatedDetail": SceneDetail,
  "delta": {
    "keysChanged": string[],
    "summary": string
  },
  "affectedScenes": Array<{
    "sceneId": string,
    "reason": string,
    "severity": "soft" | "hard"
  }>
}

RULES:
- Return only JSON, no additional text
- "soft": Minor changes (state changes, minor updates)
- "hard": Major changes (new information, key events, plot changes)
- Only mark the next 2-3 scenes as affected
- Ignore only spelling/style differences
- Detect semantic changes

${languageDirective}`;
}

/**
 * Validates the AI response for delta analysis
 */
export function validateDeltaResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  // Check required fields
  if (!response.updatedDetail || !response.delta || !Array.isArray(response.affectedScenes)) {
    return false;
  }
  
  // Check delta structure
  if (!response.delta.keysChanged || !Array.isArray(response.delta.keysChanged)) {
    return false;
  }
  
  if (typeof response.delta.summary !== 'string') {
    return false;
  }
  
  // Check affectedScenes structure
  for (const scene of response.affectedScenes) {
    if (!scene.sceneId || !scene.reason || !scene.severity) {
      return false;
    }
    
    if (scene.severity !== 'soft' && scene.severity !== 'hard') {
      return false;
    }
  }
  
  return true;
}

/**
 * Fallback delta analysis when AI analysis fails
 */
export function createFallbackDelta(oldDetail, newDetail) {
  // Simple programmatic comparison as fallback
  const keysChanged = [];
  
  // Basic field comparisons
  if (JSON.stringify(oldDetail.keyEvents) !== JSON.stringify(newDetail.keyEvents)) {
    keysChanged.push('keyEvents');
  }
  
  if (JSON.stringify(oldDetail.revealedInfo) !== JSON.stringify(newDetail.revealedInfo)) {
    keysChanged.push('revealedInfo');
  }
  
  if (JSON.stringify(oldDetail.stateChanges) !== JSON.stringify(newDetail.stateChanges)) {
    keysChanged.push('stateChanges');
  }
  
  if (oldDetail.contextOut && newDetail.contextOut) {
    if (JSON.stringify(oldDetail.contextOut.keyEvents) !== JSON.stringify(newDetail.contextOut.keyEvents)) {
      keysChanged.push('contextOut.keyEvents');
    }
    
    if (JSON.stringify(oldDetail.contextOut.revealedInfo) !== JSON.stringify(newDetail.contextOut.revealedInfo)) {
      keysChanged.push('contextOut.revealedInfo');
    }
    
    if (JSON.stringify(oldDetail.contextOut.stateChanges) !== JSON.stringify(newDetail.contextOut.stateChanges)) {
      keysChanged.push('contextOut.stateChanges');
    }
  }
  
  const hasHardChanges = keysChanged.some(key => 
    key.includes('keyEvents') || key.includes('revealedInfo')
  );
  
  const summary = keysChanged.length > 0 
    ? `Changed fields: ${keysChanged.join(', ')}`
    : 'No meaningful changes detected';
  
  // Create affected scenes based on current scene
  const sceneMatch = oldDetail.sceneId.match(/scene[-_]?(\d+)/i);
  const currentSceneNumber = sceneMatch ? parseInt(sceneMatch[1]) : 1;
  const affectedScenes = [];
  
  for (let i = 1; i <= 2; i++) {
    const nextSceneNumber = currentSceneNumber + i;
    affectedScenes.push({
      sceneId: `scene-${nextSceneNumber}`,
      reason: hasHardChanges ? 'Major changes in previous scene' : 'Minor changes in previous scene',
      severity: hasHardChanges ? 'hard' : 'soft'
    });
  }
  
  return {
    updatedDetail: newDetail,
    delta: {
      keysChanged,
      summary
    },
    affectedScenes
  };
}
