import { NextResponse } from 'next/server';
import { getOrCreateSessionContext } from '../context.js';

/**
 * POST /api/scene/lock
 * Locks a scene, preventing further edits and enabling next scene generation
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
        { error: 'Scene detail not found. Generate scene detail first.' },
        { status: 404 }
      );
    }
    
    // Check if already locked
    if (sceneDetail.status === 'Locked') {
      return NextResponse.json(
        { error: 'Scene is already locked' },
        { status: 409 }
      );
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
    sessionContext.updatedAt = new Date().toISOString();
    
    console.log(`Scene ${sceneId} locked for session ${sessionId}`);
    
    return NextResponse.json({
      ok: true,
      detail: lockedDetail
    });
    
  } catch (error) {
    console.error('Error locking scene:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
