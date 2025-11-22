"""
Unified Lock Service
Converted from api/lib/lockService.js
"""
from typing import Dict, Any, List
from datetime import datetime
from backend.services.context_service import get_or_create_session_context
from backend.services.storage_service import save_session_context, load_session_context, load_chain
from backend.utils.logger import logger

log = logger.get('lock') or logger.get('context')

# Valid block types for context locking
VALID_BLOCK_TYPES = [
    'blueprint',
    'player_hooks',
    'world_seeds',
    'style_prefs',
    'custom',
    'background',
    'story_concept',
    'characters'
]


async def lock_context_block(session_id: str, block_type: str, locked: bool) -> Dict[str, Any]:
    """Unified function to lock/unlock any context block"""
    if block_type not in VALID_BLOCK_TYPES:
        raise ValueError(f'Invalid blockType: {block_type}. Must be one of: {", ".join(VALID_BLOCK_TYPES)}')
    
    session_context = await get_or_create_session_context(session_id)
    
    # Initialize locks object if it doesn't exist
    if 'locks' not in session_context:
        session_context['locks'] = {}
    
    # Update lock status
    session_context['locks'][block_type] = locked
    session_context['version'] = (session_context.get('version', 0) or 0) + 1
    session_context['updatedAt'] = datetime.now().isoformat()
    
    # Bump specific version when locking (to track changes for staleness detection)
    if locked:
        if block_type == 'background':
            if 'meta' not in session_context:
                session_context['meta'] = {}
            session_context['meta']['backgroundV'] = (session_context['meta'].get('backgroundV', 0) or 0) + 1
        elif block_type == 'characters':
            if 'meta' not in session_context:
                session_context['meta'] = {}
            session_context['meta']['charactersV'] = (session_context['meta'].get('charactersV', 0) or 0) + 1
    
    # Save the updated context
    await save_session_context(session_id, session_context)
    
    log.info('Context block locked:', {
        'sessionId': session_id,
        'blockType': block_type,
        'locked': locked,
        'version': session_context['version'],
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return session_context


async def lock_chain(session_id: str, chain_id: str, locked: bool) -> Dict[str, Any]:
    """Lock or unlock a macro chain"""
    session_context = await load_session_context(session_id)
    
    if not session_context:
        raise Exception('Session not found')
    
    # Find the macro chain - try session context first
    macro_chain = None
    if session_context.get('macroChains') and chain_id in session_context['macroChains']:
        macro_chain = session_context['macroChains'][chain_id]
    elif session_context.get('blocks', {}).get('custom', {}).get('macroChain', {}).get('chainId') == chain_id:
        macro_chain = session_context['blocks']['custom']['macroChain']
    
    # If not found in session context, try the old storage system (migration)
    if not macro_chain:
        try:
            legacy_chain = await load_chain(chain_id)
            
            # If found in old storage, migrate it to session context
            if legacy_chain:
                if 'macroChains' not in session_context:
                    session_context['macroChains'] = {}
                session_context['macroChains'][chain_id] = legacy_chain
                session_context['updatedAt'] = datetime.now().isoformat()
                await save_session_context(session_id, session_context)
                macro_chain = legacy_chain
                log.info(f'Chain {chain_id} migrated from old storage to session context')
        except Exception as error:
            log.warn('Failed to load chain from old storage:', error)
    
    if not macro_chain:
        raise Exception('Macro chain not found. Generate a chain first.')
    
    # Validate current state
    current_status = macro_chain.get('status', 'Draft')
    if locked and current_status == 'Locked':
        raise Exception('Macro chain is already locked')
    if not locked and current_status != 'Locked':
        raise Exception('Macro chain is not locked')
    
    # Update chain status
    updated_chain = {
        **macro_chain,
        'status': 'Locked' if locked else 'Edited',
        'version': (macro_chain.get('version', 1) or 1) + 1,
        'lastUpdatedAt': datetime.now().isoformat()
    }
    
    if locked:
        updated_chain['lockedAt'] = datetime.now().isoformat()
    else:
        updated_chain.pop('lockedAt', None)
    
    # Store in session context
    if 'macroChains' not in session_context:
        session_context['macroChains'] = {}
    session_context['macroChains'][chain_id] = updated_chain
    
    # Keep UI in sync - also update context.blocks.custom.macroChain
    if 'blocks' not in session_context:
        session_context['blocks'] = {}
    if 'custom' not in session_context['blocks']:
        session_context['blocks']['custom'] = {}
    session_context['blocks']['custom']['macroChain'] = {
        'chainId': updated_chain['chainId'],
        'scenes': updated_chain.get('scenes', []),
        'status': updated_chain['status'],
        'version': updated_chain['version'],
        'lastUpdatedAt': updated_chain['lastUpdatedAt'],
        'meta': updated_chain.get('meta'),
        'createdAt': updated_chain.get('createdAt'),
        'updatedAt': updated_chain.get('updatedAt'),
        'lockedAt': updated_chain.get('lockedAt')
    }
    
    # If unlocking, mark ALL scene details as NeedsRegen (they depend on the chain)
    affected_scenes = []
    if not locked and session_context.get('sceneDetails'):
        for scene_id, scene_detail in session_context['sceneDetails'].items():
            if scene_detail and scene_detail.get('sceneId'):
                scene_detail['status'] = 'NeedsRegen'
                scene_detail['lastUpdatedAt'] = datetime.now().isoformat()
                scene_detail['version'] = (scene_detail.get('version', 0) or 0) + 1
                affected_scenes.append(scene_id)
        log.info('Chain unlocked - all scenes marked as NeedsRegen:', {
            'chainId': chain_id,
            'affectedScenesCount': len(affected_scenes)
        })
    
    session_context['updatedAt'] = datetime.now().isoformat()
    await save_session_context(session_id, session_context)
    
    log.info(f'Macro chain {"locked" if locked else "unlocked"}:', {
        'sessionId': session_id,
        'chainId': chain_id,
        'status': updated_chain['status'],
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {
        'chain': updated_chain,
        'sessionContext': session_context,
        'affectedScenes': affected_scenes if not locked else []
    }


async def lock_scene(session_id: str, scene_id: str, locked: bool) -> Dict[str, Any]:
    """Lock or unlock a scene detail"""
    session_context = await get_or_create_session_context(session_id)
    
    # Find the scene detail
    if not session_context.get('sceneDetails') or scene_id not in session_context['sceneDetails']:
        raise Exception('Scene detail not found')
    
    scene_detail = session_context['sceneDetails'][scene_id]
    current_status = scene_detail.get('status', 'Draft')
    
    # Validate current state
    if locked and current_status == 'Locked':
        raise Exception('Scene is already locked')
    if not locked and current_status != 'Locked':
        raise Exception('Scene is not locked')
    
    # Update scene status
    updated_detail = {
        **scene_detail,
        'status': 'Locked' if locked else 'NeedsRegen',
        'version': (scene_detail.get('version', 1) or 1) + 1,
        'lastUpdatedAt': datetime.now().isoformat()
    }
    
    if locked:
        updated_detail['lockedAt'] = datetime.now().isoformat()
    
    session_context['sceneDetails'][scene_id] = updated_detail
    
    # If unlocking, mark later scenes as NeedsRegen
    affected_scenes = []
    if not locked and session_context.get('sceneDetails'):
        current_sequence = scene_detail.get('sequence', 0)
        for scene_id_key, detail in session_context['sceneDetails'].items():
            if detail.get('sequence', 0) > current_sequence and detail.get('status') == 'Locked':
                detail['status'] = 'NeedsRegen'
                affected_scenes.append(scene_id_key)
    
    session_context['updatedAt'] = datetime.now().isoformat()
    await save_session_context(session_id, session_context)
    
    log.info(f'Scene {"locked" if locked else "unlocked"}:', {
        'sessionId': session_id,
        'sceneId': scene_id,
        'status': updated_detail['status'],
        'affectedScenesCount': len(affected_scenes),
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {
        'sceneDetail': updated_detail,
        'affectedScenes': affected_scenes,
        'sessionContext': session_context
    }


async def is_context_block_locked(session_id: str, block_type: str) -> bool:
    """Check if a context block is locked"""
    session_context = await get_or_create_session_context(session_id)
    return session_context.get('locks', {}).get(block_type, False)


async def is_chain_locked(session_id: str, chain_id: str) -> bool:
    """Check if a chain is locked"""
    session_context = await get_or_create_session_context(session_id)
    chain = session_context.get('macroChains', {}).get(chain_id) or \
            session_context.get('blocks', {}).get('custom', {}).get('macroChain')
    return chain and chain.get('status') == 'Locked'


async def is_scene_locked(session_id: str, scene_id: str) -> bool:
    """Check if a scene is locked"""
    session_context = await get_or_create_session_context(session_id)
    scene_detail = session_context.get('sceneDetails', {}).get(scene_id)
    return scene_detail and scene_detail.get('status') == 'Locked'

