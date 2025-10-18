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

    const { concept, meta } = req.body;

    if (!concept || concept.trim().length === 0) {
      res.status(400).json({ error: 'Story concept is required' });
      return;
    }

    // Create the prompt according to the specification
    const systemPrompt = `You are a GM assistant. Generate only titles and objectives for 5-6 scenes based on the story concept.`;

    const userPrompt = `STORY_CONCEPT: """${concept}"""
STRUCTURAL_PREFERENCES: ${JSON.stringify(meta || {})}
CONSTRAINTS:
- 5 to 6 scenes
- Objectives are purposes, not outcomes
- No mechanics or micro details
OUTPUT: Valid JSON that matches MacroChain schema`;

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

    // Validate and transform the response
    const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Ensure we have scenes array
    if (!Array.isArray(parsedResponse.scenes)) {
      throw new Error('Response must contain scenes array');
    }

    // Transform scenes to match MacroScene interface
    const scenes = parsedResponse.scenes.map((scene, index) => ({
      id: `scene_${index + 1}_${Date.now()}`,
      order: index + 1,
      title: scene.title || scene.scene_title || '',
      objective: scene.objective || scene.scene_objective || '',
    }));

    // Ensure we have 5-6 scenes
    if (scenes.length < 5 || scenes.length > 6) {
      throw new Error('Must generate exactly 5-6 scenes');
    }

    const macroChain = {
      chainId,
      scenes,
      meta: meta || undefined,
    };

    // Log telemetry
    console.log('Telemetry: generate_chain', {
      chainId,
      sceneCount: scenes.length,
      timestamp: Date.now(),
    });

    res.status(200).json({ ok: true, data: macroChain });

  } catch (error) {
    console.error('Error generating chain:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
