/**
 * Creativity Tracker - Prevents repetitive generation patterns
 * Tracks recent approaches and ensures variation across generations
 */

import { getOrCreateSessionContext, saveSessionContext } from './storage.js';

const MAX_HISTORY = 10; // Keep track of last 10 generations

/**
 * Get creativity history for a session
 * @param {string} sessionId - Session identifier
 * @returns {Object} Creativity history
 */
export async function getCreativityHistory(sessionId) {
  try {
    const sessionContext = await getOrCreateSessionContext(sessionId);
    return sessionContext.creativityHistory || {
      macroChainApproaches: [],
      sceneDetailApproaches: [],
      lastUpdated: null
    };
  } catch (error) {
    console.warn('Failed to get creativity history:', error.message);
    return {
      macroChainApproaches: [],
      sceneDetailApproaches: [],
      lastUpdated: null
    };
  }
}

/**
 * Save creativity history for a session
 * @param {string} sessionId - Session identifier
 * @param {Object} history - Creativity history to save
 */
export async function saveCreativityHistory(sessionId, history) {
  try {
    const sessionContext = await getOrCreateSessionContext(sessionId);
    sessionContext.creativityHistory = {
      ...history,
      lastUpdated: new Date().toISOString()
    };
    await saveSessionContext(sessionId, sessionContext);
  } catch (error) {
    console.warn('Failed to save creativity history:', error.message);
  }
}

/**
 * Select a creative approach avoiding recent ones
 * @param {Array} approaches - Available approaches
 * @param {Array} recentApproaches - Recently used approaches
 * @returns {string} Selected approach
 */
export function selectCreativeApproach(approaches, recentApproaches = []) {
  // If we have fewer approaches than history limit, just pick randomly
  if (approaches.length <= MAX_HISTORY) {
    return approaches[Math.floor(Math.random() * approaches.length)];
  }

  // Filter out recent approaches
  const availableApproaches = approaches.filter(
    approach => !recentApproaches.includes(approach)
  );

  // If all approaches have been used recently, reset and pick randomly
  if (availableApproaches.length === 0) {
    return approaches[Math.floor(Math.random() * approaches.length)];
  }

  // Pick from available approaches
  return availableApproaches[Math.floor(Math.random() * availableApproaches.length)];
}

/**
 * Record a macro chain generation approach
 * @param {string} sessionId - Session identifier
 * @param {string} approach - Approach used
 * @param {string} narrativeStyle - Narrative style used
 * @param {string} pacing - Pacing approach used
 */
export async function recordMacroChainApproach(sessionId, approach, narrativeStyle, pacing) {
  try {
    const history = await getCreativityHistory(sessionId);
    
    const newRecord = {
      approach,
      narrativeStyle,
      pacing,
      timestamp: new Date().toISOString()
    };

    // Add to history and maintain size limit
    history.macroChainApproaches.unshift(newRecord);
    if (history.macroChainApproaches.length > MAX_HISTORY) {
      history.macroChainApproaches = history.macroChainApproaches.slice(0, MAX_HISTORY);
    }

    await saveCreativityHistory(sessionId, history);
  } catch (error) {
    console.warn('Failed to record macro chain approach:', error.message);
  }
}

/**
 * Record a scene detail generation approach
 * @param {string} sessionId - Session identifier
 * @param {string} approach - Approach used
 * @param {string} detailStyle - Detail style used
 * @param {string} complexity - Complexity level used
 */
export async function recordSceneDetailApproach(sessionId, approach, detailStyle, complexity) {
  try {
    const history = await getCreativityHistory(sessionId);
    
    const newRecord = {
      approach,
      detailStyle,
      complexity,
      timestamp: new Date().toISOString()
    };

    // Add to history and maintain size limit
    history.sceneDetailApproaches.unshift(newRecord);
    if (history.sceneDetailApproaches.length > MAX_HISTORY) {
      history.sceneDetailApproaches = history.sceneDetailApproaches.slice(0, MAX_HISTORY);
    }

    await saveCreativityHistory(sessionId, history);
  } catch (error) {
    console.warn('Failed to record scene detail approach:', error.message);
  }
}

/**
 * Get recent macro chain approaches for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array} Recent approaches
 */
export async function getRecentMacroChainApproaches(sessionId) {
  try {
    const history = await getCreativityHistory(sessionId);
    return history.macroChainApproaches.map(record => record.approach);
  } catch (error) {
    console.warn('Failed to get recent macro chain approaches:', error.message);
    return [];
  }
}

/**
 * Get recent scene detail approaches for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array} Recent approaches
 */
export async function getRecentSceneDetailApproaches(sessionId) {
  try {
    const history = await getCreativityHistory(sessionId);
    return history.sceneDetailApproaches.map(record => record.approach);
  } catch (error) {
    console.warn('Failed to get recent scene detail approaches:', error.message);
    return [];
  }
}

/**
 * Generate a unique variation seed based on session history
 * @param {string} sessionId - Session identifier
 * @returns {number} Variation seed
 */
export async function generateVariationSeed(sessionId) {
  try {
    const history = await getCreativityHistory(sessionId);
    const timestamp = Date.now();
    
    // Combine timestamp with session-specific factors
    const sessionFactor = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const historyFactor = (history.macroChainApproaches.length + history.sceneDetailApproaches.length) * 17;
    
    return (timestamp + sessionFactor + historyFactor) % 1000;
  } catch (error) {
    console.warn('Failed to generate variation seed:', error.message);
    return Date.now() % 1000;
  }
}
