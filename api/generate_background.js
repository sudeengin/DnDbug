import OpenAI from 'openai';

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
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate required fields
    const requiredFields = [
      'premise', 'tone_rules', 'stakes', 'mysteries', 
      'factions', 'location_palette', 'npc_roster_skeleton', 
      'motifs', 'doNots', 'playstyle_implications'
    ];

    for (const field of requiredFields) {
      if (!parsedResponse[field] || !Array.isArray(parsedResponse[field])) {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }

    // Log telemetry
    console.log('Telemetry: generate_background', {
      sessionId,
      conceptLength: concept.length,
      hasMeta: !!meta,
      timestamp: Date.now(),
    });

    res.status(200).json({ 
      ok: true, 
      data: { 
        background: parsedResponse 
      } 
    });

  } catch (error) {
    console.error('Error generating background:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}