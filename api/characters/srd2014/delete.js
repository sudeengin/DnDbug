import { getOrCreateSessionContext } from '../../context.js';
import { saveSessionContext } from '../../storage.js';
import logger from "../../lib/logger.js";

const log = logger.character;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, characterId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    if (!characterId) {
      res.status(400).json({ error: 'characterId is required' });
      return;
    }

    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Check if SRD 2014 characters block exists
    if (!sessionContext.blocks?.srd2014Characters?.characters) {
      res.status(404).json({ 
        ok: false,
        error: 'No saved character sheets found' 
      });
      return;
    }

    // Find and remove the character
    const characterIndex = sessionContext.blocks.srd2014Characters.characters.findIndex(
      c => c.id === characterId
    );

    if (characterIndex === -1) {
      res.status(404).json({ 
        ok: false,
        error: 'Character sheet not found' 
      });
      return;
    }

    const deletedCharacter = sessionContext.blocks.srd2014Characters.characters[characterIndex];
    sessionContext.blocks.srd2014Characters.characters.splice(characterIndex, 1);

    // Update version and timestamp
    sessionContext.blocks.srd2014Characters.version = Date.now();
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    await saveSessionContext(sessionId, sessionContext);

    log.info('SRD 2014 character deleted:', {
      sessionId,
      characterId: deletedCharacter.id,
      characterName: deletedCharacter.name,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      message: 'Character sheet deleted successfully',
      deletedCharacter: {
        id: deletedCharacter.id,
        name: deletedCharacter.name
      }
    });

  } catch (error) {
    log.error('Error deleting SRD 2014 character:', error);
    res.status(500).json({ 
      ok: false,
      error: error.message 
    });
  }
}

