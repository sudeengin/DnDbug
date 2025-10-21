// Import the context handler functions
import { getOrCreateSessionContext, mergeContextData } from '../context.js';
import { saveSessionContext } from '../storage.js';
import logger from '../lib/logger.js';

const log = logger.context;

export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed' 
      });
    }

    const { sessionId, blockType, data } = req.body;

    if (!sessionId || !blockType || !data) {
      return res.status(400).json({ 
        error: 'sessionId, blockType, and data are required' 
      });
    }

    // Allow custom block types for story facts from scene details
    const validBlockTypes = ['blueprint', 'player_hooks', 'world_seeds', 'style_prefs', 'custom', 'story_facts', 'background', 'story_concept'];
    if (!validBlockTypes.includes(blockType)) {
      return res.status(400).json({ 
        error: `Invalid blockType. Must be one of: ${validBlockTypes.join(', ')}` 
      });
    }

    const sessionContext = await getOrCreateSessionContext(sessionId);
    const existingBlock = sessionContext.blocks[blockType];

    log.info('📝 APPEND - Before merge:', {
      sessionId,
      blockType,
      hasBackground: !!sessionContext.blocks.background,
      hasCharacters: !!sessionContext.blocks.characters,
      hasCustom: !!sessionContext.blocks.custom,
      existingBlockKeys: existingBlock ? Object.keys(existingBlock) : []
    });

    // Merge the new data with existing data
    const mergedData = mergeContextData(existingBlock, data, blockType);

    // Update the session context
    sessionContext.blocks[blockType] = mergedData;
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    log.info('📝 APPEND - After merge:', {
      blockType,
      hasBackground: !!sessionContext.blocks.background,
      hasCharacters: !!sessionContext.blocks.characters,
      hasCustom: !!sessionContext.blocks.custom,
      customHasMacroChain: !!sessionContext.blocks.custom?.macroChain
    });

    // Save the updated context to persistent storage
    await saveSessionContext(sessionId, sessionContext);

    log.info('✅ Context appended and saved:', {
      sessionId,
      blockType,
      version: sessionContext.version,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    log.error('Error in context/append:', error);
    res.status(500).json({ error: error.message });
  }
}
