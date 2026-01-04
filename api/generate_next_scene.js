import OpenAI from 'openai';
import { buildPromptContext } from './lib/promptContext.js';
import { renderNextScenePrompt } from './lib/prompt.js';
import { getOrCreateSessionContext } from './context.js';
import { updateSessionContext } from './storage.js';
import logger from "./lib/logger.js";

const log = logger.scene;

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

/**
 * Builds effective context from locked macro chain scenes
 * @param {Object} macroChain - The macro chain
 * @param {Array<string>} lockedSceneIds - Array of locked scene IDs
 * @param {number} upToOrder - The order number to build context up to
 * @returns {Object} The effective context object
 */
function buildEffectiveContextFromMacroScenes(macroChain, lockedSceneIds, upToOrder) {
  const effectiveContext = {
    keyEvents: [],
    revealedInfo: [],
    stateChanges: {},
    npcRelationships: {},
    environmentalState: {},
    plotThreads: [],
    playerDecisions: []
  };

  if (!macroChain || !macroChain.scenes) {
    return effectiveContext;
  }

  // Get locked prior scenes (from macro chain)
  const lockedPriorScenes = macroChain.scenes
    .filter(s => s.order < upToOrder && lockedSceneIds?.includes(s.id))
    .sort((a, b) => a.order - b.order);

  // Add titles and objectives from locked prior scenes as context
  lockedPriorScenes.forEach(scene => {
    effectiveContext.keyEvents.push(`Scene ${scene.order}: ${scene.title}`);
    effectiveContext.revealedInfo.push(scene.objective);
  });

  return effectiveContext;
}

export default async function handler(req, res) {
  log.section('GENERATE NEXT SCENE REQUEST');
  log.info('Request received', { body: req.body });

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, previousSceneId, chainId, gmIntent, lockedSceneIds } = req.body;

    if (!sessionId || !previousSceneId || !chainId) {
      res.status(400).json({ error: 'Missing required fields: sessionId, previousSceneId, chainId' });
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
    
    // Find the previous scene in the macro chain
    const previousScene = macroChain.scenes.find(s => s.id === previousSceneId);
    
    if (!previousScene) {
      res.status(404).json({ error: 'Previous scene not found in macro chain' });
      return;
    }

    // Validate that the previous scene is locked (check if it's in lockedSceneIds array)
    if (lockedSceneIds && !lockedSceneIds.includes(previousSceneId)) {
      res.status(409).json({ error: 'Previous scene must be locked before generating the next scene.' });
      return;
    }

    // Build prompt context
    const promptContext = await buildPromptContext(sessionId);
    
    // Build effective context from locked prior macro chain scenes
    const effectiveContext = buildEffectiveContextFromMacroScenes(
      macroChain, 
      lockedSceneIds || [], 
      previousScene.order
    );

    // Create the prompt
    const prompt = renderNextScenePrompt({
      background: promptContext.background,
      characters: promptContext.characters,
      previousScene: {
        title: previousScene.title,
        objective: previousScene.objective,
        sequence: previousScene.order
      },
      effectiveContext,
      gmIntent: gmIntent?.trim() || ''
    });

    log.info('Generated prompt for next scene:', {
      sessionId,
      chainId,
      previousSceneId,
      previousSceneOrder: previousScene.order,
      gmIntent: gmIntent?.trim(),
      hasBackground: !!promptContext.background,
      hasCharacters: !!promptContext.characters,
      effectiveContextKeys: Object.keys(effectiveContext)
    });

    // Call OpenAI
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a D&D GM assistant helping to expand scene chains. Return only valid JSON.' },
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

    // Calculate next order number
    const nextOrder = previousScene.order + 1;

    // Create the new macro chain scene
    const newScene = {
      id: `scene_${nextOrder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: nextOrder,
      title: parsedResponse.title,
      objective: parsedResponse.objective
    };

    // Append the new scene to the macro chain
    const updatedScenes = [...macroChain.scenes, newScene];
    
    // Update the macro chain
    const updatedChain = {
      ...macroChain,
      scenes: updatedScenes,
      version: (macroChain.version || 0) + 1,
      lastUpdatedAt: new Date().toISOString(),
      status: macroChain.status === 'Locked' ? 'Locked' : 'Edited'
    };

    // Save to session context using updateSessionContext to preserve all existing data
    await updateSessionContext(sessionId, {
      macroChains: {
        [chainId]: updatedChain
      }
    });

    log.info('Next macro chain scene generated successfully:', {
      sessionId,
      chainId,
      previousSceneId,
      newSceneId: newScene.id,
      order: nextOrder,
      title: newScene.title
    });

    res.status(200).json({
      ok: true,
      data: {
        scene: newScene,
        chain: updatedChain
      }
    });

  } catch (error) {
    log.error('Error generating next scene:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
