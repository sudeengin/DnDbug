import { getOrCreateSessionContext } from '../storage.js';
import logger from "./lib/logger.js";

const log = logger.character;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Use GET' });
      return;
    }

    const { sessionId } = req.query;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Get SRD 2014 characters
    const characters = sessionContext.blocks?.srd2014Characters?.characters || [];

    log.info('SRD 2014 characters loaded:', {
      sessionId,
      characterCount: characters.length,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      characters: characters
    });

  } catch (error) {
    log.error('Error loading SRD 2014 characters:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
