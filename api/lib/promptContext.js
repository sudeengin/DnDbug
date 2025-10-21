import { loadSessionContext } from '../storage.js';
import logger from './logger.js';

const log = logger.prompt;

/**
 * Centralized PromptContextBuilder that provides consistent context for all LLM calls
 * with versioning and staleness checks
 */

/**
 * Builds a consistent prompt context from session data
 * @param {string} sessionId - The session ID
 * @returns {Promise<PromptContext>} The built prompt context with versioning
 */
export async function buildPromptContext(sessionId) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const sessionContext = await loadSessionContext(sessionId);
  
  if (!sessionContext) {
    // Return empty context with default versions
    return {
      background: null,
      characters: { list: [], locked: false, version: 0 },
      style_prefs: null,
      story_facts: null,
      world_state: null,
      world_seeds: null,
      numberOfPlayers: 4, // default
      versions: {
        backgroundV: 0,
        charactersV: 0,
        macroSnapshotV: 0,
      },
    };
  }

  // Extract version information from meta
  const meta = sessionContext.meta || {};
  const backgroundV = meta.backgroundV || 0;
  const charactersV = meta.charactersV || 0;
  const macroSnapshotV = meta.macroSnapshotV || 0;

  // Clamp numberOfPlayers within [3,6] range, default to 4
  const rawNumberOfPlayers = sessionContext.blocks?.background?.numberOfPlayers;
  const numberOfPlayers = (typeof rawNumberOfPlayers === 'number' && rawNumberOfPlayers >= 3 && rawNumberOfPlayers <= 6) 
    ? rawNumberOfPlayers 
    : 4;

  return {
    background: sessionContext.blocks?.background || null,
    characters: sessionContext.blocks?.characters || { list: [], locked: false, version: 0 },
    style_prefs: sessionContext.blocks?.style_prefs || null,
    story_facts: sessionContext.blocks?.story_facts || null,
    world_state: sessionContext.blocks?.world_state || null,
    world_seeds: sessionContext.blocks?.world_seeds || null,
    numberOfPlayers: numberOfPlayers, // inject here with proper clamping
    versions: {
      backgroundV,
      charactersV,
      macroSnapshotV,
    },
  };
}

/**
 * Validates that the context versions match current session versions
 * @param {Object} uses - The version info from the requesting artifact
 * @param {Object} meta - The current session meta
 * @returns {boolean} True if context is stale
 */
export function isStale(uses, meta) {
  if (!uses || !meta) return true;
  
  return (
    uses.backgroundV !== meta.backgroundV ||
    uses.charactersV !== meta.charactersV
  );
}

/**
 * Creates a macro snapshot version from background and characters versions
 * @param {Object} meta - The session meta object
 * @returns {number} The macro snapshot version
 */
export function makeMacroSnapshotV(meta) {
  const backgroundV = meta.backgroundV || 0;
  const charactersV = meta.charactersV || 0;
  return backgroundV * 1000 + charactersV;
}

/**
 * Checks if background and characters are locked for macro chain generation
 * @param {Object} sessionContext - The session context
 * @returns {Object} Lock status and error message if not locked
 */
export function checkMacroChainLocks(sessionContext) {
  const background = sessionContext?.blocks?.background;
  const characters = sessionContext?.blocks?.characters;
  const isBackgroundLocked = sessionContext?.locks?.background === true;
  const isCharactersLocked = sessionContext?.locks?.characters === true;

  if (!background || !isBackgroundLocked) {
    return {
      canGenerate: false,
      error: 'Background must be locked before generating the Macro Chain.'
    };
  }

  if (!characters || !isCharactersLocked) {
    return {
      canGenerate: false,
      error: 'Background and Characters must be locked before generating the Macro Chain.'
    };
  }

  return {
    canGenerate: true,
    error: null
  };
}

/**
 * Checks if previous scene is locked for scene detail generation
 * @param {Object} sessionContext - The session context
 * @param {number} sceneOrder - The order of the scene to generate
 * @returns {Object} Lock status and error message if not locked
 */
export function checkPreviousSceneLock(sessionContext, sceneOrder) {
  log.info('checkPreviousSceneLock called with:', {
    sceneOrder,
    hasSceneDetails: !!sessionContext.sceneDetails,
    sceneDetailsKeys: sessionContext.sceneDetails ? Object.keys(sessionContext.sceneDetails) : []
  });

  if (sceneOrder <= 1) {
    return { canGenerate: true, error: null };
  }

  const prevSceneOrder = sceneOrder - 1;
  
  // Find the previous scene by order (scene IDs are in format scene_${order}_${timestamp})
  const prevSceneId = Object.keys(sessionContext.sceneDetails || {}).find(id => {
    const match = id.match(/^scene_(\d+)_/);
    return match && parseInt(match[1]) === prevSceneOrder;
  });
  
  log.info('Scene lock validation:', {
    prevSceneOrder,
    prevSceneId,
    foundScene: !!prevSceneId,
    sceneStatus: prevSceneId ? sessionContext.sceneDetails[prevSceneId]?.status : 'not found'
  });
  
  if (!sessionContext.sceneDetails || !prevSceneId || !sessionContext.sceneDetails[prevSceneId]) {
    return {
      canGenerate: false,
      error: 'Previous scene must be generated and locked before generating this scene.'
    };
  }

  const prevSceneDetail = sessionContext.sceneDetails[prevSceneId];
  if (prevSceneDetail.status !== 'Locked') {
    return {
      canGenerate: false,
      error: 'Previous scene must be locked before generating this scene.'
    };
  }

  return { canGenerate: true, error: null };
}

/**
 * Builds context summary for effective context from previous scenes
 * @param {Object} effectiveContext - The effective context object
 * @returns {string} Formatted context summary
 */
export function createContextSummary(effectiveContext) {
  if (!effectiveContext || Object.keys(effectiveContext).length === 0) {
    return "No previous scenes - this is the first scene.";
  }

  const summary = [];
  
  if (effectiveContext.keyEvents && effectiveContext.keyEvents.length > 0) {
    summary.push(`Key Events: ${effectiveContext.keyEvents.join(', ')}`);
  }
  
  if (effectiveContext.revealedInfo && effectiveContext.revealedInfo.length > 0) {
    summary.push(`Revealed Info: ${effectiveContext.revealedInfo.join(', ')}`);
  }
  
  if (effectiveContext.stateChanges && Object.keys(effectiveContext.stateChanges).length > 0) {
    summary.push(`State Changes: ${JSON.stringify(effectiveContext.stateChanges)}`);
  }
  
  if (effectiveContext.npcRelationships && Object.keys(effectiveContext.npcRelationships).length > 0) {
    summary.push(`NPC Relationships: ${JSON.stringify(effectiveContext.npcRelationships)}`);
  }
  
  if (effectiveContext.environmentalState && Object.keys(effectiveContext.environmentalState).length > 0) {
    summary.push(`Environmental State: ${JSON.stringify(effectiveContext.environmentalState)}`);
  }
  
  if (effectiveContext.plotThreads && effectiveContext.plotThreads.length > 0) {
    summary.push(`Plot Threads: ${effectiveContext.plotThreads.map(t => t.title).join(', ')}`);
  }
  
  if (effectiveContext.playerDecisions && effectiveContext.playerDecisions.length > 0) {
    summary.push(`Player Decisions: ${effectiveContext.playerDecisions.map(d => d.choice).join(', ')}`);
  }

  return summary.length > 0 ? summary.join('\n') : "No significant context from previous scenes.";
}
