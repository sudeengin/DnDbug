import { getOrCreateSessionContext, saveSessionContext } from '../storage.js';
import logger from "./lib/logger.js";

const log = logger.character;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, character } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    if (!character) {
      res.status(400).json({ error: 'character data is required' });
      return;
    }

    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Store SRD 2014 character data
    if (!sessionContext.blocks) {
      sessionContext.blocks = {};
    }
    
    if (!sessionContext.blocks.srd2014Characters) {
      sessionContext.blocks.srd2014Characters = {
        characters: [],
        version: Date.now()
      };
    }

    // Update or add character
    const existingIndex = sessionContext.blocks.srd2014Characters.characters.findIndex(
      c => c.id === character.id
    );

    if (existingIndex >= 0) {
      // Update existing character
      sessionContext.blocks.srd2014Characters.characters[existingIndex] = {
        ...character,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new character
      sessionContext.blocks.srd2014Characters.characters.push({
        ...character,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    sessionContext.blocks.srd2014Characters.version = Date.now();
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    await saveSessionContext(sessionId, sessionContext);

    log.info('SRD 2014 character saved:', {
      sessionId,
      characterId: character.id,
      characterName: character.name,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      character: character,
      message: 'Character saved successfully'
    });

  } catch (error) {
    log.error('Error saving SRD 2014 character:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
