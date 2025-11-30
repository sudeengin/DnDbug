"""
Characters router
Converted from api/characters/*.js
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from datetime import datetime
from backend.services.context_service import get_or_create_session_context
from backend.services.storage_service import save_session_context
from backend.services.lock_service import lock_context_block
from backend.utils.logger import logger

router = APIRouter(prefix="/api/characters", tags=["characters"])
log = logger['character']


class CharactersLockRequest(BaseModel):
    sessionId: str
    locked: bool


class CharactersUpsertRequest(BaseModel):
    sessionId: str
    character: Dict[str, Any]


class CharactersDeleteRequest(BaseModel):
    sessionId: str
    characterId: str


@router.get("/list")
async def list_characters(sessionId: str = Query(...)):
    """List characters for a session"""
    if not sessionId:
        raise HTTPException(
            status_code=400,
            detail="sessionId query parameter is required"
        )
    
    try:
        session_context = await get_or_create_session_context(sessionId)
        characters_block = session_context.get('blocks', {}).get('characters')
        
        if not characters_block:
            return {
                "ok": True,
                "list": [],
                "locked": False,
                "version": 0
            }
        
        # Handle both structures: characters_block.list or characters_block.characters
        characters_list = []
        if isinstance(characters_block, dict):
            characters_list = characters_block.get('list') or characters_block.get('characters', [])
        elif isinstance(characters_block, list):
            characters_list = characters_block
        
        return {
            "ok": True,
            "list": characters_list,
            "locked": session_context.get('locks', {}).get('characters', False),
            "version": characters_block.get('version', 0) if isinstance(characters_block, dict) else 0
        }
    
    except Exception as error:
        log.error('Error getting characters:', error)
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/lock")
async def lock_characters(request: CharactersLockRequest):
    """Lock or unlock characters"""
    if not request.sessionId or not isinstance(request.locked, bool):
        raise HTTPException(
            status_code=400,
            detail="sessionId and locked (boolean) are required"
        )
    
    try:
        # Use unified lock service with blockType='characters'
        session_context = await lock_context_block(
            request.sessionId,
            'characters',
            request.locked
        )
        
        log.info('Characters lock updated:', {
            'sessionId': request.sessionId,
            'locked': request.locked,
            'charactersV': session_context.get('meta', {}).get('charactersV'),
            'timestamp': int(datetime.now().timestamp() * 1000)
        })
        
        return {
            "ok": True,
            "data": session_context
        }
    
    except Exception as error:
        log.error('Error updating characters lock:', error)
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/upsert")
async def upsert_character(request: CharactersUpsertRequest):
    """Update or insert a character"""
    if not request.sessionId or not request.character:
        raise HTTPException(
            status_code=400,
            detail="sessionId and character are required"
        )
    
    try:
        session_context = await get_or_create_session_context(request.sessionId)
        characters_block = session_context.get('blocks', {}).get('characters')
        
        if not characters_block or not characters_block.get('list'):
            raise HTTPException(
                status_code=409,
                detail="Characters must be generated before editing."
            )
        
        if characters_block.get('locked'):
            raise HTTPException(
                status_code=409,
                detail="Characters are locked and cannot be edited."
            )
        
        # Find and update the character
        characters_list = characters_block.get('list', [])
        character_index = next(
            (i for i, c in enumerate(characters_list) if c.get('id') == request.character.get('id')),
            -1
        )
        
        if character_index == -1:
            raise HTTPException(status_code=404, detail="Character not found")
        
        # Update the character
        characters_list[character_index] = {**request.character}
        characters_block['version'] = int(datetime.now().timestamp() * 1000)
        session_context['version'] = (session_context.get('version', 0) or 0) + 1
        session_context['updatedAt'] = datetime.now().isoformat()
        
        await save_session_context(request.sessionId, session_context)
        
        log.info('Character updated:', {
            'sessionId': request.sessionId,
            'characterId': request.character.get('id'),
            'characterName': request.character.get('name'),
            'timestamp': int(datetime.now().timestamp() * 1000)
        })
        
        return {
            "ok": True,
            "list": characters_list
        }
    
    except HTTPException:
        raise
    except Exception as error:
        log.error('Error updating character:', error)
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/delete")
async def delete_character(request: CharactersDeleteRequest):
    """Delete a character"""
    if not request.sessionId or not request.characterId:
        raise HTTPException(
            status_code=400,
            detail="sessionId and characterId are required"
        )
    
    try:
        session_context = await get_or_create_session_context(request.sessionId)
        
        if not session_context.get('blocks', {}).get('characters'):
            raise HTTPException(status_code=404, detail="No characters found")
        
        characters_block = session_context['blocks']['characters']
        characters_list = characters_block.get('list', [])
        
        # Find and remove the character
        character_index = next(
            (i for i, c in enumerate(characters_list) if c.get('id') == request.characterId),
            -1
        )
        
        if character_index == -1:
            raise HTTPException(status_code=404, detail="Character not found")
        
        deleted_character = characters_list[character_index]
        characters_list.pop(character_index)
        
        # Update version and timestamp
        characters_block['version'] = int(datetime.now().timestamp() * 1000)
        session_context['version'] = (session_context.get('version', 0) or 0) + 1
        session_context['updatedAt'] = datetime.now().isoformat()
        
        await save_session_context(request.sessionId, session_context)
        
        log.info('Character deleted successfully:', deleted_character.get('name'))
        
        return {
            "ok": True,
            "message": "Character deleted successfully",
            "deletedCharacter": {
                "id": deleted_character.get('id'),
                "name": deleted_character.get('name')
            }
        }
    
    except HTTPException:
        raise
    except Exception as error:
        log.error('Error deleting character:', error)
        raise HTTPException(status_code=500, detail=str(error))


def render_characters_prompt(background_data: Dict[str, Any], player_count: int) -> str:
    """Render the character generation prompt"""
    import json
    background_json = json.dumps(background_data, indent=2)
    
    return f"""You are a D&D GM character designer creating playable PCs with detailed backgrounds. Follow the rules strictly and return valid JSON only.

