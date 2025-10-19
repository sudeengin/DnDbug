import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import { bumpCharactersV } from '../lib/versioning.js';

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
    sessionContext.locks.characters = locked;
    sessionContext.updatedAt = new Date().toISOString();

    // Bump version when locking/unlocking
    if (locked) {
      bumpCharactersV(sessionContext.meta);
    }

    // Save the updated context
    await saveSessionContext(sessionId, sessionContext);

    console.log('Characters lock updated:', {
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
    console.error('Error updating characters lock:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}