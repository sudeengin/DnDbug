import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import logger from "../lib/logger.js";

const log = logger.scene;

/**
 * POST /api/scene/unlock
 * Unlocks a scene, allowing edits and marking later scenes as NeedsRegen
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
        error: 'Scene detail not found' 
      });
      return;
    }
    
    // Check if already unlocked
    if (sceneDetail.status !== 'Locked') {
      res.status(409).json({ 
        error: 'Scene is not locked' 
      });
      return;
    }
    
    // Unlock the scene - set to Edited (or Generated if unchanged from original generation)
    const unlockedDetail = {
      ...sceneDetail,
      status: 'Edited', // Assume edited since it was previously locked
      lockedAt: undefined,
      lastUpdatedAt: new Date().toISOString(),
      version: (sceneDetail.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.sceneDetails) {
      sessionContext.sceneDetails = {};
    }
    sessionContext.sceneDetails[sceneId] = unlockedDetail;
    
    // Mark all later scenes as NeedsRegen
    const affectedScenes = [];
    if (sessionContext.sceneDetails) {
      const currentSceneOrder = sceneDetail.sequence || sceneDetail.order || 0;
      
      for (const [otherSceneId, otherDetail] of Object.entries(sessionContext.sceneDetails)) {
        if (otherSceneId !== sceneId && otherDetail) {
          const otherSceneOrder = otherDetail.sequence || otherDetail.order || 0;
          if (otherSceneOrder > currentSceneOrder) {
            // Mark as NeedsRegen
            const updatedDetail = {
              ...otherDetail,
              status: 'NeedsRegen',
              lastUpdatedAt: new Date().toISOString(),
              version: (otherDetail.version || 0) + 1
            };
            
            sessionContext.sceneDetails[otherSceneId] = updatedDetail;
            affectedScenes.push(otherSceneId);
          }
        }
      }
    }
    
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save the updated context
    await saveSessionContext(sessionId, sessionContext);
    
    log.info(`Scene ${sceneId} unlocked for session ${sessionId}, affected scenes:`, affectedScenes);
    
    res.status(200).json({
      ok: true,
      data: unlockedDetail,
      affectedScenes
    });
    
  } catch (error) {
    log.error('Error unlocking scene:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