BACKGROUND CONTEXT (read-only):
{background_json}

PLAYER COUNT: {player_count}

CRITICAL: You MUST generate ALL 20 required fields for each character. Do not omit any fields.

INSTRUCTIONS:

1. LORE & WORLD INTEGRATION
- Use Background Context data (where, when, tone, motifs, anchors) to guide realism
- Characters' pasts must make sense in the established setting
- If background tone = "gothic mystery", avoid heroic comedy; keep motifs consistent
- Extract tone & motifs for aesthetic consistency
- Use why/what fields to determine central narrative tension

2. D&D-LEVEL BACKGROUND DEPTH
- Base style on SRD 2014 manuals (Player's Handbook & Xanathar's Guide)
- Each character's backgroundHistory should read like a mini origin story
- Include: upbringing, defining event, and reason for joining the story
- Use 1–2 short paragraphs (max 10 lines total)

3. RELATIONSHIPS AND HOOKS
- keyRelationships: create 2–3 narrative connections (family, mentor, rival, guild, cult, etc.)
- At least one should tie back to an anchor or motif
- These can later appear as NPCs or Scene hooks

4. FLAWS & SECRETS
- flawOrWeakness and gmSecret must feel playable and substantial
- gmSecret should be 2-3 sentences of rich, interconnected lore
- Connect gmSecret to background context: anchors, motifs, factions, mysteries
- Examples: "Character unknowingly carries a cursed artifact that once belonged to the manor's original owner", "Their mentor was secretly working for the antagonist faction mentioned in the background", "They are the reincarnation of someone who died in the manor's tragic past"
- Avoid generic "trust issues" or "mysterious past" clichés

5. MOTIF RESONANCE
- Use motifAlignment to symbolically connect characters to visual themes
- Mention them naturally in their personality or backgroundHistory

6. PLAYABILITY FOCUS
- All output written in English
- Keep tone immersive and concise — readable for GMs and players alike
- No stats or numeric attributes — this system generates narrative, not mechanics

