import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import logger from "../lib/logger.js";

const log = logger.scene;

/**
 * POST /api/scene/update
 * Updates a scene's title or objective
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, sceneId, title, objective } = req.body;
    
    if (!sessionId || !sceneId) {
      res.status(400).json({ 
        error: 'Missing required fields: sessionId, sceneId' 
      });
      return;
    }
    
    if (!title && !objective) {
      res.status(400).json({ 
        error: 'Must provide title or objective to update' 
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
    
    // Check if scene is locked and requires unlock flow
    if (sceneDetail.status === 'Locked') {
      res.status(409).json({ 
        error: 'Scene is locked. Unlock it first to make edits.' 
      });
      return;
    }
    
    // Update the scene
    const updatedDetail = {
      ...sceneDetail,
      ...(title && { title }),
      ...(objective && { objective }),
      status: sceneDetail.status === 'Generated' ? 'Edited' : sceneDetail.status,
      lastUpdatedAt: new Date().toISOString(),
      version: (sceneDetail.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.sceneDetails) {
      sessionContext.sceneDetails = {};
    }
    sessionContext.sceneDetails[sceneId] = updatedDetail;
    
    // Also update macro chain scenes if they exist
    if (sessionContext.macroChains) {
      for (const [chainId, chain] of Object.entries(sessionContext.macroChains)) {
        if (chain.scenes) {
          const macroScene = chain.scenes.find(scene => scene.id === sceneId);
          if (macroScene) {
            if (title) macroScene.title = title;
            if (objective) macroScene.objective = objective;
            
            // Update chain metadata
            chain.version = (chain.version || 0) + 1;
            chain.lastUpdatedAt = new Date().toISOString();
          }
        }
      }
    }
    
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save the updated context
    await saveSessionContext(sessionId, sessionContext);
    
    log.info(`Scene ${sceneId} updated in session ${sessionId}`, {
      updatedFields: { title: !!title, objective: !!objective },
      newStatus: updatedDetail.status
    });
    
    res.status(200).json({
      ok: true,
      data: updatedDetail
    });
    
  } catch (error) {
    log.error('Error updating scene:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
