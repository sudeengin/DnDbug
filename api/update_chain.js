import { loadChain, updateChain } from './storage.js';
import logger from "./lib/logger.js";

const log = logger.macroChain;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { chainId, edits, sessionId } = req.body;

    if (!chainId || !Array.isArray(edits)) {
      res.status(400).json({ error: 'chainId and edits array are required' });
      return;
    }

    // Load existing chain from session context first, then fallback to old storage
    let existingChain = null;
    let sessionContext = null;
    
    if (sessionId) {
      const { getOrCreateSessionContext } = await import('./context.js');
      sessionContext = await getOrCreateSessionContext(sessionId);
      
      // CRITICAL: Log session context state to detect data loss
      log.info('🔍 Session context loaded for update_chain:', {
        sessionId,
        hasBlocks: !!sessionContext.blocks,
        hasBackground: !!(sessionContext.blocks && sessionContext.blocks.background),
        hasCharacters: !!(sessionContext.blocks && sessionContext.blocks.characters),
        hasMacroChains: !!sessionContext.macroChains,
        macroChainCount: sessionContext.macroChains ? Object.keys(sessionContext.macroChains).length : 0,
        version: sessionContext.version,
        contextSize: JSON.stringify(sessionContext).length
      });
      
      if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
        existingChain = sessionContext.macroChains[chainId];
        log.info('Loading chain from session context:', chainId);
      }
    }
    
    // Fallback to old storage if not found in session context
    if (!existingChain) {
      existingChain = await loadChain(chainId);
      log.info('Loading chain from old storage:', chainId);
    }
    
    if (!existingChain) {
      res.status(404).json({ error: 'Chain not found' });
      return;
    }

    // Create a copy of the chain to modify
    let updatedChain = { 
      ...existingChain,
      status: existingChain.status || 'Edited',
      version: (existingChain.version || 0) + 1,
      lastUpdatedAt: new Date().toISOString()
    };

    // Process each edit
    for (const edit of edits) {
      switch (edit.type) {
        case 'reorder':
          log.info(`Reordering scene ${edit.sceneId} to position ${edit.newOrder}`);
          // Find the scene and update its order
          const sceneToReorder = updatedChain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToReorder) {
            sceneToReorder.order = edit.newOrder;
            // Re-sort scenes by order
            updatedChain.scenes.sort((a, b) => a.order - b.order);
          }
          break;
          
        case 'edit_title':
          log.info(`Updating title for scene ${edit.sceneId} to: ${edit.newValue}`);
          const sceneToEditTitle = updatedChain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToEditTitle) {
            sceneToEditTitle.title = edit.newValue;
          }
          break;
          
        case 'edit_objective':
          log.info(`Updating objective for scene ${edit.sceneId} to: ${edit.newValue}`);
          const sceneToEditObjective = updatedChain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToEditObjective) {
            sceneToEditObjective.objective = edit.newValue;
          }
          break;
          
        case 'delete_scene':
          log.info(`Deleting scene ${edit.sceneId}`);
          updatedChain.scenes = updatedChain.scenes.filter(s => s.id !== edit.sceneId);
          // Reorder remaining scenes
          updatedChain.scenes.forEach((scene, index) => {
            scene.order = index + 1;
          });
          break;
          
        case 'add_scene':
          log.info(`Adding new scene:`, edit.sceneData);
          const newScene = {
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            order: updatedChain.scenes.length + 1,
            title: edit.sceneData.title || 'New Scene',
            objective: edit.sceneData.objective || 'New objective'
          };
          updatedChain.scenes.push(newScene);
          break;
          
        default:
          log.warn(`Unknown edit type: ${edit.type}`);
      }
    }

    // Save the updated chain to old storage
    const savedChain = await updateChain(chainId, updatedChain);
    
    // CRITICAL: Also update session context to keep everything in sync
    if (sessionId && sessionContext) {
      const { saveSessionContext } = await import('./storage.js');
      
      // CRITICAL FIX: Create backup before modifying session context
      const backupContext = JSON.parse(JSON.stringify(sessionContext));
      log.info('💾 Created session context backup before update_chain', {
        sessionId,
        chainId,
        backupSize: JSON.stringify(backupContext).length,
        hasBackground: !!(backupContext.blocks && backupContext.blocks.background),
        hasCharacters: !!(backupContext.blocks && backupContext.blocks.characters)
      });
      
      // SAFETY CHECK: Verify session context has data before modifying
      if (!sessionContext.blocks && !sessionContext.macroChains) {
        log.error('🚨 CRITICAL: Session context appears empty - aborting update to prevent data loss!', {
          sessionId,
          chainId,
          contextKeys: Object.keys(sessionContext)
        });
        res.status(500).json({ error: 'Session context appears corrupted - aborting to prevent data loss' });
        return;
      }
      
      // Update macroChains storage
      if (!sessionContext.macroChains) {
        sessionContext.macroChains = {};
      }
      sessionContext.macroChains[chainId] = updatedChain;
      
      // Update blocks.custom.macroChain to keep UI in sync
      if (!sessionContext.blocks) {
        sessionContext.blocks = {};
      }
      if (!sessionContext.blocks.custom) {
        sessionContext.blocks.custom = {};
      }
      sessionContext.blocks.custom.macroChain = {
        chainId: updatedChain.chainId,
        scenes: updatedChain.scenes,
        status: updatedChain.status,
        version: updatedChain.version,
        lastUpdatedAt: updatedChain.lastUpdatedAt,
        meta: updatedChain.meta,
        createdAt: updatedChain.createdAt,
        updatedAt: updatedChain.updatedAt,
        lockedAt: updatedChain.lockedAt
      };
      
      sessionContext.updatedAt = new Date().toISOString();
      
      // CRITICAL: Log session context state before saving to detect data loss
      log.info('💾 Saving session context after update_chain:', {
        sessionId,
        hasBlocks: !!sessionContext.blocks,
        hasBackground: !!(sessionContext.blocks && sessionContext.blocks.background),
        hasCharacters: !!(sessionContext.blocks && sessionContext.blocks.characters),
        hasMacroChains: !!sessionContext.macroChains,
        macroChainCount: sessionContext.macroChains ? Object.keys(sessionContext.macroChains).length : 0,
        version: sessionContext.version,
        contextSize: JSON.stringify(sessionContext).length,
        chainScenesCount: updatedChain.scenes.length
      });
      
      try {
        await saveSessionContext(sessionId, sessionContext);
        log.info(`Chain ${chainId} updated in session context with ${updatedChain.scenes.length} scenes`);
      } catch (error) {
        log.error('🚨 CRITICAL: Failed to save session context - attempting recovery from backup', {
          sessionId,
          chainId,
          error: error.message,
          backupSize: JSON.stringify(backupContext).length
        });
        
        // Attempt to restore from backup
        try {
          await saveSessionContext(sessionId, backupContext);
          log.warn('🔄 Session context restored from backup', {
            sessionId,
            chainId
          });
        } catch (backupError) {
          log.error('🚨 CRITICAL: Backup restoration failed - data may be lost!', {
            sessionId,
            chainId,
            backupError: backupError.message
          });
        }
        
        // Don't fail the entire request, just log the error
        log.error('Session context save failed but chain update succeeded:', error);
      }
    }

    // Log telemetry
    log.info('Telemetry: update_chain', {
      chainId,
      editCount: edits.length,
      sceneCount: updatedChain.scenes.length,
      timestamp: Date.now(),
    });

    res.status(200).json({ ok: true, data: savedChain });

  } catch (error) {
    log.error('Error updating chain:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
