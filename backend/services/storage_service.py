"""
Storage service for chains and session contexts
Converted from api/storage.js
"""
import json
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
import aiofiles
from backend.config import settings
from backend.utils.logger import logger

log = logger['storage']

# Use absolute path from settings
DATA_DIR = Path(settings.data_dir)
CHAINS_FILE = DATA_DIR / "chains.json"
CONTEXT_FILE = DATA_DIR / "context.json"
PROJECTS_FILE = Path("projects.json")

# In-memory locks to prevent race conditions
_session_locks: Dict[str, int] = {}


async def ensure_data_dir():
    """Ensure data directory exists"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


# Chain storage functions
async def save_chain(chain: Dict[str, Any]) -> Dict[str, Any]:
    """Save a chain to storage"""
    await ensure_data_dir()
    
    try:
        existing_data = await load_all_chains()
        existing_data[chain['chainId']] = {
            **chain,
            'updatedAt': __import__('datetime').datetime.now().isoformat()
        }
        
        async with aiofiles.open(CHAINS_FILE, 'w') as f:
            await f.write(json.dumps(existing_data, indent=2))
        
        log.success('Chain saved:', chain['chainId'])
        return chain
    except Exception as error:
        log.error('Error saving chain:', error)
        raise Exception('Failed to save chain')


async def load_chain(chain_id: str) -> Optional[Dict[str, Any]]:
    """Load a chain from storage"""
    await ensure_data_dir()
    
    try:
        all_chains = await load_all_chains()
        chain = all_chains.get(chain_id)
        if chain:
            log.debug('Chain loaded:', chain_id)
        else:
            log.warn('Chain not found:', chain_id)
        return chain
    except Exception as error:
        log.error('Error loading chain:', error)
        return None


async def load_all_chains() -> Dict[str, Any]:
    """Load all chains from storage"""
    await ensure_data_dir()
    
    try:
        if CHAINS_FILE.exists():
            async with aiofiles.open(CHAINS_FILE, 'r') as f:
                data = await f.read()
                return json.loads(data)
    except Exception:
        pass
    
    return {}


async def update_chain(chain_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a chain in storage"""
    await ensure_data_dir()
    
    try:
        all_chains = await load_all_chains()
        existing_chain = all_chains.get(chain_id)
        
        if not existing_chain:
            raise Exception('Chain not found')
        
        updated_chain = {
            **existing_chain,
            **updates,
            'updatedAt': __import__('datetime').datetime.now().isoformat()
        }
        
        all_chains[chain_id] = updated_chain
        async with aiofiles.open(CHAINS_FILE, 'w') as f:
            await f.write(json.dumps(all_chains, indent=2))
        
        log.success('Chain updated:', chain_id)
        return updated_chain
    except Exception as error:
        log.error('Error updating chain:', error)
        raise Exception('Failed to update chain')


async def delete_chain(chain_id: str) -> bool:
    """Delete a chain from storage"""
    await ensure_data_dir()
    
    try:
        all_chains = await load_all_chains()
        if chain_id in all_chains:
            del all_chains[chain_id]
            async with aiofiles.open(CHAINS_FILE, 'w') as f:
                await f.write(json.dumps(all_chains, indent=2))
            log.success('Chain deleted:', chain_id)
            return True
        return False
    except Exception as error:
        log.error('Error deleting chain:', error)
        raise Exception('Failed to delete chain')


