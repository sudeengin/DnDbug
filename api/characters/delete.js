import { getOrCreateSessionContext, processContextForPrompt } from '../context.js';
import { saveSessionContext } from '../storage.js';
import logger from '../lib/logger.js';

const log = logger.character;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, characterId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'Session ID is required' });
    }

    if (!characterId) {
      return res.status(400).json({ ok: false, error: 'Character ID is required' });
    }

    log.info('Deleting character:', { sessionId, characterId });

    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    if (!sessionContext.blocks.characters) {
      return res.status(404).json({ ok: false, error: 'No characters found' });
    }

    const charactersBlock = sessionContext.blocks.characters;
    
    // Find and remove the character
    const characterIndex = charactersBlock.list.findIndex(char => char.id === characterId);
    
    if (characterIndex === -1) {
      return res.status(404).json({ ok: false, error: 'Character not found' });
    }

    const deletedCharacter = charactersBlock.list[characterIndex];
    charactersBlock.list.splice(characterIndex, 1);
    
    // Update version and timestamp
    charactersBlock.version = Date.now();
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    // Save updated context
    await saveSessionContext(sessionId, sessionContext);

    log.info('Character deleted successfully:', deletedCharacter.name);

    res.json({
      ok: true,
      message: 'Character deleted successfully',
      deletedCharacter: {
        id: deletedCharacter.id,
        name: deletedCharacter.name
      }
    });

  } catch (error) {
    log.error('Error deleting character:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete character',
      details: error.message
    });
  }
}
