"""
Context router
Converted from api/context.js and server.js context endpoints
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel
from backend.services.context_service import (
    get_or_create_session_context,
    merge_context_data
)
from backend.services.storage_service import (
    save_session_context,
    load_session_context,
    update_session_context
)
from backend.utils.logger import logger

router = APIRouter(prefix="/api/context", tags=["context"])
log = logger['context']

VALID_BLOCK_TYPES = [
    'blueprint', 'player_hooks', 'world_seeds', 'style_prefs',
    'custom', 'story_facts', 'background', 'story_concept', 'characters'
]


class ContextAppendRequest(BaseModel):
    sessionId: str
    blockType: str
    data: Any


@router.post("/append")
async def append_context(request: ContextAppendRequest):
    """Append data to a context block"""
    sessionId = request.sessionId
    blockType = request.blockType
    data = request.data
    """Append data to a context block"""
    if not sessionId or not blockType or data is None:
        raise HTTPException(
            status_code=400,
            detail="sessionId, blockType, and data are required"
        )
    
    if blockType not in VALID_BLOCK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid blockType. Must be one of: {', '.join(VALID_BLOCK_TYPES)}"
        )
    
    session_context = await get_or_create_session_context(sessionId)
    existing_block = session_context.get('blocks', {}).get(blockType)
    
    # Merge the new data with existing data
    merged_data = merge_context_data(existing_block, data, blockType)
    
    # Update the session context
    if 'blocks' not in session_context:
        session_context['blocks'] = {}
    session_context['blocks'][blockType] = merged_data
    session_context['version'] = (session_context.get('version', 0) or 0) + 1
    session_context['updatedAt'] = datetime.now().isoformat()
    
    # Bump version numbers for specific block types
    if blockType == 'background':
        if 'meta' not in session_context:
            session_context['meta'] = {}
        session_context['meta']['backgroundV'] = (session_context['meta'].get('backgroundV', 0) or 0) + 1
        session_context['meta']['updatedAt'] = datetime.now().isoformat()
    elif blockType == 'characters':
        if 'meta' not in session_context:
            session_context['meta'] = {}
        session_context['meta']['charactersV'] = (session_context['meta'].get('charactersV', 0) or 0) + 1
        session_context['meta']['updatedAt'] = datetime.now().isoformat()
    
    # Save the updated context
    await save_session_context(sessionId, session_context)
    
    log.info('Context appended:', {
        'sessionId': sessionId,
        'blockType': blockType,
        'version': session_context['version'],
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": session_context}


@router.get("/get")
async def get_context(sessionId: str = Query(...)):
    """Get session context"""
    if not sessionId:
        raise HTTPException(
            status_code=400,
            detail="sessionId query parameter is required"
        )
    
    session_context = await load_session_context(sessionId)
    
    if not session_context or not session_context.get('blocks'):
        return {"ok": True, "data": None}
    
    log.info('Context retrieved:', {
        'sessionId': sessionId,
        'version': session_context.get('version'),
        'blockTypes': list(session_context.get('blocks', {}).keys()),
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": session_context}


@router.get("/health")
async def context_health(sessionId: str = Query(...)):
    """Check session context health"""
    if not sessionId:
        raise HTTPException(
            status_code=400,
            detail="sessionId query parameter is required"
        )
    
    from backend.services.storage_service import load_session_context
    session_context = await load_session_context(sessionId)
    
    health = {
        "sessionId": sessionId,
        "exists": session_context is not None,
        "timestamp": datetime.now().isoformat()
    }
    
    if session_context:
        health["version"] = session_context.get('version')
        health["hasBackground"] = bool(session_context.get('blocks', {}).get('background'))
        health["hasCharacters"] = bool(session_context.get('blocks', {}).get('characters'))
        health["hasMacroChains"] = bool(session_context.get('macroChains'))
        health["macroChainCount"] = len(session_context.get('macroChains', {}))
        health["blocksCount"] = len(session_context.get('blocks', {}))
        health["locks"] = session_context.get('locks', {})
        health["createdAt"] = session_context.get('createdAt')
        health["updatedAt"] = session_context.get('updatedAt')
    
    log.info('Session health check:', health)
    
    return {"ok": True, "data": health}


class ContextClearRequest(BaseModel):
    sessionId: str


@router.post("/clear")
async def clear_context(request: ContextClearRequest):
    """Clear session context"""
    sessionId = request.sessionId
    """Clear session context"""
    if not sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")
    
    session_context = await get_or_create_session_context(sessionId)
    session_context['blocks'] = {}
    session_context['version'] = 0
    session_context['updatedAt'] = datetime.now().isoformat()
    
    await save_session_context(sessionId, session_context)
    
    log.info('Context cleared:', {
        'sessionId': sessionId,
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": {"sessionId": sessionId, "cleared": True}}


class ContextLockRequest(BaseModel):
    sessionId: str
    blockType: str
    locked: bool


@router.post("/lock")
async def lock_context(request: ContextLockRequest):
    """Lock or unlock a context block"""
    sessionId = request.sessionId
    blockType = request.blockType
    locked = request.locked
    """Lock or unlock a context block"""
    if not sessionId or not blockType or not isinstance(locked, bool):
        raise HTTPException(
            status_code=400,
            detail="sessionId, blockType, and locked (boolean) are required"
        )
    
    if blockType not in VALID_BLOCK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid blockType. Must be one of: {', '.join(VALID_BLOCK_TYPES)}"
        )
    
    from backend.services.lock_service import lock_context_block
    context = await lock_context_block(sessionId, blockType, locked)
    
    return {
        "ok": True,
        "message": f"Block {blockType} {'locked' if locked else 'unlocked'} successfully",
        "context": context
    }