# Context storage functions
async def save_session_context(session_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Save session context to storage with locking"""
    await ensure_data_dir()
    
    lock_key = f"session_{session_id}"
    lock_timeout = 5000  # 5 second timeout
    
    # Check if lock exists
    if lock_key in _session_locks:
        log.warn('⚠️ Session context save blocked - another operation in progress', {
            'sessionId': session_id,
            'lockKey': lock_key,
            'waitingFor': _session_locks[lock_key]
        })
        
        # Wait for lock to be released
        attempts = 0
        while lock_key in _session_locks and attempts < 10:
            await asyncio.sleep(0.1)
            attempts += 1
        
        if lock_key in _session_locks:
            raise Exception(f'Session context save timeout for {session_id}')
    
    # Set lock
    _session_locks[lock_key] = __import__('time').time() * 1000
    
    try:
        all_contexts = await load_all_session_contexts()
        all_contexts[session_id] = {
            **context,
            'updatedAt': __import__('datetime').datetime.now().isoformat()
        }
        
        async with aiofiles.open(CONTEXT_FILE, 'w') as f:
            await f.write(json.dumps(all_contexts, indent=2))
        
        log.success('Session context saved:', session_id)
        return context
    except Exception as error:
        log.error('Error saving session context:', error)
        raise Exception('Failed to save session context')
    finally:
        # Release lock
        _session_locks.pop(lock_key, None)


async def load_session_context(session_id: str) -> Optional[Dict[str, Any]]:
    """Load session context from storage"""
    await ensure_data_dir()
    
    try:
        all_contexts = await load_all_session_contexts()
        context = all_contexts.get(session_id)
        
        log.debug('🔍 Loading session context:', {
            'sessionId': session_id,
            'found': context is not None,
            'allSessionIds': list(all_contexts.keys()),
            'contextSize': len(json.dumps(context)) if context else 0,
            'hasLocks': bool(context and context.get('locks')),
            'hasBackground': bool(context and context.get('blocks', {}).get('background')),
            'hasCharacters': bool(context and context.get('blocks', {}).get('characters')),
            'version': context.get('version') if context else 'N/A'
        })
        
        if context:
            log.debug('Session context loaded:', session_id)
        else:
            log.warn('Session context not found:', session_id, {
                'availableSessions': list(all_contexts.keys()),
                'timestamp': __import__('datetime').datetime.now().isoformat()
            })
        
        return context
    except Exception as error:
        log.error('Error loading session context:', error)
        return None


async def load_all_session_contexts() -> Dict[str, Any]:
    """Load all session contexts from storage"""
    await ensure_data_dir()
    
    try:
        if CONTEXT_FILE.exists():
            async with aiofiles.open(CONTEXT_FILE, 'r') as f:
                data = await f.read()
                return json.loads(data)
    except Exception:
        pass
    
    return {}


async def update_session_context(session_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update session context in storage"""
    await ensure_data_dir()
    
    try:
        all_contexts = await load_all_session_contexts()
        existing_context = all_contexts.get(session_id)
        
        if not existing_context:
            raise Exception('Session context not found')
        
        # Deep merge blocks to preserve all existing blocks and nested data
        merged_blocks = existing_context.get('blocks', {}).copy()
        
        if 'blocks' in updates:
            # Merge each block type
            for block_type, block_data in updates['blocks'].items():
                if block_type == 'custom' and 'custom' in merged_blocks:
                    # Deep merge custom block to preserve existing custom data
                    merged_blocks['custom'] = {
                        **merged_blocks['custom'],
                        **block_data
                    }
                else:
                    # Replace other block types
                    merged_blocks[block_type] = block_data
        
        # Deep merge macroChains to preserve other chains
        merged_macro_chains = existing_context.get('macroChains', {}).copy()
        if 'macroChains' in updates:
            for chain_id, chain_data in updates['macroChains'].items():
                merged_macro_chains[chain_id] = chain_data
        
        updated_context = {
            **existing_context,
            **updates,
            'blocks': merged_blocks,
            'macroChains': merged_macro_chains,
            'updatedAt': __import__('datetime').datetime.now().isoformat()
        }
        
        all_contexts[session_id] = updated_context
        async with aiofiles.open(CONTEXT_FILE, 'w') as f:
            await f.write(json.dumps(all_contexts, indent=2))
        
        log.success('Session context updated:', session_id)
        return updated_context
    except Exception as error:
        log.error('Error updating session context:', error)
        raise Exception('Failed to update session context')


# Project storage functions
async def load_projects() -> Dict[str, Any]:
    """Load projects from file"""
    try:
        if PROJECTS_FILE.exists():
            async with aiofiles.open(PROJECTS_FILE, 'r') as f:
                data = await f.read()
                projects_array = json.loads(data)
                return {p['id']: p for p in projects_array}
    except Exception as error:
        log.error('Error loading projects:', error)
    
    return {}


async def save_projects(projects: Dict[str, Any]):
    """Save projects to file"""
    try:
        projects_array = list(projects.values())
        async with aiofiles.open(PROJECTS_FILE, 'w') as f:
            await f.write(json.dumps(projects_array, indent=2))
    except Exception as error:
        log.error('Error saving projects:', error)

