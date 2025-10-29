import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import { bumpBackgroundV } from '../lib/versioning.js';
import logger from "./lib/logger.js";

const log = logger.background;

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

    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Update the lock status
    if (!sessionContext.locks) {
      sessionContext.locks = {};
    }
    sessionContext.locks.background = locked;
    sessionContext.updatedAt = new Date().toISOString();

    // Bump version when locking/unlocking
    if (locked) {
      bumpBackgroundV(sessionContext.meta);
    }

    // Save the updated context
    await saveSessionContext(sessionId, sessionContext);

    log.info('Background lock updated:', {
      sessionId,
      locked,
      backgroundV: sessionContext.meta.backgroundV,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    log.error('Error updating background lock:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
