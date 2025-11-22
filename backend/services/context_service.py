"""
Context service for managing session contexts
Converted from api/context.js
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from backend.services.storage_service import (
    save_session_context,
    load_session_context,
    update_session_context
)
from backend.utils.logger import logger

log = logger['context']


async def get_or_create_session_context(session_id: str) -> Dict[str, Any]:
    """Get or create a session context"""
    session_context = await load_session_context(session_id)
    
    if not session_context:
        # Create a new, empty session context
        log.info(f'✅ Creating new session context for {session_id}')
        session_context = {
            'sessionId': session_id,
            'blocks': {},
            'locks': {},
            'meta': {
                'backgroundV': 0,
                'charactersV': 0,
                'macroSnapshotV': 0,
                'updatedAt': datetime.now().isoformat()
            },
            'version': 0,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        await save_session_context(session_id, session_context)
    else:
        log.success(f'✅ Loaded existing session context for {session_id}:', {
            'version': session_context.get('version'),
            'hasBlocks': bool(session_context.get('blocks')),
            'hasBackground': bool(session_context.get('blocks', {}).get('background')),
            'hasCharacters': bool(session_context.get('blocks', {}).get('characters')),
            'hasMacroChains': bool(session_context.get('macroChains')),
            'macroChainCount': len(session_context.get('macroChains', {})),
            'contextSize': len(str(session_context))
        })
    
    # Ensure meta exists for existing sessions
    if 'meta' not in session_context:
        session_context['meta'] = {
            'backgroundV': 0,
            'charactersV': 0,
            'macroSnapshotV': 0,
            'updatedAt': datetime.now().isoformat()
        }
    
    return session_context


def merge_context_data(existing: Optional[Any], new_data: Any, block_type: str) -> Any:
    """Merge context data based on block type"""
    if block_type == 'blueprint':
        # Blueprint always has highest priority - replace completely
        return {**new_data} if isinstance(new_data, dict) else new_data
    
    elif block_type == 'player_hooks':
        # Player hooks are additive - append to existing array
        existing_hooks = existing if isinstance(existing, list) else []
        if isinstance(new_data, list):
            return existing_hooks + new_data
        return existing_hooks + [new_data]
    
    elif block_type == 'world_seeds':
        # World seeds merge arrays additively
        existing_seeds = existing if isinstance(existing, dict) else {}
        return {
            'factions': (existing_seeds.get('factions', []) or []) + (new_data.get('factions', []) or []),
            'locations': (existing_seeds.get('locations', []) or []) + (new_data.get('locations', []) or []),
            'constraints': (existing_seeds.get('constraints', []) or []) + (new_data.get('constraints', []) or [])
        }
    
    elif block_type == 'style_prefs':
        # Style preferences merge, with doNots being additive
        existing_prefs = existing if isinstance(existing, dict) else {}
        return {
            **existing_prefs,
            **new_data,
            'doNots': (existing_prefs.get('doNots', []) or []) + (new_data.get('doNots', []) or [])
        }
    
    elif block_type == 'custom':
        # Custom data merges deeply, preserving existing macro chain data
        merged_custom = {**(existing if isinstance(existing, dict) else {}), **new_data}
        
        # If we're updating macro chain data, preserve the existing macro chain if it exists
        if 'macroChain' in new_data and existing and 'macroChain' in existing:
            merged_custom['macroChain'] = {
                **existing['macroChain'],
                **new_data['macroChain']
            }
        
        return merged_custom
    
    elif block_type == 'background':
        # Background always has highest priority - replace completely
        return {**new_data} if isinstance(new_data, dict) else new_data
    
    elif block_type == 'story_facts':
        # Story facts from scene details are additive
        existing_facts = existing if isinstance(existing, list) else []
        if isinstance(new_data, list):
            return existing_facts + new_data
        return existing_facts + [new_data]
    
    elif block_type == 'story_concept':
        # Story concept always has highest priority - replace completely
        return {**new_data} if isinstance(new_data, dict) else new_data
    
    elif block_type == 'characters':
        # Characters always has highest priority - replace completely
        return {**new_data} if isinstance(new_data, dict) else new_data
    
    else:
        return new_data


def summarize_content(content: str, max_length: int = 200) -> str:
    """Summarize large text content"""
    if not isinstance(content, str) or len(content) <= max_length:
        return content
    
    # Simple summarization - take first 2-3 sentences
    sentences = [s.strip() for s in content.split('.') if s.strip()]
    summary = '. '.join(sentences[:2]).strip()
    
    return summary[:max_length - 3] + '...' if len(summary) > max_length else summary


def process_context_for_prompt(session_context: Dict[str, Any]) -> Dict[str, Any]:
    """Process context for prompt injection"""
    if not session_context or 'blocks' not in session_context:
        return {}
    
    processed = {}
    blocks = session_context['blocks']
    
    # Process blueprint (highest priority)
    if 'blueprint' in blocks and blocks['blueprint']:
        blueprint = blocks['blueprint']
        processed['blueprint'] = {
            'theme': blueprint.get('theme'),
            'core_idea': summarize_content(blueprint.get('core_idea', '')),
            'tone': blueprint.get('tone'),
            'pacing': blueprint.get('pacing'),
            'setting': blueprint.get('setting'),
            'hooks': blueprint.get('hooks', [])[:5]  # Limit to 5 hooks
        }
    
    # Process player hooks (limit to 3 most important)
    if 'player_hooks' in blocks and blocks['player_hooks']:
        hooks = blocks['player_hooks'][:3]
        processed['player_hooks'] = [{
            'name': hook.get('name'),
            'class': hook.get('class'),
            'motivation': summarize_content(hook.get('motivation', '')),
            'ties': hook.get('ties', [])[:2]  # Limit ties
        } for hook in hooks]
    
    # Process world seeds (limit each array)
    if 'world_seeds' in blocks and blocks['world_seeds']:
        seeds = blocks['world_seeds']
        processed['world_seeds'] = {
            'factions': seeds.get('factions', [])[:3],
            'locations': seeds.get('locations', [])[:3],
            'constraints': seeds.get('constraints', [])[:5]
        }
    
    # Process style preferences
    if 'style_prefs' in blocks and blocks['style_prefs']:
        prefs = blocks['style_prefs']
        processed['style_prefs'] = {
            'language': prefs.get('language'),
            'tone': prefs.get('tone'),
            'pacingHints': prefs.get('pacingHints', [])[:3],
            'doNots': prefs.get('doNots', [])[:5]
        }
    
    # Process background (highest priority after blueprint)
    if 'background' in blocks and blocks['background']:
        bg = blocks['background']
        log.debug('Processing background:', str(bg))
        processed['background'] = {
            'premise': bg.get('premise'),
            'tone_rules': bg.get('tone_rules', [])[:5],
            'stakes': bg.get('stakes', [])[:5],
            'mysteries': bg.get('mysteries', [])[:5],
            'factions': bg.get('factions', [])[:5],
            'location_palette': bg.get('location_palette', [])[:5],
            'npc_roster_skeleton': bg.get('npc_roster_skeleton', [])[:5],
            'motifs': bg.get('motifs', [])[:5],
            'doNots': bg.get('doNots', [])[:5],
            'playstyle_implications': bg.get('playstyle_implications', [])[:5]
        }
    
    # Process story concept (highest priority)
    if 'story_concept' in blocks and blocks['story_concept']:
        concept = blocks['story_concept']
        processed['story_concept'] = {
            'concept': concept.get('concept'),
            'meta': concept.get('meta'),
            'timestamp': concept.get('timestamp')
        }
    
    # Process characters
    if 'characters' in blocks and blocks['characters']:
        chars = blocks['characters']
        processed['characters'] = {
            'list': (chars.get('characters', []) or [])[:5],  # Limit to 5 characters
            'locked': chars.get('locked', False),
            'version': chars.get('version', 0)
        }
    
    return processed

