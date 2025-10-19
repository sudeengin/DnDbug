/**
 * Versioning utilities for SessionContext and artifact management
 */

/**
 * Bumps the background version in session meta
 * @param {Object} meta - The session meta object
 */
export function bumpBackgroundV(meta) {
  meta.backgroundV = (meta.backgroundV || 0) + 1;
  meta.updatedAt = new Date().toISOString();
}

/**
 * Bumps the characters version in session meta
 * @param {Object} meta - The session meta object
 */
export function bumpCharactersV(meta) {
  meta.charactersV = (meta.charactersV || 0) + 1;
  meta.updatedAt = new Date().toISOString();
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
 * Checks if context is stale by comparing versions
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
 * Creates version info for a scene detail
 * @param {Object} meta - The current session meta
 * @param {Object} prevSceneV - Previous scene versions
 * @returns {Object} Version info for the scene detail
 */
export function createSceneVersionInfo(meta, prevSceneV = {}) {
  return {
    backgroundV: meta.backgroundV || 0,
    charactersV: meta.charactersV || 0,
    prevSceneV,
    version: Date.now() // Use timestamp as scene version
  };
}

/**
 * Validates scene detail version against current context
 * @param {Object} sceneUses - The scene's version info
 * @param {Object} meta - The current session meta
 * @returns {Object} Validation result with isStale flag and details
 */
export function validateSceneVersion(sceneUses, meta) {
  const isBackgroundStale = sceneUses.backgroundV !== (meta.backgroundV || 0);
  const isCharactersStale = sceneUses.charactersV !== (meta.charactersV || 0);
  
  return {
    isStale: isBackgroundStale || isCharactersStale,
    isBackgroundStale,
    isCharactersStale,
    currentVersions: {
      backgroundV: meta.backgroundV || 0,
      charactersV: meta.charactersV || 0
    },
    sceneVersions: {
      backgroundV: sceneUses.backgroundV || 0,
      charactersV: sceneUses.charactersV || 0
    }
  };
}

/**
 * Creates a staleness error message
 * @param {Object} validation - The validation result
 * @returns {string} Human-readable error message
 */
export function createStalenessError(validation) {
  const parts = [];
  
  if (validation.isBackgroundStale) {
    parts.push(`Background changed (v${validation.sceneVersions.backgroundV} → v${validation.currentVersions.backgroundV})`);
  }
  
  if (validation.isCharactersStale) {
    parts.push(`Characters changed (v${validation.sceneVersions.charactersV} → v${validation.currentVersions.charactersV})`);
  }
  
  return `StaleContext: ${parts.join(', ')}. Please regenerate.`;
}

/**
 * Initializes meta object with default versions
 * @returns {Object} Initialized meta object
 */
export function initializeMeta() {
  return {
    backgroundV: 0,
    charactersV: 0,
    macroSnapshotV: 0,
    updatedAt: new Date().toISOString()
  };
}
