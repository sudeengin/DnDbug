import { lockContextBlock } from '../lib/lockService.js';
import logger from "../lib/logger.js";

const log = logger.character;

/**
 * Characters lock handler - uses unified lockService
 * Maintained for backward compatibility with POST /api/characters/lock
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, locked } = req.body;

    if (!sessionId || typeof locked !== 'boolean') {
      res.status(400).json({ 
        error: 'sessionId and locked (boolean) are required' 
      });
      return;
    }

    // Use unified lock service with blockType='characters'
    const sessionContext = await lockContextBlock(sessionId, 'characters', locked);

    log.info('Characters lock updated:', {
      sessionId,
      locked,
      charactersV: sessionContext.meta.charactersV,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    log.error('Error updating characters lock:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}