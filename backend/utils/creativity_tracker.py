"""
Creativity Tracker - Prevents repetitive generation patterns
Converted from api/lib/creativityTracker.js
"""
import random
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.services.context_service import get_or_create_session_context
from backend.services.storage_service import save_session_context

MAX_HISTORY = 10  # Keep track of last 10 generations


async def get_creativity_history(session_id: str) -> Dict[str, Any]:
    """Get creativity history for a session"""
    try:
        session_context = await get_or_create_session_context(session_id)
        return session_context.get('creativityHistory', {
            'macroChainApproaches': [],
            'sceneDetailApproaches': [],
            'lastUpdated': None
        })
    except Exception as error:
        print(f'Warning: Failed to get creativity history: {error}')
        return {
            'macroChainApproaches': [],
            'sceneDetailApproaches': [],
            'lastUpdated': None
        }


async def save_creativity_history(session_id: str, history: Dict[str, Any]):
    """Save creativity history for a session"""
    try:
        session_context = await get_or_create_session_context(session_id)
        session_context['creativityHistory'] = {
            **history,
            'lastUpdated': datetime.now().isoformat()
        }
        await save_session_context(session_id, session_context)
    except Exception as error:
        print(f'Warning: Failed to save creativity history: {error}')


def select_creative_approach(approaches: List[str], recent_approaches: Optional[List[str]] = None) -> str:
    """Select a creative approach avoiding recent ones"""
    if recent_approaches is None:
        recent_approaches = []
    
    # If we have fewer approaches than history limit, just pick randomly
    if len(approaches) <= MAX_HISTORY:
        return random.choice(approaches)
    
    # Filter out recent approaches
    available_approaches = [a for a in approaches if a not in recent_approaches]
    
    # If all approaches have been used recently, reset and pick randomly
    if not available_approaches:
        return random.choice(approaches)
    
    # Pick from available approaches
    return random.choice(available_approaches)


async def record_macro_chain_approach(session_id: str, approach: str, narrative_style: str, pacing: str):
    """Record a macro chain generation approach"""
    try:
        history = await get_creativity_history(session_id)
        
        new_record = {
            'approach': approach,
            'narrativeStyle': narrative_style,
            'pacing': pacing,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add to history and maintain size limit
        history['macroChainApproaches'].insert(0, new_record)
        if len(history['macroChainApproaches']) > MAX_HISTORY:
            history['macroChainApproaches'] = history['macroChainApproaches'][:MAX_HISTORY]
        
        await save_creativity_history(session_id, history)
    except Exception as error:
        print(f'Warning: Failed to record macro chain approach: {error}')


async def record_scene_detail_approach(session_id: str, approach: str, detail_style: str, complexity: str):
    """Record a scene detail generation approach"""
    try:
        history = await get_creativity_history(session_id)
        
        new_record = {
            'approach': approach,
            'detailStyle': detail_style,
            'complexity': complexity,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add to history and maintain size limit
        history['sceneDetailApproaches'].insert(0, new_record)
        if len(history['sceneDetailApproaches']) > MAX_HISTORY:
            history['sceneDetailApproaches'] = history['sceneDetailApproaches'][:MAX_HISTORY]
        
        await save_creativity_history(session_id, history)
    except Exception as error:
        print(f'Warning: Failed to record scene detail approach: {error}')


async def get_recent_macro_chain_approaches(session_id: str) -> List[str]:
    """Get recent macro chain approaches for a session"""
    try:
        history = await get_creativity_history(session_id)
        return [record['approach'] for record in history['macroChainApproaches']]
    except Exception as error:
        print(f'Warning: Failed to get recent macro chain approaches: {error}')
        return []


async def get_recent_scene_detail_approaches(session_id: str) -> List[str]:
    """Get recent scene detail approaches for a session"""
    try:
        history = await get_creativity_history(session_id)
        return [record['approach'] for record in history['sceneDetailApproaches']]
    except Exception as error:
        print(f'Warning: Failed to get recent scene detail approaches: {error}')
        return []


async def generate_variation_seed(session_id: str) -> int:
    """Generate a unique variation seed based on session history"""
    try:
        history = await get_creativity_history(session_id)
        timestamp = int(datetime.now().timestamp() * 1000)
        
        # Combine timestamp with session-specific factors
        session_factor = sum(ord(char) for char in session_id)
        history_factor = (len(history['macroChainApproaches']) + len(history['sceneDetailApproaches'])) * 17
        
        return (timestamp + session_factor + history_factor) % 1000
    except Exception as error:
        print(f'Warning: Failed to generate variation seed: {error}')
        return int(datetime.now().timestamp() * 1000) % 1000

