import OpenAI from 'openai';
import { getOrCreateSessionContext } from '../context.js';
import { updateSessionContext } from '../storage.js';
import { buildPromptContext } from '../lib/promptContext.js';
import logger from '../lib/logger.js';

const log = logger.macroChain;

// Initialize OpenAI client lazily
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
  log.section('REGENERATE MACRO CHAIN SCENE REQUEST');
  log.info('Request received', { body: req.body });

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, chainId, sceneId, gmIntent, lockedSceneIds } = req.body;

    if (!sessionId || !chainId || !sceneId || !gmIntent) {
      res.status(400).json({ error: 'Missing required fields: sessionId, chainId, sceneId, gmIntent' });
      return;
    }

    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Get the macro chain
    if (!sessionContext.macroChains || !sessionContext.macroChains[chainId]) {
      res.status(404).json({ error: 'Macro chain not found' });
      return;
    }

    const macroChain = sessionContext.macroChains[chainId];
    const sceneToRegenerate = macroChain.scenes.find(s => s.id === sceneId);
    
    if (!sceneToRegenerate) {
      res.status(404).json({ error: 'Scene not found in macro chain' });
      return;
    }

    // Get locked prior scenes (from macro chain, not scene details)
    const lockedPriorScenes = macroChain.scenes
      .filter(s => s.order < sceneToRegenerate.order && lockedSceneIds?.includes(s.id))
      .sort((a, b) => a.order - b.order);

    log.info('Regenerating macro chain scene:', {
      sceneId,
      sceneOrder: sceneToRegenerate.order,
      lockedPriorScenesCount: lockedPriorScenes.length,
      gmIntentLength: gmIntent.trim().length
    });

    // Build prompt context (background, characters, etc.)
    const promptContext = await buildPromptContext(sessionId);

    // Build effective context from locked prior scenes (simplified - just titles/objectives)
    const effectiveContext = {
      keyEvents: [],
      revealedInfo: [],
      stateChanges: {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    };

    // Add titles and objectives from locked prior scenes as context
    lockedPriorScenes.forEach(scene => {
      effectiveContext.keyEvents.push(`Scene ${scene.order}: ${scene.title}`);
      effectiveContext.revealedInfo.push(scene.objective);
    });

    // Build background and character blocks for the prompt
    const backgroundBlock = promptContext.background ? `
BACKGROUND_CONTEXT:
PREMISE: ${promptContext.background.premise || 'No premise provided'}

TONE_RULES (use these to set the emotional tone):
${(promptContext.background.tone_rules || []).map(rule => `- ${rule}`).join('\n')}

STAKES (connect scene to these conflicts):
${(promptContext.background.stakes || []).map(stake => `- ${stake}`).join('\n')}

MYSTERIES (reveal these gradually):
${(promptContext.background.mysteries || []).map(mystery => `- ${mystery}`).join('\n')}

LOCATIONS (choose from these places):
${(promptContext.background.location_palette || []).map(location => `- ${location}`).join('\n')}

NPCs (these characters should appear):
${(promptContext.background.npc_roster_skeleton || []).map(npc => `- ${npc}`).join('\n')}

MOTIFS (weave these themes throughout):
${(promptContext.background.motifs || []).map(motif => `- ${motif}`).join('\n')}

CONSTRAINTS (follow these rules):
${(promptContext.background.doNots || []).map(constraint => `- ${constraint}`).join('\n')}

PLAYSTYLE (consider these implications):
${(promptContext.background.playstyle_implications || []).map(implication => `- ${implication}`).join('\n')}` : '';

    const charactersBlock = promptContext.characters && promptContext.characters.list ? `
CHARACTERS (these PCs will be in the scene):
${promptContext.characters.list.map(char => `- ${char.name} (${char.class || 'Unknown class'}): ${char.motivation || 'No motivation provided'}
  Connection: ${char.connectionToStory || 'No connection provided'}`).join('\n')}

CHARACTER MOTIVATIONS (use these to shape scene beats):
${promptContext.characters.list.map(char => `- ${char.name}: ${char.motivation || 'No motivation provided'}`).join('\n')}` : '';

    const effectiveContextBlock = effectiveContext && (effectiveContext.keyEvents.length > 0 || effectiveContext.revealedInfo.length > 0) ? `
EFFECTIVE_CONTEXT (from locked prior scenes):
${JSON.stringify(effectiveContext, null, 2)}

CONTEXT_INTEGRATION:
- Build upon the context from previous locked scenes
- Do not contradict established facts
- Reference key events, revealed info, state changes, NPC relationships, environmental changes, plot threads, and player decisions from previous scenes
- The scene should feel like a natural continuation of the story` : `
EFFECTIVE_CONTEXT:
No previous locked scenes - this is the first scene.`;

    // Create the regeneration prompt
    const prompt = `You are a D&D GM assistant regenerating a macro chain scene. Follow the rules strictly and return valid JSON only.

${backgroundBlock}${charactersBlock}

CURRENT_SCENE_TO_REGENERATE:
- title: "${sceneToRegenerate.title}"
- objective: "${sceneToRegenerate.objective}"
- order: ${sceneToRegenerate.order}

${effectiveContextBlock}

GM_INTENT:
"${gmIntent.trim()}"

CRITICAL INSTRUCTIONS:

1. Regenerate the scene title and objective based on the GM's intent.
2. The scene should:
   - Incorporate the GM's specific intent
   - Maintain logical consistency with its order position (${sceneToRegenerate.order})
   - Respect BACKGROUND tone/motifs and CHARACTERS motivations
   - Build naturally from previous locked scenes (if any)
   - Not contradict EFFECTIVE_CONTEXT
   - Feel like a natural part of the story

3. Output concise JSON with these fields:
   - "title": Short, evocative title that matches tone_rules and uses background elements
   - "objective": 1-2 sentence purpose-only objective that connects to background stakes/mysteries
   - "sequence": ${sceneToRegenerate.order} (must match the current scene order)

4. Keep the objective focused on purpose only - no micro-details about implementation.

REQUIRED OUTPUT FORMAT:
{
  "title": "Regenerated scene title that matches the tone_rules and uses background elements",
  "objective": "Regenerated scene objective that connects to background stakes/mysteries",
  "sequence": ${sceneToRegenerate.order}
}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting. The response must be valid JSON that can be parsed directly.`;

    log.info('Calling OpenAI for scene regeneration');

    // Call OpenAI
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a D&D GM assistant regenerating macro chain scenes. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      top_p: 0.9,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    log.debug('Raw AI response:', responseText);

    // Parse the JSON response
    let parsedResponse;
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (parseError) {
      log.error('Failed to parse OpenAI response:', parseError);
      log.error('Raw response that failed to parse:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate response structure
    if (!parsedResponse.title || !parsedResponse.objective) {
      throw new Error('AI response must contain title and objective fields');
    }

    // Update the scene in the macro chain
    const sceneIndex = macroChain.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      throw new Error('Scene not found in macro chain');
    }

    macroChain.scenes[sceneIndex] = {
      ...macroChain.scenes[sceneIndex],
      title: parsedResponse.title,
      objective: parsedResponse.objective,
    };

    // Update chain metadata
    macroChain.version = (macroChain.version || 0) + 1;
    macroChain.lastUpdatedAt = new Date().toISOString();
    macroChain.status = macroChain.status === 'Locked' ? 'Locked' : 'Edited';

    // Save to session context using updateSessionContext to preserve all existing data
    await updateSessionContext(sessionId, {
      macroChains: {
        [chainId]: macroChain
      }
    });

    log.info('Macro chain scene regenerated successfully:', {
      sceneId,
      newTitle: parsedResponse.title,
      newObjective: parsedResponse.objective
    });

    res.status(200).json({
      ok: true,
      data: {
        scene: macroChain.scenes[sceneIndex],
        chain: macroChain
      }
    });

  } catch (error) {
    log.error('Error regenerating macro chain scene:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

