import { NextResponse } from 'next/server';
import { getOrCreateSessionContext } from '../context.js';

/**
 * POST /api/scene/unlock
 * Unlocks a scene, allowing edits and marking later scenes as NeedsRegen
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.sessionId || !body.sceneId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, sceneId' },
        { status: 400 }
      );
    }
    
    const { sessionId, sceneId } = body;
    
    // Get session context
    const sessionContext = getOrCreateSessionContext(sessionId);
    
    // Find the scene detail in the session context
    let sceneDetail = null;
    if (sessionContext.sceneDetails && sessionContext.sceneDetails[sceneId]) {
      sceneDetail = sessionContext.sceneDetails[sceneId];
    }
    
    // Validate that scene detail exists
    if (!sceneDetail) {
      return NextResponse.json(
        { error: 'Scene detail not found' },
        { status: 404 }
      );
    }
    
    // Check if already unlocked
    if (sceneDetail.status !== 'Locked') {
      return NextResponse.json(
        { error: 'Scene is not locked' },
        { status: 409 }
      );
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
      const currentSceneOrder = sceneDetail.order || 0;
      
      for (const [otherSceneId, otherDetail] of Object.entries(sessionContext.sceneDetails)) {
        if (otherSceneId !== sceneId && otherDetail && otherDetail.order > currentSceneOrder) {
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
    
    sessionContext.updatedAt = new Date().toISOString();
    
    console.log(`Scene ${sceneId} unlocked for session ${sessionId}, affected scenes:`, affectedScenes);
    
    return NextResponse.json({
      ok: true,
      detail: unlockedDetail,
      affectedScenes
    });
    
  } catch (error) {
    console.error('Error unlocking scene:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
