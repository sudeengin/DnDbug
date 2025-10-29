/**
 * Unified Lock Service
 * Centralized service for all locking/unlocking operations across the application
 * Handles: context blocks, chains, scenes, and other lockable entities
 */

import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import { bumpBackgroundV, bumpCharactersV } from './versioning.js';
import logger from "./logger.js";

const log = logger.lock || logger.context;

/**
 * Valid block types for context locking
 */
const VALID_BLOCK_TYPES = [
  'blueprint',
  'player_hooks',
  'world_seeds',
  'style_prefs',
  'custom',
  'background',
  'story_concept',
  'characters'
];

/**
 * Unified function to lock/unlock any context block
 * @param {string} sessionId - Session ID
 * @param {string} blockType - Type of block to lock (background, characters, etc.)
 * @param {boolean} locked - Lock state (true = lock, false = unlock)
 * @returns {Promise<Object>} Updated session context
 */
export async function lockContextBlock(sessionId, blockType, locked) {
  if (!VALID_BLOCK_TYPES.includes(blockType)) {
    throw new Error(`Invalid blockType: ${blockType}. Must be one of: ${VALID_BLOCK_TYPES.join(', ')}`);
  }

  const sessionContext = await getOrCreateSessionContext(sessionId);
  
  // Initialize locks object if it doesn't exist
  if (!sessionContext.locks) {
    sessionContext.locks = {};
  }

  // Update lock status
  sessionContext.locks[blockType] = locked;
  sessionContext.version = (sessionContext.version || 0) + 1;
  sessionContext.updatedAt = new Date().toISOString();

  // Bump specific version when locking (to track changes for staleness detection)
  if (locked) {
    if (blockType === 'background') {
      bumpBackgroundV(sessionContext.meta);
    } else if (blockType === 'characters') {
      bumpCharactersV(sessionContext.meta);
    }
  }

  // Save the updated context
  await saveSessionContext(sessionId, sessionContext);

  log.info('Context block locked:', {
    sessionId,
    blockType,
    locked,
    version: sessionContext.version,
    timestamp: Date.now()
  });

  return sessionContext;
}

/**
 * Lock or unlock a macro chain
 * @param {string} sessionId - Session ID
 * @param {string} chainId - Chain ID to lock/unlock
 * @param {boolean} locked - Lock state (true = lock, false = unlock)
 * @returns {Promise<Object>} Updated chain and session context
 */
export async function lockChain(sessionId, chainId, locked) {
  const { loadSessionContext, loadChain } = await import('../storage.js');
  const sessionContext = await loadSessionContext(sessionId);
  
  if (!sessionContext) {
    throw new Error('Session not found');
  }

  // Find the macro chain - try session context first
  let macroChain = null;
  if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
    macroChain = sessionContext.macroChains[chainId];
  } else if (sessionContext.blocks?.custom?.macroChain?.chainId === chainId) {
    macroChain = sessionContext.blocks.custom.macroChain;
  }
  
  // If not found in session context, try the old storage system (migration)
  if (!macroChain) {
    try {
      const legacyChain = await loadChain(chainId);
      
      // If found in old storage, migrate it to session context
      if (legacyChain) {
        if (!sessionContext.macroChains) {
          sessionContext.macroChains = {};
        }
        sessionContext.macroChains[chainId] = legacyChain;
        sessionContext.updatedAt = new Date().toISOString();
        const { saveSessionContext } = await import('../storage.js');
        await saveSessionContext(sessionId, sessionContext);
        macroChain = legacyChain;
        log.info(`Chain ${chainId} migrated from old storage to session context`);
      }
    } catch (error) {
      log.warn('Failed to load chain from old storage:', error);
    }
  }

  if (!macroChain) {
    throw new Error('Macro chain not found. Generate a chain first.');
  }

  // Validate current state
  const currentStatus = macroChain.status || 'Draft';
  if (locked && currentStatus === 'Locked') {
    throw new Error('Macro chain is already locked');
  }
  if (!locked && currentStatus !== 'Locked') {
    throw new Error('Macro chain is not locked');
  }

  // Update chain status
  const updatedChain = {
    ...macroChain,
    status: locked ? 'Locked' : 'Edited',
    version: (macroChain.version || 1) + 1,
    lastUpdatedAt: new Date().toISOString()
  };

  if (locked) {
    updatedChain.lockedAt = new Date().toISOString();
  } else {
    updatedChain.lockedAt = undefined;
  }

  // Store in session context
  if (!sessionContext.macroChains) {
    sessionContext.macroChains = {};
  }
  sessionContext.macroChains[chainId] = updatedChain;

  // Keep UI in sync - also update context.blocks.custom.macroChain
  if (!sessionContext.blocks) {
    sessionContext.blocks = {};
  }
  if (!sessionContext.blocks.custom) {
    sessionContext.blocks.custom = {};
  }
  sessionContext.blocks.custom.macroChain = {
    chainId: updatedChain.chainId,
    scenes: updatedChain.scenes,
    status: updatedChain.status,
    version: updatedChain.version,
    lastUpdatedAt: updatedChain.lastUpdatedAt,
    meta: updatedChain.meta,
    createdAt: updatedChain.createdAt,
    updatedAt: updatedChain.updatedAt,
    lockedAt: updatedChain.lockedAt
  };

  // If unlocking, mark ALL scene details as NeedsRegen (they depend on the chain)
  if (!locked && sessionContext.sceneDetails) {
    const affectedScenes = [];
    for (const [sceneId, sceneDetail] of Object.entries(sessionContext.sceneDetails)) {
      if (sceneDetail && sceneDetail.sceneId) {
        sceneDetail.status = 'NeedsRegen';
        sceneDetail.lastUpdatedAt = new Date().toISOString();
        sceneDetail.version = (sceneDetail.version || 0) + 1;
        affectedScenes.push(sceneId);
      }
    }
    log.info('Chain unlocked - all scenes marked as NeedsRegen:', {
      chainId,
      affectedScenesCount: affectedScenes.length
    });
  }

  sessionContext.updatedAt = new Date().toISOString();
  await saveSessionContext(sessionId, sessionContext);

  log.info(`Macro chain ${locked ? 'locked' : 'unlocked'}:`, {
    sessionId,
    chainId,
    status: updatedChain.status,
    timestamp: Date.now()
  });

  return {
    chain: updatedChain,
    sessionContext
  };
}

