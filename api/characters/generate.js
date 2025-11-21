import OpenAI from 'openai';
import { getOrCreateSessionContext, processContextForPrompt } from '../context.js';
import { saveSessionContext } from '../storage.js';
import { buildPromptContext } from '../lib/promptContext.js';
import logger from '../lib/logger.js';

const log = logger.character;

// Initialize OpenAI client lazily to ensure environment variables are loaded
let openai = null;
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Character generation prompt template
function renderCharactersPrompt(backgroundData, playerCount) {
  const backgroundJson = JSON.stringify(backgroundData, null, 2);
  
    return `You are a D&D GM character designer creating playable PCs with detailed backgrounds. Follow the rules strictly and return valid JSON only.

BACKGROUND CONTEXT (read-only):
${backgroundJson}

PLAYER COUNT: ${playerCount}

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

Generate exactly ${playerCount} playable characters (±1 if narratively justified).
Follow all tone/motif/consistency rules from the Background.
This keeps character variety proportional to the party size.

REQUIRED OUTPUT FORMAT - Generate ALL fields for each character:
{
  "characters": [
    {
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
    }
  ]
}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, numberOfPlayers } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    // Get prompt context and check if background is locked
    const promptContext = await buildPromptContext(sessionId);
    const bg = promptContext.background;
    // Use numberOfPlayers from request body if provided, otherwise fall back to context
    const playerCount = numberOfPlayers !== undefined ? numberOfPlayers : promptContext.numberOfPlayers;
    
    // Debug logging
    log.info('Character generation debug:', {
      sessionId,
      hasBackground: !!bg,
      backgroundType: typeof bg,
      backgroundKeys: bg ? Object.keys(bg) : 'no background',
      numberOfPlayersFromRequest: numberOfPlayers,
      playerCountFromContext: promptContext.numberOfPlayers,
      playerCountUsed: playerCount,
      promptContextKeys: Object.keys(promptContext)
    });
    
    // Get session context to check lock status
    const sessionContext = await getOrCreateSessionContext(sessionId);
    const isBackgroundLocked = sessionContext?.locks?.background === true;
    
    if (!bg || !isBackgroundLocked) {
      res.status(409).json({ 
        error: 'Background must be locked before generating Characters.' 
      });
      return;
    }

    // Clamp player count within [3,6]
    const clampedPlayerCount = Math.min(Math.max(playerCount, 3), 6);

    // Generate characters using AI
    const openai = getOpenAI();
    const prompt = renderCharactersPrompt(bg, clampedPlayerCount);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a D&D GM character designer creating playable PCs with detailed backgrounds. Follow the rules strictly and return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: 4000
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Debug logging for AI response
    log.info('AI Response length:', responseText.length);
    log.info('AI Response preview:', responseText.substring(0, 500) + '...');

    // Parse the JSON response
    let parsedResponse;
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
      log.info('Parsed response structure:', {
        hasCharacters: !!parsedResponse.characters,
        characterCount: parsedResponse.characters?.length || 0,
        firstCharacterKeys: parsedResponse.characters?.[0] ? Object.keys(parsedResponse.characters[0]) : 'no characters'
      });
    } catch (parseError) {
      log.error('Failed to parse OpenAI response:', parseError);
      log.error('Raw response that failed to parse:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate response structure
    if (!Array.isArray(parsedResponse.characters)) {
      throw new Error('Response must contain characters array');
    }

    if (parsedResponse.characters.length < clampedPlayerCount - 1 || parsedResponse.characters.length > clampedPlayerCount + 1) {
      throw new Error(`Must generate ${clampedPlayerCount} characters (±1 if narratively justified)`);
    }

    // Validate each character has required fields
    const requiredFields = [
      'name', 'role', 'race', 'class', 'personality', 'motivation',
      'connectionToStory', 'gmSecret', 'potentialConflict', 'voiceTone',
      'inventoryHint', 'motifAlignment', 'backgroundHistory', 'keyRelationships', 'flawOrWeakness',
      'languages', 'alignment', 'physicalDescription', 'equipmentPreferences',
      'age', 'height', 'proficiencies'
    ];

    // Fields that can be null/empty
    const optionalFields = ['deity', 'subrace'];

    for (let i = 0; i < parsedResponse.characters.length; i++) {
      const char = parsedResponse.characters[i];
      
      // Check required fields
      for (const field of requiredFields) {
        if (!char[field]) {
          throw new Error(`Character ${i + 1} missing required field: ${field}`);
        }
      }
      
      // Check optional fields exist (but can be null/empty)
      for (const field of optionalFields) {
        if (!(field in char)) {
          throw new Error(`Character ${i + 1} missing field: ${field}`);
        }
      }
      
      // Validate array fields
      if (!Array.isArray(char.motifAlignment)) {
        throw new Error(`Character ${i + 1} motifAlignment must be an array`);
      }
      if (!Array.isArray(char.keyRelationships)) {
        throw new Error(`Character ${i + 1} keyRelationships must be an array`);
      }
      if (!Array.isArray(char.languages)) {
        throw new Error(`Character ${i + 1} languages must be an array`);
      }
      if (!Array.isArray(char.equipmentPreferences)) {
        throw new Error(`Character ${i + 1} equipmentPreferences must be an array`);
      }
      if (!Array.isArray(char.proficiencies)) {
        throw new Error(`Character ${i + 1} proficiencies must be an array`);
      }
      
      // Validate numeric fields
      if (typeof char.age !== 'number' || char.age < 1 || char.age > 1000) {
        throw new Error(`Character ${i + 1} age must be a reasonable number between 1 and 1000`);
      }
    }

    // Generate UUIDs for characters and ensure proper structure
    const characters = parsedResponse.characters.map(char => ({
      ...char,
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'generated' // Mark newly generated characters
    }));

    // Store characters in session context
    const charactersBlock = {
      list: characters,
      locked: false,
      version: Date.now()
    };

    sessionContext.blocks.characters = charactersBlock;
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    await saveSessionContext(sessionId, sessionContext);

    log.info('Characters generated:', {
      sessionId,
      characterCount: characters.length,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      list: characters,
      playerCount: clampedPlayerCount
    });

  } catch (error) {
    log.error('Error generating characters:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
