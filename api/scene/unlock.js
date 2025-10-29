import { lockScene } from '../lib/lockService.js';
import logger from "../lib/logger.js";

const log = logger.scene;

/**
 * POST /api/scene/unlock
 * Unlocks a scene, allowing edits and marking later scenes as NeedsRegen
 * Uses unified lockService
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
    
    // Use unified lock service to unlock (locked=false)
    const { sceneDetail, affectedScenes } = await lockScene(sessionId, sceneId, false);
    
    log.info(`Scene ${sceneId} unlocked for session ${sessionId}`, {
      affectedScenesCount: affectedScenes.length
    });
    
    res.status(200).json({
      ok: true,
      data: sceneDetail,
      affectedScenes
    });
    
  } catch (error) {
    log.error('Error unlocking scene:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('not locked') ? 409 : 500;
    res.status(statusCode).json({ 
      error: error.message 
    });
  }
}
