import OpenAI from 'openai';
import { buildPromptContext } from './lib/promptContext.js';
import { renderNextScenePrompt } from './lib/prompt.js';
import { getOrCreateSessionContext } from './context.js';
import { saveSessionContext } from './storage.js';
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
 * Builds effective context from locked predecessors only
 * @param {Object} sessionContext - The session context
 * @param {number} upToSequence - The sequence number to build context up to
 * @returns {Object} The effective context object
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

  // Find all locked scenes with sequence <= upToSequence
  const lockedScenes = Object.values(sessionContext.sceneDetails).filter(detail => 
    detail.status === 'Locked' && detail.sequence <= upToSequence
  );

  // Sort by sequence to maintain order
  lockedScenes.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  // Merge context from locked scenes
  for (const sceneDetail of lockedScenes) {
    if (sceneDetail.dynamicElements?.contextOut) {
      const contextOut = sceneDetail.dynamicElements.contextOut;
      
      // Merge story_facts
      if (contextOut.story_facts) {
        effectiveContext.keyEvents.push(...(contextOut.story_facts.keyEvents || []));
        effectiveContext.revealedInfo.push(...(contextOut.story_facts.revealedInfo || []));
        effectiveContext.stateChanges = {
          ...effectiveContext.stateChanges,
          ...(contextOut.story_facts.stateChanges || {})
        };
      }

      // Merge world_state
      if (contextOut.world_state) {
        effectiveContext.stateChanges = {
          ...effectiveContext.stateChanges,
          ...contextOut.world_state
        };
      }

      // Merge world_seeds
      if (contextOut.world_seeds) {
        effectiveContext.environmentalState = {
          ...effectiveContext.environmentalState,
          ...contextOut.world_seeds
        };
      }

      // Merge character moments
      if (contextOut.characterMoments) {
        effectiveContext.playerDecisions.push(...contextOut.characterMoments);
      }
    }
  }

  return effectiveContext;
}

/**
 * Checks if a scene is locked
 * @param {string} sessionId - The session ID
 * @param {string} sceneId - The scene ID
 * @returns {Promise<boolean>} True if the scene is locked
 */
async function isSceneLocked(sessionId, sceneId) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  const sceneDetail = sessionContext.sceneDetails?.[sceneId];
  return sceneDetail?.status === 'Locked';
}

/**
 * Gets a scene by ID
 * @param {string} sessionId - The session ID
 * @param {string} sceneId - The scene ID
 * @returns {Promise<Object>} The scene detail
 */
async function getSceneById(sessionId, sceneId) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  const sceneDetail = sessionContext.sceneDetails?.[sceneId];
  
  if (!sceneDetail) {
    throw new Error('Scene not found');
  }
  
  return sceneDetail;
}

/**
 * Appends a new scene to the macro chain
 * @param {string} sessionId - The session ID
 * @param {Object} sceneData - The scene data
 * @returns {Promise<Object>} The created scene
 */
async function appendScene(sessionId, sceneData) {
  const sessionContext = await getOrCreateSessionContext(sessionId);
  
  // Generate a new scene ID
  const sceneId = `scene_${sceneData.sequence}_${Date.now()}`;
  
  const newScene = {
    id: sceneId,
    sequence: sceneData.sequence,
    title: sceneData.title,
    objective: sceneData.objective,
    status: 'Draft',
    meta: sceneData.meta || {},
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    version: 1
  };

  // Initialize sceneDetails if it doesn't exist
  if (!sessionContext.sceneDetails) {
    sessionContext.sceneDetails = {};
  }

  // Add the new scene
  sessionContext.sceneDetails[sceneId] = newScene;
  sessionContext.updatedAt = new Date().toISOString();

  // Save the updated context
  await saveSessionContext(sessionId, sessionContext);

  log.info(`New scene ${sceneId} appended to session ${sessionId}`, {
    sceneId,
    sequence: sceneData.sequence,
    title: sceneData.title
  });

  return newScene;
}

export default async function handler(req, res) {
  log.section('GENERATE NEXT SCENE REQUEST');
  log.info('Request received', { body: req.body });

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { sessionId, previousSceneId, gmIntent } = req.body;

    if (!sessionId || !previousSceneId) {
      res.status(400).json({ error: 'Missing required fields: sessionId, previousSceneId' });
      return;
    }

    // Validate that the previous scene is locked
    const locked = await isSceneLocked(sessionId, previousSceneId);
    if (!locked) {
      res.status(409).json({ error: 'Previous scene must be locked before generating the next scene.' });
      return;
    }

    // Get the previous scene
    const previousScene = await getSceneById(sessionId, previousSceneId);
    
    // Build prompt context
    const promptContext = await buildPromptContext(sessionId);
    
    // Build effective context from locked predecessors
    const sessionContext = await getOrCreateSessionContext(sessionId);
    const effectiveContext = buildEffectiveContext(sessionContext, previousScene.sequence);

    // Create the prompt
    const prompt = renderNextScenePrompt({
      background: promptContext.background,
      characters: promptContext.characters,
      previousScene: {
        title: previousScene.title,
        objective: previousScene.objective,
        sequence: previousScene.sequence
      },
      effectiveContext,
      gmIntent: gmIntent?.trim() || ''
    });

    log.info('Generated prompt for next scene:', {
      sessionId,
      previousSceneId,
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

    // Calculate next sequence number
    const nextSequence = (previousScene.sequence || 0) + 1;

    // Create the new scene
    const newScene = await appendScene(sessionId, {
      title: parsedResponse.title,
      objective: parsedResponse.objective,
      sequence: nextSequence,
      meta: { gmIntent: gmIntent?.trim() }
    });

    log.info('Next scene generated successfully:', {
      sessionId,
      previousSceneId,
      newSceneId: newScene.id,
      sequence: nextSequence,
      title: newScene.title
    });

    res.status(200).json({
      ok: true,
      data: newScene
    });

  } catch (error) {
    log.error('Error generating next scene:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}