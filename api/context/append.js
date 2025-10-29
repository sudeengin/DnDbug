// Import the context handler functions
import { getOrCreateSessionContext, mergeContextData } from '../context.js';
import { saveSessionContext } from '../storage.js';

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
    
    // CRITICAL: Log session context state to detect data loss
    console.log('🔍 Context append - session context loaded:', {
      sessionId,
      version: sessionContext.version,
      hasBlocks: !!sessionContext.blocks,
      hasBackground: !!(sessionContext.blocks && sessionContext.blocks.background),
      hasCharacters: !!(sessionContext.blocks && sessionContext.blocks.characters),
      hasMacroChains: !!sessionContext.macroChains,
      macroChainCount: sessionContext.macroChains ? Object.keys(sessionContext.macroChains).length : 0,
      contextSize: JSON.stringify(sessionContext).length,
      blockType,
      timestamp: new Date().toISOString()
    });
    
    // SAFETY CHECK: Verify session context has data before modifying
    if (!sessionContext.blocks && !sessionContext.macroChains) {
      console.error('🚨 CRITICAL: Session context appears empty in append - aborting to prevent data loss!', {
        sessionId,
        blockType,
        contextKeys: Object.keys(sessionContext)
      });
      return res.status(500).json({ error: 'Session context appears corrupted - aborting to prevent data loss' });
    }
    
    // CRITICAL FIX: Ensure blocks object exists to prevent data loss
    if (!sessionContext.blocks) {
      console.warn('⚠️ Session context missing blocks - creating empty blocks object', {
        sessionId,
        blockType,
        version: sessionContext.version
      });
      sessionContext.blocks = {};
    }
    
    // CRITICAL FIX: Ensure locks and meta are preserved
    if (!sessionContext.locks) {
      console.warn('⚠️ Session context missing locks - creating empty locks object', {
        sessionId,
        blockType,
        version: sessionContext.version
      });
      sessionContext.locks = {};
    }
    
    if (!sessionContext.meta) {
      console.warn('⚠️ Session context missing meta - creating default meta', {
        sessionId,
        blockType,
        version: sessionContext.version
      });
      sessionContext.meta = {
        backgroundV: 0,
        charactersV: 0,
        macroSnapshotV: 0,
        updatedAt: new Date().toISOString()
      };
    }

    const existingBlock = sessionContext.blocks[blockType];
    
    // Merge the new data with existing data
    const mergedData = mergeContextData(existingBlock, data, blockType);

    // Update the session context
    sessionContext.blocks[blockType] = mergedData;
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    // CRITICAL: Log session context state before saving to detect data loss
    console.log('💾 Context append - saving session context:', {
      sessionId,
      version: sessionContext.version,
      hasBlocks: !!sessionContext.blocks,
      hasBackground: !!(sessionContext.blocks && sessionContext.blocks.background),
      hasCharacters: !!(sessionContext.blocks && sessionContext.blocks.characters),
      hasMacroChains: !!sessionContext.macroChains,
      macroChainCount: sessionContext.macroChains ? Object.keys(sessionContext.macroChains).length : 0,
      contextSize: JSON.stringify(sessionContext).length,
      blockType,
      timestamp: new Date().toISOString()
    });
    
    // Save the updated context to persistent storage
    await saveSessionContext(sessionId, sessionContext);

    console.log('✅ Context appended successfully:', {
      sessionId,
      blockType,
      version: sessionContext.version,
      timestamp: Date.now()
    });

    // CRITICAL FIX: Return the complete session context, not just blocks
    res.status(200).json({ 
      ok: true, 
      data: {
        sessionId: sessionContext.sessionId,
        blocks: sessionContext.blocks,
        locks: sessionContext.locks || {},  // Preserve locks
        meta: sessionContext.meta || {      // Preserve meta
          backgroundV: 0,
          charactersV: 0,
          macroSnapshotV: 0,
          updatedAt: new Date().toISOString()
        },
        version: sessionContext.version,
        createdAt: sessionContext.createdAt,
        updatedAt: sessionContext.updatedAt,
        macroChains: sessionContext.macroChains || {}  // Preserve macro chains
      }
    });

  } catch (error) {
    console.error('Error in context/append:', error);
    res.status(500).json({ error: error.message });
  }
}
