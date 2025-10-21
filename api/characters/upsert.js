import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import logger from '../lib/logger.js';

const log = logger.character;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, character } = req.body;

    if (!sessionId || !character) {
      res.status(400).json({ error: 'sessionId and character are required' });
      return;
    }

    const sessionContext = await getOrCreateSessionContext(sessionId);
    const charactersBlock = sessionContext?.blocks?.characters;

    if (!charactersBlock || !charactersBlock.list) {
      res.status(409).json({ 
        error: 'Characters must be generated before editing.' 
      });
      return;
    }

    if (charactersBlock.locked) {
      res.status(409).json({ 
        error: 'Characters are locked and cannot be edited.' 
      });
      return;
    }

    // Find and update the character
    const characterIndex = charactersBlock.list.findIndex(c => c.id === character.id);
    if (characterIndex === -1) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // Update the character
    charactersBlock.list[characterIndex] = { ...character };
    charactersBlock.version = Date.now();
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    await saveSessionContext(sessionId, sessionContext);

    log.info('Character updated:', {
      sessionId,
      characterId: character.id,
      characterName: character.name,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      list: charactersBlock.list 
    });

  } catch (error) {
    log.error('Error updating character:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
