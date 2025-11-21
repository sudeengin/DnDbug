import OpenAI from 'openai';
import { getOrCreateSessionContext } from '../context.js';
import { saveSessionContext } from '../storage.js';
import { buildPromptContext } from '../lib/promptContext.js';
import logger from "../lib/logger.js";

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

// Character field regeneration prompt template
function renderRegeneratePrompt(backgroundData, character, fieldName, gmIntent = null) {
  const backgroundJson = JSON.stringify(backgroundData, null, 2);
  
  // For class/race-dependent fields, strip out the old value so AI doesn't try to maintain consistency with it
  const classRaceDependentFields = ['languages', 'proficiencies', 'equipmentPreferences'];
  let characterForPrompt = { ...character };
  
  if (classRaceDependentFields.includes(fieldName)) {
    // Remove the field we're regenerating so AI generates fresh based purely on class/race
    delete characterForPrompt[fieldName];
  }
  
  const characterJson = JSON.stringify(characterForPrompt, null, 2);
  
  const fieldDescriptions = {
    personality: "2-3 sentences describing their personality traits and behavior",
    motivation: "What drives them in this specific story",
    connectionToStory: "Direct link to the background context or story premise",
    gmSecret: "Rich, detailed hidden truth (2-3 sentences) connecting to background lore, factions, or past events that the character doesn't know but GM can use for dramatic reveals",
    potentialConflict: "Internal or external tension that could cause problems",
    voiceTone: "How they speak or behave (e.g., 'Soft and deliberate', 'Gruff and direct')",
    inventoryHint: "Small symbolic item they carry (e.g., 'An aged journal', 'A rusted locket')",
    backgroundHistory: "1-2 paragraphs of their full backstory including upbringing and defining events",
    flawOrWeakness: "Defining flaw, vice, or vulnerability that makes them human",
    physicalDescription: "Detailed appearance including build, distinguishing features, clothing style, and any notable physical characteristics",
    languages: "Comma-separated list of languages the character knows based on race, class, and background (e.g., 'Common, Elvish, Dwarvish')",
    proficiencies: "Comma-separated list of skill proficiencies, tool proficiencies, and weapon proficiencies based on class, race, and background (e.g., 'Athletics, Stealth, Thieves Tools, Longswords')",
    equipmentPreferences: "Comma-separated list of typical equipment and gear the character prefers based on class and background (e.g., 'Quarterstaff, Spellbook, Component pouch, Ink and quill')",
    motifAlignment: "Comma-separated list of thematic motifs that align with the character's personality and the background setting (e.g., 'decay, secrets, family curses')"
  };

  const fieldDescription = fieldDescriptions[fieldName] || "Character field";
  
  // Extract class and race for emphasis at the top
  const characterClass = character.class || 'Unknown';
  const characterRace = character.race || 'Unknown';
  
  let prompt = `You are a D&D GM character designer regenerating a specific field for an existing character. Follow the rules strictly and return valid JSON only.

⚠️ CRITICAL CHARACTER INFO:
- CLASS: ${characterClass}
- RACE: ${characterRace}

BACKGROUND CONTEXT (read-only):
${backgroundJson}

EXISTING CHARACTER:
${characterJson}

FIELD TO REGENERATE: ${fieldName}
FIELD DESCRIPTION: ${fieldDescription}

INSTRUCTIONS:

1. LORE & WORLD INTEGRATION
- Use Background Context data (where, when, tone, motifs, anchors) to guide realism
- The regenerated field must make sense in the established setting
- If background tone = "gothic mystery", avoid heroic comedy; keep motifs consistent
- Extract tone & motifs for aesthetic consistency
- Use why/what fields to determine central narrative tension

2. CHARACTER CONSISTENCY
- The regenerated field must be consistent with the existing character's other fields
- Maintain the character's established race, class, role, and overall personality
- Ensure the new field doesn't contradict other character details

3. CLASS/RACE-DEPENDENT FIELDS (languages, proficiencies, equipmentPreferences)
- When regenerating these fields, PRIORITIZE the character's current class and race
- IGNORE existing values that don't match the current class/race
- Generate new values PURELY based on SRD 2014 rules for the current class and race
- If the character's class is Druid, provide Druid equipment (NOT wizard or other class equipment)
- If the character's race is Elf, provide Elf languages and proficiencies (NOT human or other race features)

4. FIELD-SPECIFIC REQUIREMENTS`;

  if (fieldName === 'gmSecret') {
    prompt += `
- Must be 2-3 sentences of rich, interconnected lore
- Connect directly to background context: use anchors, factions, mysteries, or motifs
- Create dramatic potential: secrets that can change the story when revealed
- Examples of good gmSecrets:
  * "Character's family was responsible for the manor's downfall, but they don't know it. Their ancestor's betrayal is why the manor is cursed, and the current owner seeks revenge."
  * "The character unknowingly carries the key to the manor's hidden chamber where the original owner's soul is trapped. Opening it will either free or doom the spirit."
  * "Their mentor was secretly a member of the antagonist faction and sent them here as a sacrifice. The character's arrival triggers the final ritual."
- Avoid shallow secrets like "they have trust issues" or "mysterious past"`;
  } else if (fieldName === 'backgroundHistory') {
    prompt += `
- Should read like a mini origin story
- Include: upbringing, defining event, and reason for joining the story
- Use 1–2 short paragraphs (max 10 lines total)
- Base style on SRD 2014 manuals (Player's Handbook & Xanathar's Guide)`;
  } else if (fieldName === 'personality') {
    prompt += `
- Focus on personality traits and behavior patterns
- Should be 2-3 sentences
- Make it distinctive and memorable for roleplay`;
  } else if (fieldName === 'physicalDescription') {
    prompt += `
- Should be 2-3 sentences describing appearance
- Include: build, height/weight, distinguishing features, clothing style
- Be specific and memorable for roleplay`;
  } else if (fieldName === 'languages') {
    prompt += `
- Return a comma-separated list of languages
- Base STRICTLY on character's CURRENT race and class - ignore existing languages that don't match
- Follow SRD 2014 rules for language proficiencies
- DO NOT carry over languages from a different race (e.g., if race is Dwarf, include Dwarvish; if Elf, include Elvish)
- Examples by race:
  * Elf: "Common, Elvish"
  * Dwarf: "Common, Dwarvish"
  * Dragonborn: "Common, Draconic"
  * Human: "Common" plus one extra language based on background`;
  } else if (fieldName === 'proficiencies') {
    prompt += `
- Return a comma-separated list of proficiencies
- Include skill proficiencies, tool proficiencies, and weapon proficiencies
- Base STRICTLY on character's CURRENT class and race per SRD 2014 rules - ignore existing proficiencies that don't match
- DO NOT carry over proficiencies from a different class
- Examples by class:
  * Druid: "Nature, Animal Handling, Perception, Herbalism Kit"
  * Wizard: "Arcana, History, Investigation, Religion"
  * Rogue: "Stealth, Sleight of Hand, Acrobatics, Thieves' Tools"
  * Fighter: "Athletics, Intimidation, All Armor, All Weapons"`;
  } else if (fieldName === 'equipmentPreferences') {
    prompt += `
- Return a comma-separated list of equipment for a ${characterClass}
- ⚠️ CRITICAL: The character's class is ${characterClass} - generate equipment ONLY for this class
- COMPLETELY IGNORE any narrative context, background, or personality that suggests other classes
- Follow SRD 2014 starting equipment for ${characterClass} class EXACTLY
- DO NOT include equipment from other classes under ANY circumstances

REQUIRED EQUIPMENT BY CLASS:
- Barbarian: "Greataxe, Handaxes, Javelins, Explorer's Pack, Leather Armor"
- Bard: "Rapier, Lute, Leather Armor, Dagger, Entertainer's Pack"
- Cleric: "Mace, Shield, Chain Mail, Holy Symbol, Priest's Pack"
- Druid: "Wooden Shield, Druidic Focus, Scimitar, Leather Armor, Herbalism Kit"
- Fighter: "Longsword, Shield, Chain Mail, Crossbow, Adventurer's Pack"
- Monk: "Shortsword, Dart, Explorer's Pack, Simple Weapon"
- Paladin: "Longsword, Shield, Plate Mail, Holy Symbol, Priest's Pack"
- Ranger: "Longbow, Shortswords, Leather Armor, Explorer's Pack, Arrows"
- Rogue: "Rapier, Shortbow, Thieves' Tools, Leather Armor, Burglar's Pack"
- Sorcerer: "Dagger, Component Pouch, Crossbow, Dungeoneer's Pack, Arcane Focus"
- Warlock: "Dagger, Arcane Focus, Leather Armor, Scholar's Pack, Crossbow"
- Wizard: "Spellbook, Arcane Focus, Component Pouch, Quarterstaff, Scholar's Pack"

⚠️ For class ${characterClass}, use equipment from the ${characterClass} list ONLY.
Do NOT use Cleric equipment if class is Druid. Do NOT use Wizard equipment if class is Cleric.
The class is ${characterClass}. Generate ${characterClass} equipment.`;
  } else if (fieldName === 'motifAlignment') {
    prompt += `
- Return a comma-separated list of thematic motifs
- Base on background setting's motifs and character's personality
- Connect to the story's tone and atmosphere
- Examples: "decay, secrets, family curses" or "light, hope, redemption"`;
  }

  if (gmIntent) {
    prompt += `

GM INTENT:
${gmIntent}

Please incorporate the GM's intent into the regenerated field while maintaining consistency with the character and background.`;
  }

  prompt += `

REQUIRED OUTPUT FORMAT - Return only the regenerated field value:
{
  "regeneratedField": "The new value for ${fieldName}"
}

IMPORTANT: Return ONLY valid JSON with the exact structure above. Do not include any markdown formatting, bold text, or field labels. Just the JSON object with the regeneratedField property.`;

  return prompt;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, characterId, fieldName, gmIntent, characterData } = req.body;

    if (!sessionId || !characterId || !fieldName) {
      res.status(400).json({ error: 'sessionId, characterId, and fieldName are required' });
      return;
    }

    // Validate field name
    const validFields = [
      'personality', 'motivation', 'connectionToStory', 'gmSecret', 
      'potentialConflict', 'voiceTone', 'inventoryHint', 'backgroundHistory', 
      'flawOrWeakness', 'physicalDescription', 'languages', 'proficiencies',
      'equipmentPreferences', 'motifAlignment'
    ];
    
    if (!validFields.includes(fieldName)) {
      res.status(400).json({ error: `Invalid field name. Must be one of: ${validFields.join(', ')}` });
      return;
    }

    // Get prompt context and check if background is locked
    const promptContext = await buildPromptContext(sessionId);
    const bg = promptContext.background;
    
    if (!bg) {
      res.status(409).json({ 
        error: 'Background must be generated before regenerating character fields.' 
      });
      return;
    }

    // Get session context to check lock status and find character
    const sessionContext = await getOrCreateSessionContext(sessionId);
    const charactersBlock = sessionContext?.blocks?.characters;

    if (!charactersBlock || !charactersBlock.list) {
      res.status(409).json({ 
        error: 'Characters must be generated before regenerating fields.' 
      });
      return;
    }

    if (charactersBlock.locked) {
      res.status(409).json({ 
        error: 'Characters are locked and cannot be edited.' 
      });
      return;
    }

    // Use provided characterData if available (has latest changes), otherwise load from database
    let character;
    if (characterData) {
      character = characterData;
      log.info('Using provided character data (latest changes):', {
        sessionId,
        characterId,
        characterClass: character.class,
        characterRace: character.race
      });
    } else {
      // Find the character from database
      character = charactersBlock.list.find(c => c.id === characterId);
      if (!character) {
        res.status(404).json({ error: 'Character not found' });
        return;
      }
      log.info('Loaded character from database:', {
        sessionId,
        characterId,
        characterClass: character.class,
        characterRace: character.race
      });
    }

    // Generate regenerated field using AI
    const openai = getOpenAI();
    const prompt = renderRegeneratePrompt(bg, character, fieldName, gmIntent);
    
    // Log prompt details for debugging
    log.info('Regeneration prompt details:', {
      sessionId,
      characterId,
      characterName: character.name,
      characterClass: character.class,
      characterRace: character.race,
      fieldName,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 500)
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a D&D GM character designer regenerating specific character fields. Follow the rules strictly and return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: 1000
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Log AI response for debugging
    log.info('OpenAI regeneration response:', {
      sessionId,
      characterId,
      fieldName,
      characterClass: character.class,
      responsePreview: responseText.substring(0, 300),
      fullResponseLength: responseText.length
    });

    // Parse the response - handle different formats
    let regeneratedField;
    try {
      // First try to parse as JSON
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedResponse = JSON.parse(cleaned);
      
      if (parsedResponse.regeneratedField) {
        regeneratedField = parsedResponse.regeneratedField;
      } else if (parsedResponse[fieldName]) {
        regeneratedField = parsedResponse[fieldName];
      } else {
        throw new Error('No regenerated field found in JSON response');
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract from markdown or plain text
      log.info('JSON parsing failed, trying text extraction:', parseError.message);
      
      // Remove markdown formatting
      let cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*([^*]+)\*/g, '$1')    // Remove italic formatting
        .trim();
      
      // Try to extract field value from different patterns
      const patterns = [
        // Pattern 1: **Field Name:** value
        new RegExp(`\\*\\*${fieldName.replace(/([A-Z])/g, ' $1').trim()}\\*\\*:\\s*(.+?)(?=\\n\\*\\*|$)`, 'is'),
        // Pattern 2: Field Name: value
        new RegExp(`${fieldName.replace(/([A-Z])/g, ' $1').trim()}:\\s*(.+?)(?=\\n[A-Z]|$)`, 'is'),
        // Pattern 3: Just the value (if it's the only content)
        /^(.+)$/s
      ];
      
      for (const pattern of patterns) {
        const match = cleanedText.match(pattern);
        if (match && match[1]) {
          regeneratedField = match[1].trim();
          break;
        }
      }
      
      // If no pattern matched, use the entire cleaned text
      if (!regeneratedField) {
        regeneratedField = cleanedText;
      }
      
      log.info('Extracted field value:', {
        originalResponse: responseText.substring(0, 200) + '...',
        extractedValue: regeneratedField.substring(0, 100) + '...'
      });
    }

    // Validate that we have a field value
    if (!regeneratedField || regeneratedField.trim() === '') {
      throw new Error('No valid field value extracted from AI response');
    }

    // Update the character with the regenerated field
    const characterIndex = charactersBlock.list.findIndex(c => c.id === characterId);
    charactersBlock.list[characterIndex] = {
      ...character,
      [fieldName]: regeneratedField
    };
    
    charactersBlock.version = Date.now();
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();

    await saveSessionContext(sessionId, sessionContext);

    log.info('Character field regenerated:', {
      sessionId,
      characterId,
      fieldName,
      hasGmIntent: !!gmIntent,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      regeneratedField: regeneratedField,
      character: charactersBlock.list[characterIndex]
    });

  } catch (error) {
    log.error('Error regenerating character field:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}
