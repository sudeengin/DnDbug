// Simple test endpoint to check character generation
import OpenAI from 'openai';

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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    // Simple test prompt with new fields
    const testPrompt = `You are a D&D GM character designer creating playable PCs with detailed backgrounds. Follow the rules strictly and return valid JSON only.

BACKGROUND CONTEXT (read-only):
{
  "where": "A haunted manor in the countryside",
  "when": "Victorian era", 
  "tone": "Gothic mystery",
  "motifs": ["decay", "secrets", "family curses"],
  "anchors": ["The manor's tragic past", "A missing heir"]
}

PLAYER COUNT: 1

CRITICAL: You MUST generate ALL 20 required fields for each character. Do not omit any fields.

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

    // Generate character using AI
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a D&D GM character designer creating playable PCs with detailed backgrounds. Follow the rules strictly and return valid JSON only.'
        },
        {
          role: 'user',
          content: testPrompt
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

    // Parse the JSON response
    let parsedResponse;
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (parseError) {
      throw new Error('Invalid JSON response from AI');
    }

    // Check if new fields are present
    const firstChar = parsedResponse.characters[0];
    const newFields = ['languages', 'alignment', 'deity', 'physicalDescription', 'equipmentPreferences', 'subrace', 'age', 'height', 'proficiencies'];
    
    const fieldCheck = {};
    newFields.forEach(field => {
      fieldCheck[field] = firstChar[field] !== undefined ? firstChar[field] : 'MISSING';
    });

    res.status(200).json({ 
      ok: true, 
      character: firstChar,
      fieldCheck: fieldCheck,
      rawResponse: responseText
    });

  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
}
