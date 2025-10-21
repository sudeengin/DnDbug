import OpenAI from 'openai';
import { buildPromptContext } from './lib/promptContext.js';
import { renderNextScenePrompt } from './lib/prompt.js';
import { getOrCreateSessionContext } from './context.js';
import { saveSessionContext } from './storage.js';
import logger from './lib/logger.js';

const log = logger.scene;

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

/**
 * Helper function to build effective context from locked predecessor scenes
 */
function buildEffectiveContext(sessionContext, upToSequence) {
  const effectiveContext = {
    keyEvents: [],
    revealedInfo: [],
    stateChanges: {},
    npcRelationships: {},
    environmentalState: {},
    plotThreads: [],
    playerDecisions: []
  };

  if (!sessionContext.sceneDetails) {
    return effectiveContext;
  }

  // Get all locked scenes up to (but not including) the target sequence
  const lockedScenes = Object.values(sessionContext.sceneDetails)
    .filter(detail => 
      detail.status === 'Locked' && 
      (detail.sequence || detail.order || 0) < upToSequence
    )
    .sort((a, b) => (a.sequence || a.order || 0) - (b.sequence || b.order || 0));

  log.info('Building effective context from locked scenes:', {
    upToSequence,
    lockedScenesCount: lockedScenes.length,
    lockedSceneIds: lockedScenes.map(s => s.sceneId)
  });

  // Merge context from all locked predecessors
  lockedScenes.forEach(detail => {
    if (detail.contextOut) {
      // Merge key events
      if (detail.contextOut.keyEvents && Array.isArray(detail.contextOut.keyEvents)) {
        effectiveContext.keyEvents.push(...detail.contextOut.keyEvents);
      }

      // Merge revealed info
      if (detail.contextOut.revealedInfo && Array.isArray(detail.contextOut.revealedInfo)) {
        effectiveContext.revealedInfo.push(...detail.contextOut.revealedInfo);
      }

      // Merge state changes (later scenes override earlier ones)
      if (detail.contextOut.stateChanges && typeof detail.contextOut.stateChanges === 'object') {
        Object.assign(effectiveContext.stateChanges, detail.contextOut.stateChanges);
      }

      // Merge NPC relationships
      if (detail.contextOut.npcRelationships && typeof detail.contextOut.npcRelationships === 'object') {
        Object.assign(effectiveContext.npcRelationships, detail.contextOut.npcRelationships);
      }

      // Merge environmental state
      if (detail.contextOut.environmentalState && typeof detail.contextOut.environmentalState === 'object') {
        Object.assign(effectiveContext.environmentalState, detail.contextOut.environmentalState);
      }

      // Merge plot threads
      if (detail.contextOut.plotThreads && Array.isArray(detail.contextOut.plotThreads)) {
        effectiveContext.plotThreads.push(...detail.contextOut.plotThreads);
      }

      // Merge player decisions
      if (detail.contextOut.playerDecisions && Array.isArray(detail.contextOut.playerDecisions)) {
        effectiveContext.playerDecisions.push(...detail.contextOut.playerDecisions);
      }
    }
  });

  return effectiveContext;
}

export default async function handler(req, res) {
  log.info('🎯 GENERATE_NEXT_SCENE handler called');
  log.info('Request body:', JSON.stringify(req.body, null, 2));

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, previousSceneId, gmIntent } = req.body;

    // Validate inputs
    if (!sessionId || !previousSceneId) {
      res.status(400).json({ error: 'Missing required fields: sessionId, previousSceneId' });
      return;
    }

    if (!gmIntent || gmIntent.trim().length === 0) {
      res.status(400).json({ error: 'GM intent is required. Please describe what you want to see next.' });
      return;
    }

    // Get session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Get the macro chain
    const macroChain = sessionContext.blocks?.custom?.macroChain;
    if (!macroChain) {
      res.status(404).json({ error: 'Macro chain not found. Please create a macro chain first.' });
      return;
    }

    // Find the previous scene in the macro chain
    const previousMacroScene = macroChain.scenes.find(s => s.id === previousSceneId);
    if (!previousMacroScene) {
      res.status(404).json({ error: 'Previous scene not found in macro chain.' });
      return;
    }

    log.info('Previous macro scene found:', {
      id: previousMacroScene.id,
      order: previousMacroScene.order,
      title: previousMacroScene.title
    });

    const previousSequence = previousMacroScene.order || 1;
    const nextSequence = previousSequence + 1;

    // Build prompt context (background, characters, etc.)
    const promptContext = await buildPromptContext(sessionId);
    
    // Build effective context from all locked predecessors
    // Note: At macro chain level, we use titles + objectives as context, not full scene details
    const effectiveContext = buildEffectiveContext(sessionContext, nextSequence);
    
    // If no scene details exist (working at macro level), use previous macro scenes as context
    if (Object.keys(effectiveContext.keyEvents || {}).length === 0) {
      log.info('No scene details found - using macro scene context instead');
      effectiveContext.previousScenes = macroChain.scenes
        .filter(s => s.order < nextSequence)
        .map(s => ({
          order: s.order,
          title: s.title,
          objective: s.objective
        }));
    }

    log.info('Context for next scene generation:', {
      previousSequence,
      nextSequence,
      hasBackground: !!promptContext.background,
      hasCharacters: !!promptContext.characters,
      effectiveContextSize: Object.keys(effectiveContext).length,
      gmIntentLength: gmIntent.length
    });

    // Build the prompt
    const prompt = renderNextScenePrompt({
      background: promptContext.background,
      characters: promptContext.characters,
      previousScene: {
        title: previousMacroScene.title,
        objective: previousMacroScene.objective,
        sequence: previousSequence
      },
      effectiveContext,
      gmIntent: gmIntent.trim()
    });

    log.info('Calling OpenAI to generate next scene...');

    // Call OpenAI
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a D&D GM assistant helping to expand a scene chain iteratively based on GM intent.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    log.info('OpenAI response:', responseText);

    // Parse the JSON response
    let parsedResponse;
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (parseError) {
      log.error('Failed to parse OpenAI response:', parseError);
      log.error('Raw response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response
    if (!parsedResponse.title || !parsedResponse.objective) {
      throw new Error('AI response missing required fields (title, objective)');
    }

    // Create the new macro scene
    const newSceneId = `scene_${nextSequence}_${Date.now()}`;
    const newMacroScene = {
      id: newSceneId,
      order: nextSequence,
      title: parsedResponse.title,
      objective: parsedResponse.objective,
      meta: {
        gmIntent: gmIntent.trim(),
        generatedFrom: previousSceneId,
        generatedAt: new Date().toISOString()
      }
    };

    // Add the new scene to the macro chain
    macroChain.scenes.push(newMacroScene);
    macroChain.scenes.sort((a, b) => a.order - b.order); // Ensure proper ordering
    macroChain.version = (macroChain.version || 0) + 1;
    macroChain.lastUpdatedAt = new Date().toISOString();
    macroChain.status = 'Draft'; // Keep as Draft until this new scene is also locked

    // Update session context
    sessionContext.blocks.custom.macroChain = macroChain;
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save to storage
    await saveSessionContext(sessionId, sessionContext);

    log.info('Next scene created successfully:', {
      sceneId: newSceneId,
      sequence: nextSequence,
      title: newMacroScene.title
    });

    res.status(200).json({
      ok: true,
      scene: newMacroScene,
      chain: macroChain
    });

  } catch (error) {
    log.error('Error generating next scene:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

