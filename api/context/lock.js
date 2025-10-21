import { getOrCreateSessionContext } from '../context.js';
import logger from '../lib/logger.js';

const log = logger.context;

export default async function handler(req, res) {
  try {
    if (req.method !== 'PATCH') {
      res.status(405).json({ error: 'Use PATCH' });
      return;
    }

    const { sessionId, blockType, locked } = req.body;

    if (!sessionId || !blockType || typeof locked !== 'boolean') {
      return res.status(400).json({ 
        error: 'sessionId, blockType, and locked are required' 
      });
    }

    if (!['blueprint', 'player_hooks', 'world_seeds', 'style_prefs', 'custom', 'background', 'story_concept', 'characters'].includes(blockType)) {
      return res.status(400).json({ 
        error: 'Invalid blockType. Must be one of: blueprint, player_hooks, world_seeds, style_prefs, custom, background, story_concept, characters' 
      });
    }

    const sessionContext = getOrCreateSessionContext(sessionId);
    
    // Initialize locks object if it doesn't exist
    if (!sessionContext.locks) {
      sessionContext.locks = {};
    }

    // Update lock status
    sessionContext.locks[blockType] = locked;
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    log.info('Context lock updated:', {
      sessionId,
      blockType,
      locked,
      version: sessionContext.version,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    log.error('Error updating context lock:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
