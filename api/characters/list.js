import { getOrCreateSessionContext } from '../context.js';
import logger from '../lib/logger.js';

const log = logger.character;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Use GET' });
      return;
    }

    const { sessionId } = req.query;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId query parameter is required' });
      return;
    }

    const sessionContext = await getOrCreateSessionContext(sessionId);
    const charactersBlock = sessionContext?.blocks?.characters;

    if (!charactersBlock) {
      res.status(200).json({ 
        ok: true, 
        list: [], 
        locked: false, 
        version: 0 
      });
      return;
    }

    res.status(200).json({ 
      ok: true, 
      list: charactersBlock.list || [], 
      locked: sessionContext.locks?.characters || false, 
      version: charactersBlock.version || 0 
    });

  } catch (error) {
    log.error('Error getting characters:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
