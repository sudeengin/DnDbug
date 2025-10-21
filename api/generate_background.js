import OpenAI from 'openai';
import logger from './lib/logger.js';

const log = logger.background;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, concept, meta } = req.body;

    if (!concept || concept.trim().length === 0) {
      res.status(400).json({ error: 'Story concept is required' });
      return;
    }

    // Create the prompt for generating a compact Story Background
    const systemPrompt = `You are a DnD GM assistant. Generate a compact Story Background from a Story Concept. All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms.`;

    const userPrompt = `STORY_CONCEPT:
"""
${concept}
"""

STRUCTURAL_PREFERENCES:
${JSON.stringify(meta || {})}

PLAYER COUNT REQUIREMENT:
Generate the background for ${meta?.numberOfPlayers || 4} players. This will influence the complexity and scope of the story elements.`

Generate a compact Story Background JSON with these fields:
- premise: string (core story premise in 1-2 sentences)
- tone_rules: string[] (3-5 tone guidelines)
- stakes: string[] (3-5 key stakes/conflicts)
- mysteries: string[] (3-5 central mysteries)
- factions: string[] (3-5 major factions/groups)
- location_palette: string[] (3-5 key locations)
- npc_roster_skeleton: string[] (3-5 key NPCs with brief descriptions)
- motifs: string[] (3-5 recurring themes/symbols)
- doNots: string[] (3-5 things to avoid)
- playstyle_implications: string[] (3-5 playstyle considerations)
- numberOfPlayers: number (how many players will participate, default 4, range 3-6)

CONSTRAINTS:
- Keep each field concise (1-2 sentences max per item)
- Focus on story-driving elements
- Ensure consistency with concept
- Make it actionable for scene generation
- All text output must be in English

OUTPUT
Valid JSON only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (parseError) {
      log.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate required fields
    const requiredArrayFields = [
      'premise', 'tone_rules', 'stakes', 'mysteries', 
      'factions', 'location_palette', 'npc_roster_skeleton', 
      'motifs', 'doNots', 'playstyle_implications'
    ];

    for (const field of requiredArrayFields) {
      if (!parsedResponse[field] || !Array.isArray(parsedResponse[field])) {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }

    // Validate numberOfPlayers - use meta value if provided, otherwise use parsed response or default
    const requestedPlayers = meta?.numberOfPlayers;
    log.info('numberOfPlayers validation:', {
      requestedPlayers,
      parsedResponseNumberOfPlayers: parsedResponse.numberOfPlayers,
      metaNumberOfPlayers: meta?.numberOfPlayers
    });
    
    if (typeof requestedPlayers === 'number' && requestedPlayers >= 3 && requestedPlayers <= 6) {
      parsedResponse.numberOfPlayers = requestedPlayers;
      log.info('Using requested numberOfPlayers:', requestedPlayers);
    } else if (typeof parsedResponse.numberOfPlayers !== 'number' || 
        parsedResponse.numberOfPlayers < 3 || 
        parsedResponse.numberOfPlayers > 6) {
      // Set default if invalid
      parsedResponse.numberOfPlayers = 4;
      log.info('Using default numberOfPlayers: 4');
    } else {
      log.info('Using parsed numberOfPlayers:', parsedResponse.numberOfPlayers);
    }

    // Save background to session context
    try {
      const { getOrCreateSessionContext } = await import('../context.js');
      const { saveSessionContext } = await import('../storage.js');
      const sessionContext = await getOrCreateSessionContext(sessionId);
      
      log.info('Session context before saving background:', {
        sessionId,
        hasBlocks: !!sessionContext.blocks,
        blocksKeys: sessionContext.blocks ? Object.keys(sessionContext.blocks) : []
      });
      
      // Store background in session context
      sessionContext.blocks = sessionContext.blocks || {};
      sessionContext.blocks.background = parsedResponse;
      sessionContext.version = (sessionContext.version || 0) + 1;
      sessionContext.updatedAt = new Date().toISOString();
      
      await saveSessionContext(sessionId, sessionContext);
      
      log.info('Background saved to session context:', {
        sessionId,
        hasBackground: !!sessionContext.blocks.background,
        numberOfPlayers: sessionContext.blocks.background?.numberOfPlayers,
        version: sessionContext.version
      });
    } catch (saveError) {
      log.error('Error saving background to session context:', saveError);
      // Don't fail the request, just log the error
    }

    // Log telemetry
    log.info('Telemetry: generate_background', {
      sessionId,
      conceptLength: concept.length,
      hasMeta: !!meta,
      numberOfPlayers: parsedResponse.numberOfPlayers,
      timestamp: Date.now(),
    });

    res.status(200).json({ 
      ok: true, 
      data: { 
        background: parsedResponse 
      } 
    });

  } catch (error) {
    log.error('Error generating background:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}