7. GM SECRET REQUIREMENTS (CRITICAL)
- Each gmSecret must be 2-3 sentences of rich, interconnected lore
- Connect directly to background context: use anchors, factions, mysteries, or motifs
- Create dramatic potential: secrets that can change the story when revealed
- Examples of good gmSecrets:
  * "Character's family was responsible for the manor's downfall, but they don't know it. Their ancestor's betrayal is why the manor is cursed, and the current owner seeks revenge."
  * "The character unknowingly carries the key to the manor's hidden chamber where the original owner's soul is trapped. Opening it will either free or doom the spirit."
  * "Their mentor was secretly a member of the antagonist faction and sent them here as a sacrifice. The character's arrival triggers the final ritual."
- Avoid shallow secrets like "they have trust issues" or "mysterious past"

8. SRD CHARACTER SHEET INTEGRATION
- languages: Array of 2-4 languages the character speaks (include Common + racial languages + learned languages)
- alignment: D&D alignment (e.g., "Lawful Good", "Chaotic Neutral", "True Neutral")
- deity: Religious affiliation or deity worshiped (if any, otherwise null)
- physicalDescription: Detailed appearance including build, distinguishing features, clothing style (exclude height - use separate height field)
- equipmentPreferences: Array of 3-5 preferred starting equipment items (weapons, armor, tools, etc.)
- subrace: Specific subrace if applicable (e.g., "High Elf", "Wood Elf", "Mountain Dwarf", "Hill Dwarf")
- age: Character's age in years (reasonable for their race and background)
- height: Character's height in feet and inches format (e.g., "5'7\"", "6'2\"")
- proficiencies: Array of 3-5 skill proficiencies, tool proficiencies, or other abilities (e.g., "Athletics", "Stealth", "Thieves' Tools", "Herbalism Kit")

Generate exactly {player_count} playable characters (±1 if narratively justified).
Follow all tone/motif/consistency rules from the Background.
This keeps character variety proportional to the party size.

