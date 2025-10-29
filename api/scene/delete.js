import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import logger from "../lib/logger.js";

const log = logger.scene;

/**
 * POST /api/scene/delete
 * Deletes a scene and reindexes remaining scenes
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, sceneId } = req.body;
    
    if (!sessionId || !sceneId) {
      res.status(400).json({ 
        error: 'Missing required fields: sessionId, sceneId' 
      });
      return;
    }
    
    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Find the scene detail in the session context
    let sceneDetail = null;
    if (sessionContext.sceneDetails && sessionContext.sceneDetails[sceneId]) {
      sceneDetail = sessionContext.sceneDetails[sceneId];
    }
    
    // Validate that scene detail exists
    if (!sceneDetail) {
      res.status(404).json({ 
        error: 'Scene not found' 
      });
      return;
    }
    
    // Check if scene is locked - prevent deletion of locked scenes
    if (sceneDetail.status === 'Locked') {
      res.status(409).json({ 
        error: 'Cannot delete locked scene. Unlock it first.' 
      });
      return;
    }
    
    const deletedSequence = sceneDetail.sequence || sceneDetail.order || 0;
    
    // Delete the scene from sceneDetails
    delete sessionContext.sceneDetails[sceneId];
    
    // Reindex remaining scenes to maintain contiguous sequence
    const remainingScenes = Object.values(sessionContext.sceneDetails).filter(detail => 
      detail && (detail.sequence || detail.order || 0) > deletedSequence
    );
    
    // Sort by current sequence/order
    remainingScenes.sort((a, b) => (a.sequence || a.order || 0) - (b.sequence || b.order || 0));
    
    // Reindex scenes that come after the deleted one
    for (let i = 0; i < remainingScenes.length; i++) {
      const scene = remainingScenes[i];
      const newSequence = deletedSequence + i;
      
      // Update the scene in sessionContext.sceneDetails
      const sceneIdToUpdate = Object.keys(sessionContext.sceneDetails).find(id => 
        sessionContext.sceneDetails[id] === scene
      );
      
      if (sceneIdToUpdate) {
        sessionContext.sceneDetails[sceneIdToUpdate] = {
          ...scene,
          sequence: newSequence,
          order: newSequence, // Keep both for compatibility
          lastUpdatedAt: new Date().toISOString(),
          version: (scene.version || 0) + 1
        };
      }
    }
    
    // Also update macro chain scenes if they exist
    if (sessionContext.macroChains) {
      for (const [chainId, chain] of Object.entries(sessionContext.macroChains)) {
        if (chain.scenes) {
          // Remove the deleted scene from macro chain
          chain.scenes = chain.scenes.filter(scene => scene.id !== sceneId);
          
          // Reindex remaining scenes
          chain.scenes.forEach((scene, index) => {
            scene.order = index + 1;
          });
          
          // Update chain metadata
          chain.version = (chain.version || 0) + 1;
          chain.lastUpdatedAt = new Date().toISOString();
        }
      }
    }
    
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save the updated context
    await saveSessionContext(sessionId, sessionContext);
    
    log.info(`Scene ${sceneId} deleted from session ${sessionId}, reindexed ${remainingScenes.length} scenes`);
    
    res.status(200).json({
      ok: true,
      deletedSceneId: sceneId,
      reindexedScenes: remainingScenes.length
    });
    
  } catch (error) {
    log.error('Error deleting scene:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
