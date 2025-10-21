import logger from './logger.js';

const log = logger.validation;
/**
 * Invalidation rules for downstream artifacts when upstream changes occur
 */

/**
 * Invalidates downstream scenes when a scene is edited
 * @param {Object} sessionContext - The session context
 * @param {string} editedSceneId - The ID of the edited scene
 * @param {number} editedSceneOrder - The order of the edited scene
 */
export function invalidateDownstreamScenes(sessionContext, editedSceneId, editedSceneOrder) {
  if (!sessionContext.sceneDetails) return;
  
  // Mark all scenes after the edited one as NeedsRegen
  Object.keys(sessionContext.sceneDetails).forEach(sceneId => {
    const sceneDetail = sessionContext.sceneDetails[sceneId];
    if (sceneDetail.order && sceneDetail.order > editedSceneOrder) {
      sessionContext.sceneDetails[sceneId].status = 'NeedsRegen';
      sessionContext.sceneDetails[sceneId].lastUpdatedAt = new Date().toISOString();
      log.info(`Marked scene ${sceneId} as NeedsRegen due to edit of scene ${editedSceneId}`);
    }
  });
}

/**
 * Invalidates macro chain when background or characters change
 * @param {Object} sessionContext - The session context
 * @param {string} changeType - 'background' or 'characters'
 */
export function invalidateMacroChain(sessionContext, changeType) {
  if (!sessionContext.macroChains) return;
  
  Object.keys(sessionContext.macroChains).forEach(chainId => {
    sessionContext.macroChains[chainId].status = 'NeedsRegen';
    sessionContext.macroChains[chainId].lastUpdatedAt = new Date().toISOString();
    log.info(`Marked macro chain ${chainId} as NeedsRegen due to ${changeType} change`);
  });
}

/**
 * Invalidates all scenes when background or characters change
 * @param {Object} sessionContext - The session context
 * @param {string} changeType - 'background' or 'characters'
 */
export function invalidateAllScenes(sessionContext, changeType) {
  if (!sessionContext.sceneDetails) return;
  
  Object.keys(sessionContext.sceneDetails).forEach(sceneId => {
    sessionContext.sceneDetails[sceneId].status = 'NeedsRegen';
    sessionContext.sceneDetails[sceneId].lastUpdatedAt = new Date().toISOString();
    log.info(`Marked scene ${sceneId} as NeedsRegen due to ${changeType} change`);
  });
}

/**
 * Checks if a scene edit is trivial (should not trigger invalidation)
 * @param {Object} oldDetail - The old scene detail
 * @param {Object} newDetail - The new scene detail
 * @returns {boolean} True if the edit is trivial
 */
export function isTrivialEdit(oldDetail, newDetail) {
  // Define trivial changes that don't require downstream invalidation
  const trivialFields = ['lastUpdatedAt', 'version'];
  
  // Check if only trivial fields changed
  const oldFiltered = { ...oldDetail };
  const newFiltered = { ...newDetail };
  
  trivialFields.forEach(field => {
    delete oldFiltered[field];
    delete newFiltered[field];
  });
  
  return JSON.stringify(oldFiltered) === JSON.stringify(newFiltered);
}