/**
 * Lock or unlock a scene detail
 * @param {string} sessionId - Session ID
 * @param {string} sceneId - Scene ID to lock/unlock
 * @param {boolean} locked - Lock state (true = lock, false = unlock)
 * @returns {Promise<Object>} Updated scene detail and affected scenes
 */
export async function lockScene(sessionId, sceneId, locked) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  
  // Find the scene detail
  if (!sessionContext.sceneDetails || !sessionContext.sceneDetails[sceneId]) {
    throw new Error('Scene detail not found');
  }

  const sceneDetail = sessionContext.sceneDetails[sceneId];
  const currentStatus = sceneDetail.status || 'Draft';

  // Validate current state
  if (locked && currentStatus === 'Locked') {
    throw new Error('Scene is already locked');
  }
  if (!locked && currentStatus !== 'Locked') {
    throw new Error('Scene is not locked');
  }

  // Update scene status
  const updatedDetail = {
    ...sceneDetail,
    status: locked ? 'Locked' : 'NeedsRegen',
    version: (sceneDetail.version || 1) + 1,
    lastUpdatedAt: new Date().toISOString()
  };

  if (locked) {
    updatedDetail.lockedAt = new Date().toISOString();
  }

  sessionContext.sceneDetails[sceneId] = updatedDetail;

  // If unlocking, mark later scenes as NeedsRegen
  const affectedScenes = [];
  if (!locked && sessionContext.sceneDetails) {
    const currentSequence = sceneDetail.sequence || 0;
    for (const id in sessionContext.sceneDetails) {
      const detail = sessionContext.sceneDetails[id];
      if (detail.sequence > currentSequence && detail.status === 'Locked') {
        detail.status = 'NeedsRegen';
        affectedScenes.push(id);
      }
    }
  }

  sessionContext.updatedAt = new Date().toISOString();
  await saveSessionContext(sessionId, sessionContext);

  log.info(`Scene ${locked ? 'locked' : 'unlocked'}:`, {
    sessionId,
    sceneId,
    status: updatedDetail.status,
    affectedScenesCount: affectedScenes.length,
    timestamp: Date.now()
  });

  return {
    sceneDetail: updatedDetail,
    affectedScenes,
    sessionContext
  };
}

/**
 * Check if a context block is locked
 * @param {string} sessionId - Session ID
 * @param {string} blockType - Block type to check
 * @returns {Promise<boolean>} True if locked
 */
export async function isContextBlockLocked(sessionId, blockType) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  return sessionContext.locks?.[blockType] === true;
}

/**
 * Check if a chain is locked
 * @param {string} sessionId - Session ID
 * @param {string} chainId - Chain ID to check
 * @returns {Promise<boolean>} True if locked
 */
export async function isChainLocked(sessionId, chainId) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  const chain = sessionContext.macroChains?.[chainId] || 
                sessionContext.blocks?.custom?.macroChain;
  return chain?.status === 'Locked';
}

/**
 * Check if a scene is locked
 * @param {string} sessionId - Session ID
 * @param {string} sceneId - Scene ID to check
 * @returns {Promise<boolean>} True if locked
 */
export async function isSceneLocked(sessionId, sceneId) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  const sceneDetail = sessionContext.sceneDetails?.[sceneId];
  return sceneDetail?.status === 'Locked';
}

