import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';

/**
 * POST /api/scene/lock
 * Locks a scene, preventing further edits and enabling next scene generation
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
        error: 'Scene detail not found. Generate scene detail first.' 
      });
      return;
    }
    
    // Check if already locked
    if (sceneDetail.status === 'Locked') {
      res.status(409).json({ 
        error: 'Scene is already locked' 
      });
      return;
    }
    
    // Lock the scene
    const lockedDetail = {
      ...sceneDetail,
      status: 'Locked',
      lockedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      version: (sceneDetail.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.sceneDetails) {
      sessionContext.sceneDetails = {};
    }
    sessionContext.sceneDetails[sceneId] = lockedDetail;
    
    // Append contextOut to SessionContext if it exists
    if (sceneDetail.dynamicElements && sceneDetail.dynamicElements.contextOut) {
      const contextOut = sceneDetail.dynamicElements.contextOut;
      
      // Append to story_facts
      if (contextOut.story_facts && contextOut.story_facts.length > 0) {
        if (!sessionContext.blocks.story_facts) {
          sessionContext.blocks.story_facts = [];
        }
        sessionContext.blocks.story_facts.push(...contextOut.story_facts);
      }
      
      // Append to world_state
      if (contextOut.world_state && Object.keys(contextOut.world_state).length > 0) {
        if (!sessionContext.blocks.world_state) {
          sessionContext.blocks.world_state = {};
        }
        sessionContext.blocks.world_state = {
          ...sessionContext.blocks.world_state,
          ...contextOut.world_state
        };
      }
      
      // Append to world_seeds
      if (contextOut.world_seeds) {
        if (!sessionContext.blocks.world_seeds) {
          sessionContext.blocks.world_seeds = {
            locations: [],
            factions: [],
            constraints: []
          };
        }
        if (contextOut.world_seeds.locations) {
          sessionContext.blocks.world_seeds.locations.push(...contextOut.world_seeds.locations);
        }
        if (contextOut.world_seeds.factions) {
          sessionContext.blocks.world_seeds.factions.push(...contextOut.world_seeds.factions);
        }
        if (contextOut.world_seeds.constraints) {
          sessionContext.blocks.world_seeds.constraints.push(...contextOut.world_seeds.constraints);
        }
      }
    }
    
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save the updated context
    await saveSessionContext(sessionId, sessionContext);
    
    console.log(`Scene ${sceneId} locked for session ${sessionId}`);
    
    res.status(200).json({
      ok: true,
      data: lockedDetail
    });
    
  } catch (error) {
    console.error('Error locking scene:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