REQUIRED OUTPUT FORMAT - Generate ALL fields for each character:
{{
  "characters": [
    {{
      "name": "Character Name",
      "role": "Their role in the party (e.g., 'Wandering Scholar', 'Mercenary Captain')",
      "race": "D&D race (e.g., 'Human', 'Elf', 'Half-Orc')",
      "class": "D&D class (e.g., 'Bard', 'Fighter', 'Wizard')",
      "personality": "2-3 sentences describing their personality traits and behavior",
      "motivation": "What drives them in this specific story",
      "connectionToStory": "Direct link to the background context or story premise",
      "gmSecret": "Rich, detailed hidden truth (2-3 sentences) connecting to background lore, factions, or past events that the character doesn't know but GM can use for dramatic reveals",
      "potentialConflict": "Internal or external tension that could cause problems",
      "voiceTone": "How they speak or behave (e.g., 'Soft and deliberate', 'Gruff and direct')",
      "inventoryHint": "Small symbolic item they carry (e.g., 'An aged journal', 'A rusted locket')",
      "motifAlignment": ["Array of 2-3 motifs from background that connect to this character"],
      "backgroundHistory": "1-2 paragraphs of their full backstory including upbringing and defining events",
      "keyRelationships": ["Array of 2-3 people, factions, or NPCs they know"],
      "flawOrWeakness": "Defining flaw, vice, or vulnerability that makes them human",
      "languages": ["Array of 2-4 languages (e.g., 'Common', 'Elvish', 'Dwarvish', 'Draconic')"],
      "alignment": "D&D alignment (e.g., 'Lawful Good', 'Chaotic Neutral', 'True Neutral')",
      "deity": "Religious affiliation or deity worshiped (null if none)",
      "physicalDescription": "Detailed appearance including build, distinguishing features, clothing style (exclude height)",
      "equipmentPreferences": ["Array of 3-5 preferred starting equipment items"],
      "subrace": "Specific subrace if applicable (null if none, e.g., 'High Elf', 'Wood Elf', 'Mountain Dwarf')",
      "age": "Character's age in years (reasonable for their race and background)",
      "height": "Character's height in feet and inches format (e.g., '5'7\"', '6'2\"')",
      "proficiencies": ["Array of 3-5 skill proficiencies, tool proficiencies, or other abilities"]
    }}
  ]
}}"""


def build_prompt_context(session_context: Dict[str, Any]) -> Dict[str, Any]:
    """Build prompt context from session context"""
    from backend.services.context_service import process_context_for_prompt
    
    processed = process_context_for_prompt(session_context)
    
    # Extract numberOfPlayers from background
    numberOfPlayers = 4  # default
    if processed.get('background') and 'numberOfPlayers' in session_context.get('blocks', {}).get('background', {}):
        numberOfPlayers = session_context['blocks']['background'].get('numberOfPlayers', 4)
    
    return {
        'background': processed.get('background'),
        'numberOfPlayers': numberOfPlayers,
        'versions': {
            'backgroundV': session_context.get('meta', {}).get('backgroundV', 0),
            'charactersV': session_context.get('meta', {}).get('charactersV', 0)
        }
    }


@router.post("/generate")
async def generate_characters(request: Dict[str, Any]):
    """Generate characters using OpenAI"""
    from openai import OpenAI
    from backend.config import settings
    import json
    import random
    import string
    
    sessionId = request.get("sessionId")
    numberOfPlayers = request.get("numberOfPlayers")
    
    if not sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")
    
    # Check OpenAI API key
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is required for character generation. Please configure OPENAI_API_KEY environment variable."
        )
    
    try:
        # Get session context and build prompt context
        session_context = await get_or_create_session_context(sessionId)
        prompt_context = build_prompt_context(session_context)
        bg = prompt_context.get('background')
        
        # Use numberOfPlayers from request body if provided, otherwise fall back to context
        player_count = numberOfPlayers if numberOfPlayers is not None else prompt_context.get('numberOfPlayers', 4)
        
        # Debug logging
        log.info('Character generation debug:', {
            'sessionId': sessionId,
            'hasBackground': bool(bg),
            'backgroundKeys': list(bg.keys()) if bg else 'no background',
            'numberOfPlayersFromRequest': numberOfPlayers,
            'playerCountFromContext': prompt_context.get('numberOfPlayers'),
            'playerCountUsed': player_count
        })
        
        # Check if background is locked
        is_background_locked = session_context.get('locks', {}).get('background', False)
        
        if not bg or not is_background_locked:
            raise HTTPException(
                status_code=409,
                detail="Background must be locked before generating Characters."
            )
        
        # Clamp player count within [3,6]
        clamped_player_count = min(max(player_count, 3), 6)
        
        # Generate characters using AI
        client = OpenAI(api_key=settings.openai_api_key)
        prompt = render_characters_prompt(bg, clamped_player_count)
        
        response = client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a D&D GM character designer creating playable PCs with detailed backgrounds. Follow the rules strictly and return valid JSON only.'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            temperature=0.9,
            top_p=0.95,
            max_tokens=4000
        )
        
        response_text = response.choices[0].message.content
        if not response_text:
            raise Exception('No response from OpenAI')
        
        # Debug logging for AI response
        log.info('AI Response length:', len(response_text))
        log.info('AI Response preview:', response_text[:500] + '...')
        
        # Parse the JSON response
        try:
            cleaned = response_text.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
            parsed_response = json.loads(cleaned)
            log.info('Parsed response structure:', {
                'hasCharacters': bool(parsed_response.get('characters')),
                'characterCount': len(parsed_response.get('characters', [])),
                'firstCharacterKeys': list(parsed_response['characters'][0].keys()) if parsed_response.get('characters') and len(parsed_response['characters']) > 0 else 'no characters'
            })
        except Exception as parse_error:
            log.error('Failed to parse OpenAI response:', parse_error)
            log.error('Raw response that failed to parse:', response_text)
            raise Exception('Invalid JSON response from AI')
        
        # Validate response structure
        if not isinstance(parsed_response.get('characters'), list):
            raise Exception('Response must contain characters array')
        
        characters_list = parsed_response['characters']
        if len(characters_list) < clamped_player_count - 1 or len(characters_list) > clamped_player_count + 1:
            raise Exception(f'Must generate {clamped_player_count} characters (±1 if narratively justified)')
        
        # Validate each character has required fields
        required_fields = [
            'name', 'role', 'race', 'class', 'personality', 'motivation',
            'connectionToStory', 'gmSecret', 'potentialConflict', 'voiceTone',
            'inventoryHint', 'motifAlignment', 'backgroundHistory', 'keyRelationships', 'flawOrWeakness',
            'languages', 'alignment', 'physicalDescription', 'equipmentPreferences',
            'age', 'height', 'proficiencies'
        ]
        
        optional_fields = ['deity', 'subrace']
        
        for i, char in enumerate(characters_list):
            # Check required fields
            for field in required_fields:
                if not char.get(field):
                    raise Exception(f'Character {i + 1} missing required field: {field}')
            
            # Check optional fields exist (but can be null/empty)
            for field in optional_fields:
                if field not in char:
                    raise Exception(f'Character {i + 1} missing field: {field}')
            
            # Validate array fields
            if not isinstance(char.get('motifAlignment'), list):
                raise Exception(f'Character {i + 1} motifAlignment must be an array')
            if not isinstance(char.get('keyRelationships'), list):
                raise Exception(f'Character {i + 1} keyRelationships must be an array')
            if not isinstance(char.get('languages'), list):
                raise Exception(f'Character {i + 1} languages must be an array')
            if not isinstance(char.get('equipmentPreferences'), list):
                raise Exception(f'Character {i + 1} equipmentPreferences must be an array')
            if not isinstance(char.get('proficiencies'), list):
                raise Exception(f'Character {i + 1} proficiencies must be an array')
            
            # Validate numeric fields
            age = char.get('age')
            if not isinstance(age, int) or age < 1 or age > 1000:
                raise Exception(f'Character {i + 1} age must be a reasonable number between 1 and 1000')
        
        # Generate UUIDs for characters and ensure proper structure
        characters = []
        for char in characters_list:
            characters.append({
                **char,
                'id': f"char_{int(datetime.now().timestamp() * 1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}",
                'status': 'generated'  # Mark newly generated characters
            })
        
        # Store characters in session context
        # Use 'list' to match Express structure
        characters_block = {
            'list': characters,
            'characters': characters,  # Also store as 'characters' for compatibility
            'locked': False,
            'version': int(datetime.now().timestamp() * 1000)
        }
        
        session_context['blocks']['characters'] = characters_block
        session_context['version'] = (session_context.get('version', 0) or 0) + 1
        session_context['updatedAt'] = datetime.now().isoformat()
        
        await save_session_context(sessionId, session_context)
        
        log.info('Characters generated:', {
            'sessionId': sessionId,
            'characterCount': len(characters),
            'timestamp': int(datetime.now().timestamp() * 1000)
        })
        
        return {
            "ok": True,
            "list": characters,
            "playerCount": clamped_player_count
        }
    
    except HTTPException:
        raise
    except Exception as error:
        log.error('Error generating characters:', error)
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/regenerate")
async def regenerate_character_field(request: Dict[str, Any]):
    """Regenerate a character field (requires OpenAI - placeholder for now)"""
    # TODO: Implement OpenAI character field regeneration
    raise HTTPException(
        status_code=501,
        detail="Character field regeneration not yet implemented. This endpoint requires OpenAI integration."
    )


# SRD 2014 Character endpoints
@router.get("/srd2014/list")
async def list_srd2014_characters(sessionId: str = Query(...)):
    """List SRD 2014 characters"""
    if not sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")
    
    try:
        session_context = await get_or_create_session_context(sessionId)
        
        # Get SRD 2014 characters
        characters = session_context.get('blocks', {}).get('srd2014Characters', {}).get('characters', [])
        
        log.info('SRD 2014 characters loaded:', {
            'sessionId': sessionId,
            'characterCount': len(characters),
            'timestamp': int(datetime.now().timestamp() * 1000)
        })
        
        return {
            "ok": True,
            "characters": characters
        }
    
    except Exception as error:
        log.error('Error loading SRD 2014 characters:', error)
        raise HTTPException(status_code=500, detail=str(error))


class SRD2014SaveRequest(BaseModel):
    sessionId: str
    character: Dict[str, Any]


@router.post("/srd2014/save")
async def save_srd2014_character(request: SRD2014SaveRequest):
    """Save SRD 2014 character"""
    if not request.sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")
    
    if not request.character:
        raise HTTPException(status_code=400, detail="character data is required")
    
    try:
        session_context = await get_or_create_session_context(request.sessionId)
        
        # Store SRD 2014 character data
        if 'blocks' not in session_context:
            session_context['blocks'] = {}
        
        if 'srd2014Characters' not in session_context['blocks']:
            session_context['blocks']['srd2014Characters'] = {
                'characters': [],
                'version': int(datetime.now().timestamp() * 1000)
            }
        
        # Update or add character
        characters_list = session_context['blocks']['srd2014Characters']['characters']
        existing_index = next(
            (i for i, c in enumerate(characters_list) if c.get('id') == request.character.get('id')),
            -1
        )
        
        if existing_index >= 0:
            # Update existing character
            characters_list[existing_index] = {
                **request.character,
                'updatedAt': datetime.now().isoformat()
            }
        else:
            # Add new character
            characters_list.append({
                **request.character,
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            })
        
        session_context['blocks']['srd2014Characters']['version'] = int(datetime.now().timestamp() * 1000)
        session_context['version'] = (session_context.get('version', 0) or 0) + 1
        session_context['updatedAt'] = datetime.now().isoformat()
        
        await save_session_context(request.sessionId, session_context)
        
        log.info('SRD 2014 character saved:', {
            'sessionId': request.sessionId,
            'characterId': request.character.get('id'),
            'characterName': request.character.get('name'),
            'timestamp': int(datetime.now().timestamp() * 1000)
        })
        
        return {
            "ok": True,
            "character": request.character,
            "message": "Character saved successfully"
        }
    
    except Exception as error:
        log.error('Error saving SRD 2014 character:', error)
        raise HTTPException(status_code=500, detail=str(error))


class SRD2014DeleteRequest(BaseModel):
    sessionId: str
    characterId: str


@router.post("/srd2014/delete")
async def delete_srd2014_character(request: SRD2014DeleteRequest):
    """Delete SRD 2014 character"""
    if not request.sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")
    
    if not request.characterId:
        raise HTTPException(status_code=400, detail="characterId is required")
    
    try:
        session_context = await get_or_create_session_context(request.sessionId)
        
        # Check if SRD 2014 characters block exists
        if not session_context.get('blocks', {}).get('srd2014Characters', {}).get('characters'):
            raise HTTPException(status_code=404, detail="No saved character sheets found")
        
        characters_list = session_context['blocks']['srd2014Characters']['characters']
        
        # Find and remove the character
        character_index = next(
            (i for i, c in enumerate(characters_list) if c.get('id') == request.characterId),
            -1
        )
        
        if character_index == -1:
            raise HTTPException(status_code=404, detail="Character sheet not found")
        
        deleted_character = characters_list[character_index]
        characters_list.pop(character_index)
        
        # Update version and timestamp
        session_context['blocks']['srd2014Characters']['version'] = int(datetime.now().timestamp() * 1000)
        session_context['version'] = (session_context.get('version', 0) or 0) + 1
        session_context['updatedAt'] = datetime.now().isoformat()
        
        await save_session_context(request.sessionId, session_context)
        
        log.info('SRD 2014 character deleted:', {
            'sessionId': request.sessionId,
            'characterId': deleted_character.get('id'),
            'characterName': deleted_character.get('name'),
            'timestamp': int(datetime.now().timestamp() * 1000)
        })
        
        return {
            "ok": True,
            "message": "Character sheet deleted successfully",
            "deletedCharacter": {
                "id": deleted_character.get('id'),
                "name": deleted_character.get('name')
            }
        }
    
    except HTTPException:
        raise
    except Exception as error:
        log.error('Error deleting SRD 2014 character:', error)
        raise HTTPException(status_code=500, detail=str(error))

