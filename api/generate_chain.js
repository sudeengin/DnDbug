import OpenAI from 'openai';
import { processContextForPrompt } from './context.js';
import { saveChain } from './storage.js';

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
  console.error('🚀🚀🚀 GENERATE_CHAIN HANDLER CALLED - DEBUG MODE ACTIVE - VERSION 3.0 🚀🚀🚀');
  console.error('Request body:', JSON.stringify(req.body, null, 2));
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { concept, meta, sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    if (!concept || concept.trim().length === 0) {
      res.status(400).json({ error: 'Story concept is required' });
      return;
    }

    // Fetch session context if sessionId is provided
    let contextMemory = {};
    if (sessionId) {
      try {
        // Import the context module dynamically to avoid circular dependencies
        const { getOrCreateSessionContext, processContextForPrompt } = await import('./context.js');
        const sessionContext = await getOrCreateSessionContext(sessionId);
        contextMemory = processContextForPrompt(sessionContext);
        
        console.log('Context memory loaded:', {
          sessionId,
          hasBlueprint: !!contextMemory.blueprint,
          hasPlayerHooks: !!contextMemory.player_hooks,
          hasWorldSeeds: !!contextMemory.world_seeds,
          hasStylePrefs: !!contextMemory.style_prefs,
          hasBackground: !!contextMemory.background
        });

        // Check if background is locked before proceeding
        const bg = sessionContext?.blocks?.background;
        const isLocked = sessionContext?.locks?.background === true;
        if (!bg || !isLocked) {
          console.log('Background lock check failed:', {
            hasBackground: !!bg,
            isLocked: isLocked,
            locks: sessionContext?.locks,
            sessionId
          });
          res.status(409).json({ 
            error: 'Background must be locked before generating the Macro Chain.' 
          });
          return;
        }

        // Warn if background is missing
        if (!contextMemory.background) {
          console.warn('BACKGROUND missing; proceeding with concept only');
        }
      } catch (error) {
        console.warn('Failed to load context memory:', error.message);
        // Continue without context if loading fails
      }
    }

    // Create the enhanced background-aware prompt
    const systemPrompt = `You are a D&D GM assistant. You MUST use the provided BACKGROUND_CONTEXT as the primary foundation for creating scene chains. The background context contains the story's premise, tone, mysteries, and world details that should drive every scene. 

CRITICAL: You MUST incorporate specific elements from the background context into your scene titles and objectives. Do not create generic scenes - use the specific locations, NPCs, mysteries, and tone from the background.

All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms.`;

    // Build enhanced context memory block with background awareness
    let contextMemoryBlock = '';
    if (Object.keys(contextMemory).length > 0) {
      if (contextMemory.background) {
        // Format background context in a more readable way for the AI
        const bg = contextMemory.background;
        console.log('Background object:', JSON.stringify(bg, null, 2));
        contextMemoryBlock = `BACKGROUND_CONTEXT:
PREMISE: ${bg.premise || 'No premise provided'}

TONE_RULES (use these to set the emotional tone of scene titles):
${(bg.tone_rules || []).map(rule => `- ${rule}`).join('\n')}

STAKES (connect each scene to these conflicts):
${(bg.stakes || []).map(stake => `- ${stake}`).join('\n')}

MYSTERIES (reveal these gradually through the scenes):
${(bg.mysteries || []).map(mystery => `- ${mystery}`).join('\n')}

LOCATIONS (choose from these places):
${(bg.location_palette || []).map(location => `- ${location}`).join('\n')}

NPCs (these characters should appear):
${(bg.npc_roster_skeleton || []).map(npc => `- ${npc}`).join('\n')}

MOTIFS (weave these themes throughout):
${(bg.motifs || []).map(motif => `- ${motif}`).join('\n')}

CONSTRAINTS (follow these rules):
${(bg.doNots || []).map(constraint => `- ${constraint}`).join('\n')}

PLAYSTYLE (consider these implications):
${(bg.playstyle_implications || []).map(implication => `- ${implication}`).join('\n')}`;
      } else {
        contextMemoryBlock = `BACKGROUND_CONTEXT: ${JSON.stringify(contextMemory, null, 2)}`;
      }
    } else {
      contextMemoryBlock = 'BACKGROUND_CONTEXT: No background context provided';
    }

    // Debug: Log the context being sent to AI
    console.log('=== CONTEXT BEING SENT TO AI ===');
    console.log('Context Memory Keys:', Object.keys(contextMemory));
    console.log('Background Present:', !!contextMemory.background);
    if (contextMemory.background) {
      console.log('Background Keys:', Object.keys(contextMemory.background));
      console.log('Background Premise:', contextMemory.background.premise);
      console.log('Background Tone Rules:', contextMemory.background.tone_rules);
    }
    console.log('Full Context Block:', contextMemoryBlock);
    console.log('================================');

    const userPrompt = `${contextMemoryBlock}

STORY_CONCEPT:
"""
${concept}
"""

STRUCTURAL_PREFERENCES:
${JSON.stringify(meta || {})}

CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:
1. The BACKGROUND_CONTEXT above is your PRIMARY SOURCE for creating scenes. Use it extensively.
2. Each scene title MUST use words from the tone_rules and reference specific locations/NPCs from the background.
3. Each scene objective MUST connect to the specific stakes and mysteries from the background.
4. You MUST use the specific locations from the location_palette in your scene titles/objectives.
5. You MUST reference the specific NPCs from the npc_roster_skeleton in your scenes.
6. You MUST weave the specific motifs throughout the scene flow.
7. You MUST follow all constraints from the doNots list.
8. DO NOT create generic scenes - every scene must be clearly connected to the background context.

SCENE STRUCTURE (5-6 scenes):
- Scenes 1-2: Early exploration, introduce basic mysteries from background
- Scenes 3-4: Mid development, deepen investigation of background mysteries
- Scenes 5-6: Late resolution, address background stakes and mysteries

OUTPUT FORMAT:
You MUST return a valid JSON object with this EXACT structure:
{
  "scenes": [
    {
      "title": "Scene title that matches the tone_rules and uses background elements",
      "objective": "One-sentence purpose that connects to background stakes/mysteries"
    },
    {
      "title": "Another scene title using background elements",
      "objective": "Another objective connecting to background"
    }
    // ... continue for 5-6 scenes total
  ]
}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting. The response must be valid JSON that can be parsed directly.`;

    const completion = await getOpenAI().chat.completions.create({
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

    console.error('=== RAW AI RESPONSE ===');
    console.error(responseText);
    console.error('=== END RAW AI RESPONSE ===');

    // Parse the JSON response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.error('=== CLEANED RESPONSE ===');
      console.error(cleaned);
      console.error('=== END CLEANED RESPONSE ===');
      parsedResponse = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response that failed to parse:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and transform the response
    const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Debug: Log the parsed response structure
    console.log('=== PARSED AI RESPONSE ===');
    console.log('Response keys:', Object.keys(parsedResponse));
    console.log('Has scenes array:', Array.isArray(parsedResponse.scenes));
    console.log('Scenes length:', parsedResponse.scenes ? parsedResponse.scenes.length : 'N/A');
    console.log('Full response:', JSON.stringify(parsedResponse, null, 2));
    console.log('========================');
    
    // Ensure we have scenes array
    if (!Array.isArray(parsedResponse.scenes)) {
      console.error('AI Response does not contain scenes array. Response structure:', parsedResponse);
      throw new Error(`Response must contain scenes array. Got: ${JSON.stringify(parsedResponse)}`);
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
      status: 'Generated',
      version: 1,
      lastUpdatedAt: new Date().toISOString(),
      meta: meta || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save the chain to storage
    await saveChain(macroChain);

    // Also store in session context if sessionId is provided
    if (sessionId) {
      try {
        const { getOrCreateSessionContext } = await import('./context.js');
        const { saveSessionContext } = await import('./storage.js');
        
        const sessionContext = await getOrCreateSessionContext(sessionId);
        
        // Initialize macroChains if it doesn't exist
        if (!sessionContext.macroChains) {
          sessionContext.macroChains = {};
        }
        
        // Store the generated chain
        sessionContext.macroChains[chainId] = macroChain;
        sessionContext.updatedAt = new Date().toISOString();
        
        // Save to storage
        await saveSessionContext(sessionId, sessionContext);
        
        console.log(`Macro chain ${chainId} stored in session context for ${sessionId}`, {
          chainId,
          sessionId,
          hasMacroChains: !!sessionContext.macroChains,
          macroChainsKeys: Object.keys(sessionContext.macroChains || {}),
          chainStatus: macroChain.status
        });
      } catch (contextError) {
        console.warn('Failed to store chain in session context:', contextError);
        // Continue even if context storage fails
      }
    }

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
