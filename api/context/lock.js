import { lockContextBlock } from '../lib/lockService.js';
import logger from "../lib/logger.js";

const log = logger.context;

/**
 * Unified context lock handler - uses lockService for all block types
 */
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

    // Use unified lock service
    const sessionContext = await lockContextBlock(sessionId, blockType, locked);

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
