import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import { buildPromptContext, checkPreviousSceneLock, createContextSummary } from './lib/promptContext.js'
import { isStale, validateSceneVersion, createStalenessError, createSceneVersionInfo } from './lib/versioning.js'
import { renderDetailTemplate } from './lib/prompt.js'
import { getOrCreateSessionContext } from './context.js';
import { saveSessionContext } from './storage.js';
import { 
  selectCreativeApproach, 
  recordSceneDetailApproach, 
  getRecentSceneDetailApproaches,
  generateVariationSeed 
} from './lib/creativityTracker.js';
import dotenv from 'dotenv'
import logger from "./lib/logger.js";

const log = logger.scene;

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateSceneDetail(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' })
      return
    }

    const body = parseBody(req.body)
    if (!isGenerateDetailRequest(body)) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const { sceneId, macroScene, effectiveContext, sessionId, uses } = body

    // Lock validation guard: if generating Scene N > 1, require Scene N-1 be Locked
    if (macroScene.order > 1 && sessionId) {
      try {
        const sessionContext = await getOrCreateSessionContext(sessionId);
        const lockCheck = checkPreviousSceneLock(sessionContext, macroScene.order);
        
        if (!lockCheck.canGenerate) {
          res.status(409).json({ error: lockCheck.error });
          return;
        }
      } catch (error) {
        log.warn('Failed to validate previous scene lock:', error.message);
        // Continue without validation if check fails
      }
    }

    // Staleness check if uses information is provided
    if (uses && sessionId) {
      try {
        const sessionContext = await getOrCreateSessionContext(sessionId);
        const validation = validateSceneVersion(uses, sessionContext.meta);
        
        if (validation.isStale) {
          const errorMessage = createStalenessError(validation);
          log.info('Stale context detected:', {
            sceneId,
            validation,
            errorMessage
          });
          res.status(409).json({ error: errorMessage });
          return;
        }
      } catch (error) {
        log.warn('Failed to validate scene version:', error.message);
        // Continue without validation if check fails
      }
    }

    // Fetch session context using centralized builder
    let promptContext = null;
    if (sessionId) {
      try {
        promptContext = await buildPromptContext(sessionId);
        
        log.info('Prompt context loaded:', {
          sessionId,
          hasBackground: !!promptContext.background,
          hasCharacters: !!promptContext.characters,
          versions: promptContext.versions
        });
      } catch (error) {
        log.warn('Failed to load prompt context:', error.message);
        // Continue without context if loading fails
      }
    }

    // Enhanced randomization system with creativity tracking
    const sceneApproaches = [
      "Focus on immersive sensory details and atmospheric descriptions",
      "Emphasize character interactions and dialogue opportunities", 
      "Create dynamic challenges with multiple solution paths",
      "Highlight environmental storytelling and world-building",
      "Focus on tension-building and dramatic pacing",
      "Emphasize investigation and discovery mechanics",
      "Create scenes with moral complexity and ethical choices",
      "Focus on action sequences and dynamic encounters",
      "Emphasize social dynamics and NPC relationships",
      "Create scenes with hidden layers and deeper meanings",
      "Focus on psychological tension and character development",
      "Emphasize exploration of mysterious locations and ancient secrets",
      "Create scenes with unexpected plot twists and revelations",
      "Focus on environmental challenges and survival elements",
      "Emphasize magical phenomena and arcane discoveries",
      "Create scenes with political intrigue and factional dynamics",
      "Focus on character backstory integration and personal growth",
      "Emphasize cosmic horror and otherworldly encounters",
      "Create scenes with philosophical themes and moral ambiguity",
      "Focus on time manipulation and reality-bending elements"
    ];
    
    // Get recent approaches to avoid repetition
    const recentApproaches = sessionId ? await getRecentSceneDetailApproaches(sessionId) : [];
    const randomApproach = selectCreativeApproach(sceneApproaches, recentApproaches);
    
    // Generate session-aware variation seed
    const variationSeed = sessionId ? await generateVariationSeed(sessionId) : Date.now() % 1000;
    
    // Dynamic temperature and top_p for more randomness
    const baseTemperature = 0.9;
    const temperatureVariation = (variationSeed % 25) / 100; // 0.0 to 0.24 variation
    const dynamicTemperature = Math.min(1.0, baseTemperature + temperatureVariation);
    
    const baseTopP = 0.95;
    const topPVariation = (variationSeed % 15) / 100; // 0.0 to 0.14 variation
    const dynamicTopP = Math.min(1.0, baseTopP + topPVariation);
    
    // Additional creative variations
    const detailStyles = [
      "Use rich, evocative language with vivid imagery",
      "Adopt a more clinical, analytical approach to descriptions",
      "Employ a conversational, accessible tone",
      "Use a mysterious, enigmatic narrative voice",
      "Adopt a dramatic, theatrical style",
      "Employ a scholarly, academic tone"
    ];
    
    const randomDetailStyle = detailStyles[Math.floor(Math.random() * detailStyles.length)];
    
    const complexityLevels = [
      "Create intricate, multi-layered scenes with hidden depths",
      "Focus on simple, direct encounters with clear objectives",
      "Build complex webs of interconnected elements",
      "Emphasize straightforward, linear progression",
      "Create branching paths with multiple outcomes",
      "Focus on single, focused objectives with depth"
    ];
    
    const randomComplexity = complexityLevels[Math.floor(Math.random() * complexityLevels.length)];
    
    // Model rotation for different generation styles
    const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    const selectedModel = models[Math.floor(Math.random() * models.length)];
    
    log.info('Using dynamic scene detail parameters:', {
      model: selectedModel,
      temperature: dynamicTemperature,
      top_p: dynamicTopP,
      variationSeed,
      approach: randomApproach,
      detailStyle: randomDetailStyle,
      complexity: randomComplexity,
      recentApproaches: recentApproaches.length
    });

    // Record the approach used for future creativity tracking
    if (sessionId) {
      await recordSceneDetailApproach(sessionId, randomApproach, randomDetailStyle, randomComplexity);
    }

    const system = `You are a D&D GM assistant creating detailed scene content. Follow the rules strictly and return valid JSON only. All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms.

CREATIVE APPROACH: ${randomApproach}
DETAIL_STYLE: ${randomDetailStyle}
COMPLEXITY_LEVEL: ${randomComplexity}
VARIATION_SEED: ${variationSeed} (use this number to add subtle variations in scene structure and content)`

    const prompt = renderDetailTemplate({
      background: promptContext?.background,
      characters: promptContext?.characters,
      numberOfPlayers: promptContext?.numberOfPlayers,
      effectiveContext,
      macroScene
    })
    
    const resp = await client.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: dynamicTemperature,
      top_p: dynamicTopP,
    })

    const text = resp.choices[0]?.message?.content ?? ''
    const parsedResponse = tryParseSceneDetail(text, sceneId, macroScene)

    // Extract the sceneDetail from the parsed response
    const sceneDetail = parsedResponse.sceneDetail || parsedResponse

    // Migrate old structure to new structure if needed
    const migratedSceneDetail = migrateSceneDetailStructure(sceneDetail)

    // Add version tracking and status fields to the generated scene detail
    const enrichedSceneDetail = {
      ...migratedSceneDetail,
      status: 'Generated',
      version: 1,
      lastUpdatedAt: new Date().toISOString(),
      uses: promptContext ? createSceneVersionInfo(promptContext.versions, {}) : undefined
    }

    // Store the scene detail in session context if sessionId is provided
    if (sessionId) {
      try {
        log.info('Storing scene detail:', { sessionId, sceneId, enrichedSceneDetailSceneId: enrichedSceneDetail.sceneId });
        const sessionContext = await getOrCreateSessionContext(sessionId);
        
        // Initialize sceneDetails if it doesn't exist
        if (!sessionContext.sceneDetails) {
          sessionContext.sceneDetails = {};
        }
        
        // Store the generated scene detail
        sessionContext.sceneDetails[sceneId] = enrichedSceneDetail;
        sessionContext.updatedAt = new Date().toISOString();
        
        log.info('Before saving to storage:', {
          sessionId,
          sceneId,
          hasSceneDetails: !!sessionContext.sceneDetails,
          sceneDetailsKeys: Object.keys(sessionContext.sceneDetails),
          enrichedSceneDetailSceneId: enrichedSceneDetail.sceneId
        });
        
        // Save to storage
        await saveSessionContext(sessionId, sessionContext);
        
        log.info(`Scene detail ${sceneId} stored in session context for ${sessionId}`, {
          sceneId,
          sessionId,
          hasSceneDetails: !!sessionContext.sceneDetails,
          sceneDetailsKeys: Object.keys(sessionContext.sceneDetails || {}),
          sceneStatus: enrichedSceneDetail.status,
          enrichedSceneDetailSceneId: enrichedSceneDetail.sceneId
        });
      } catch (contextError) {
        log.warn('Failed to store scene detail in session context:', contextError);
        // Continue even if context storage fails
      }
    }

    res.status(200).json({ ok: true, data: enrichedSceneDetail })
  } catch (error) {
    log.error(error)
    const message = error instanceof Error ? error.message : 'Server error'
    res.status(500).json({ error: message })
  }
}

function buildContextAwarePrompt(macroScene, effectiveContext, backgroundContext = null, charactersContext = null, numberOfPlayers = 4) {
  const languageDirective = "All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms."
  
  const contextSummary = createContextSummary(effectiveContext)
  
  // Build background context block
  const backgroundBlock = backgroundContext 
    ? `STORY_BACKGROUND:
${JSON.stringify(backgroundContext, null, 2)}

CONSTRAINTS:
- Follow the tone_rules and doNots from STORY_BACKGROUND
- Reference stakes and mysteries when relevant
- Use factions and NPCs from the background
- Incorporate location_palette and motifs
- Respect playstyle_implications

`
    : ''

  // Build characters context block
  const charactersBlock = charactersContext && charactersContext.list
    ? `CHARACTERS:
${charactersContext.list.map(char => `- ${char.name} (${char.class || 'Unknown class'}): ${char.publicMotivation}
  Conflict: ${char.narrativeConflict}
  Connection: ${char.connectionToStory}`).join('\n')}

CHARACTER_GUIDANCE:
- Use character motivations to shape scene beats and objectives
- Incorporate character conflicts into scene tension
- Reference character connections to story elements
- Consider how each character would react to scene events

`
    : ''

  // Add player count information
  const playerCountBlock = `PLAYER COUNT: ${numberOfPlayers}
- Generate scene details that work well for a group of ${numberOfPlayers} players
- Consider encounter complexity and dialogue spread appropriate for this party size
- Balance scene beats to engage all ${numberOfPlayers} characters
- Use "A group of ${numberOfPlayers} adventurers approaches..." style language when appropriate

`
  
  return `Return JSON only.

${backgroundBlock}${charactersBlock}${playerCountBlock}MACRO_SCENE:
- title: "${macroScene.title}"
- objective: "${macroScene.objective}"

EFFECTIVE_CONTEXT:
${JSON.stringify(effectiveContext, null, 2)}

CONSTRAINTS:
- Stay within the macro objective
- Use previous revealed info and state changes when relevant
- Do not contradict established facts
- Register any new revelations or changes under contextOut
- Build upon the context from previous scenes

Schema:
{
  "sceneId": "${macroScene.id}",
  "title": string,
  "objective": string,
  "keyEvents": [ string ],
  "revealedInfo": [ string ],
  "stateChanges": { string: any },
  "contextOut": {
    "keyEvents": [ string ],
    "revealedInfo": [ string ],
    "stateChanges": { string: any },
    "npcRelationships": { string: { "trust_level": number, "last_interaction": string, "attitude": string } },
    "environmentalState": { string: any },
    "plotThreads": [ { "thread_id": string, "title": string, "status": string, "description": string } ],
    "playerDecisions": [ { "decision_id": string, "context": string, "choice": string, "consequences": [ string ], "impact_level": string } ]
  },
  "openingStateAndTrigger": {
    "state": string,
    "trigger": string
  },
  "environmentAndSensory": {
    "visual": [ string ],
    "auditory": [ string ],
    "olfactory": [ string ],
    "tactile_or_thermal": [ string ],
    "other": [ string ]
  },
  "epicIntro": string,
  "setting": string,
  "atmosphere": string,
  "gmNarrative": string,
  "beats": [ string ],
  "checks": [
    {
      "type": "skill|save",
      "ability": string,
      "skill": string,
      "dc_suggested_range": [ number, number ],
      "dc": number,
      "check_label": string,
      "when": string,
      "on_success": string,
      "on_fail": string,
      "advantage_hints": [ string ]
    }
  ],
  "cluesAndForeshadowing": {
    "clues": [ string ],
    "foreshadowing": [ string ]
  },
  "npcMiniCards": [
    {
      "name": string,
      "role": string,
      "demeanor": string,
      "quirk": string,
      "goal": string,
      "secret": string
    }
  ],
  "combatProbabilityAndBalance": {
    "likelihood": "low|medium|high",
    "enemies": [ string ],
    "balance_notes": string,
    "escape_or_alt_paths": [ string ]
  },
  "exitConditionsAndTransition": {
    "exit_conditions": [ string ],
    "transition_to_next": string
  },
  "rewards": [ string ]
}

CONTEXT FROM PREVIOUS SCENES:
${contextSummary}

IMPORTANT: 
- Use the context from previous scenes to inform the current scene generation
- The scene should feel like a natural continuation of the story
- Incorporate key events, revealed info, state changes, NPC relationships, environmental changes, plot threads, and player decisions from previous scenes
- Build upon this context while maintaining the original scene objective from the chain
- Do not contradict established facts from previous scenes

CONTEXT OUTPUT REQUIREMENTS:
You MUST populate the contextOut object with new information discovered or changed during this scene. Do not leave any field empty:

- keyEvents: Array of significant events that happened during the scene. Include at least 2-3 events.
- revealedInfo: Array of new information learned during the scene. Include at least 1-2 revelations.
- stateChanges: Object describing how the world state changed. Include at least 1-2 state changes.
- npcRelationships: Object describing relationships with NPCs. Include any NPCs encountered.
- environmentalState: Object describing environmental changes. Include any environmental changes.
- plotThreads: Array of plot threads introduced or advanced. Include any new plot threads.
- playerDecisions: Array of significant decisions made by players. Include any important decisions.

EXAMPLE contextOut for this scene:
{
  \"keyEvents\": [\"The party discovered ancient runes on the walls\", \"A mysterious voice warned them to turn back\", \"They found a hidden passage behind a crumbling statue\"],
  \"revealedInfo\": [\"The ruins are protected by ancient magic\", \"The civilization used elemental magic for construction\"],
  \"stateChanges\": {\"ruins_explored\": true, \"ancient_wards_activated\": false},
  \"npcRelationships\": {\"Eldin\": {\"trust_level\": 3, \"last_interaction\": \"gave warning\", \"attitude\": \"neutral\"}},
  \"environmentalState\": {\"magical_barriers\": \"present but dormant\", \"ruins_accessibility\": \"limited\"},
  \"plotThreads\": [{\"thread_id\": \"ancient_magic\", \"title\": \"The Source of Power\", \"status\": \"active\", \"description\": \"The party seeks the heart of the civilization's power\"}],
  \"playerDecisions\": [{\"decision_id\": \"enter_ruins\", \"context\": \"discovered entrance\", \"choice\": \"proceed cautiously\", \"consequences\": [\"found runes\", \"heard warning\"], \"impact_level\": \"medium\"}]
}

${languageDirective}`
}


function tryParseSceneDetail(text, sceneId, macroScene) {
  try {
    log.info('Raw AI response:', text.substring(0, 500) + '...');
    
    // Clean the text by removing markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const parsed = JSON.parse(cleanedText)
    log.info('Parsed AI response keys:', Object.keys(parsed));
    
    // Handle new schema format with sceneDetail wrapper
    const sceneDetail = parsed.sceneDetail || parsed
    
    // Ensure required fields are present
    if (!sceneDetail.sceneId) sceneDetail.sceneId = sceneId
    if (!sceneDetail.title) sceneDetail.title = macroScene.title
    if (!sceneDetail.objective) sceneDetail.objective = macroScene.objective
    if (!sceneDetail.sequence) sceneDetail.sequence = macroScene.order || 1
    if (!sceneDetail.sceneType) sceneDetail.sceneType = 'exploration'
    
    // Ensure narrativeCore is present
    if (!sceneDetail.narrativeCore) {
      sceneDetail.narrativeCore = {
        goal: macroScene.objective,
        conflict: 'Tension to be determined',
        revelation: 'Information to be discovered',
        transition: 'Transition to next scene'
      }
    }
    
    // Ensure dynamicElements is present
    if (!sceneDetail.dynamicElements) {
      sceneDetail.dynamicElements = {
        npcProfiles: [],
        environment: 'Environment to be described',
        challenge: null,
        revealedInfo: []
      }
    }
    
    // Ensure contextOut is properly structured at the top level (as per schema)
    if (!sceneDetail.contextOut) {
      sceneDetail.contextOut = {
        keyEvents: [],
        revealedInfo: [],
        stateChanges: {},
        npcRelationships: {},
        environmentalState: {},
        plotThreads: [],
        playerDecisions: []
      }
    }
    
    // Auto-populate contextOut from other fields if it's empty
    if (sceneDetail.contextOut.keyEvents.length === 0 && sceneDetail.dynamicElements?.revealedInfo?.length > 0) {
      sceneDetail.contextOut.keyEvents = sceneDetail.dynamicElements.revealedInfo;
    }
    
    if (sceneDetail.contextOut.revealedInfo.length === 0 && sceneDetail.dynamicElements?.revealedInfo?.length > 0) {
      sceneDetail.contextOut.revealedInfo = sceneDetail.dynamicElements.revealedInfo;
    }
    
    // Handle old structure where contextOut is inside dynamicElements
    if (sceneDetail.dynamicElements?.contextOut) {
      log.info('Found old contextOut structure, migrating...');
      const oldContextOut = sceneDetail.dynamicElements.contextOut;
      log.info('Old contextOut keys:', Object.keys(oldContextOut));
      
      // Populate keyEvents from story_facts and characterMoments
      if (oldContextOut.story_facts && Array.isArray(oldContextOut.story_facts)) {
        log.info('Adding story_facts to keyEvents:', oldContextOut.story_facts);
        sceneDetail.contextOut.keyEvents = [...sceneDetail.contextOut.keyEvents, ...oldContextOut.story_facts];
      }
      if (oldContextOut.characterMoments && Array.isArray(oldContextOut.characterMoments)) {
        log.info('Adding characterMoments to keyEvents:', oldContextOut.characterMoments);
        sceneDetail.contextOut.keyEvents = [...sceneDetail.contextOut.keyEvents, ...oldContextOut.characterMoments];
      }
      
      // Populate stateChanges from world_state
      if (oldContextOut.world_state && typeof oldContextOut.world_state === 'object') {
        log.info('Adding world_state to stateChanges:', oldContextOut.world_state);
        sceneDetail.contextOut.stateChanges = { ...sceneDetail.contextOut.stateChanges, ...oldContextOut.world_state };
      }
      
      // Populate environmentalState from world_seeds
      if (oldContextOut.world_seeds && typeof oldContextOut.world_seeds === 'object') {
        log.info('Adding world_seeds to environmentalState:', oldContextOut.world_seeds);
        sceneDetail.contextOut.environmentalState = { ...sceneDetail.contextOut.environmentalState, ...oldContextOut.world_seeds };
      }
    } else {
      log.info('No old contextOut structure found');
    }
    
    // Extract key events from narrative core if available
    if (sceneDetail.contextOut.keyEvents.length === 0 && sceneDetail.narrativeCore?.revelation) {
      sceneDetail.contextOut.keyEvents.push(`Discovered: ${sceneDetail.narrativeCore.revelation}`);
    }
    
    // Extract state changes from the scene
    if (Object.keys(sceneDetail.contextOut.stateChanges).length === 0) {
      sceneDetail.contextOut.stateChanges = {
        ruins_explored: true,
        scene_completed: true
      };
    }
    
    // Extract NPC relationships if NPCs are present
    if (Object.keys(sceneDetail.contextOut.npcRelationships).length === 0 && sceneDetail.dynamicElements?.npcProfiles?.length > 0) {
      sceneDetail.dynamicElements.npcProfiles.forEach(npc => {
        sceneDetail.contextOut.npcRelationships[npc.name] = {
          trust_level: 3,
          last_interaction: "first encounter",
          attitude: "neutral"
        };
      });
    }
    
    // Extract environmental state
    if (Object.keys(sceneDetail.contextOut.environmentalState).length === 0) {
      sceneDetail.contextOut.environmentalState = {
        scene_type: sceneDetail.sceneType || "exploration",
        atmosphere: sceneDetail.dynamicElements?.environment ? "mysterious" : "unknown"
      };
    }
    
    // Create a plot thread if none exist
    if (sceneDetail.contextOut.plotThreads.length === 0 && sceneDetail.narrativeCore?.goal) {
      sceneDetail.contextOut.plotThreads.push({
        thread_id: `scene_${sceneDetail.sequence}_thread`,
        title: sceneDetail.title,
        status: "active",
        description: sceneDetail.narrativeCore.goal
      });
    }
    
    return parsed
  } catch (error) {
    log.error('Failed to parse scene detail JSON:', error)
    // Return a fallback structure with new schema
    return {
      sceneDetail: {
        sceneId,
        title: macroScene.title,
        objective: macroScene.objective,
        sequence: macroScene.order || 1,
        sceneType: 'exploration',
        narrativeCore: {
          goal: macroScene.objective,
          conflict: 'Tension to be determined',
          revelation: 'Information to be discovered',
          transition: 'Transition to next scene'
        },
        dynamicElements: {
          npcProfiles: [],
          environment: 'Environment to be described',
          challenge: null,
          revealedInfo: []
        },
        contextOut: {
          keyEvents: [],
          revealedInfo: [],
          stateChanges: {},
          npcRelationships: {},
          environmentalState: {},
          plotThreads: [],
          playerDecisions: []
        },
        status: 'Generated',
        version: 1,
        lastUpdatedAt: new Date().toISOString(),
        raw: text
      }
    }
  }
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return undefined
    }
  }

  if (body instanceof Buffer) {
    try {
      return JSON.parse(body.toString('utf8'))
    } catch {
      return undefined
    }
  }

  return body
}

// GenerateDetailRequest type definition (for reference)

function isGenerateDetailRequest(value) {
  return (
    isRecord(value) &&
    typeof value.sceneId === 'string' &&
    isRecord(value.macroScene) &&
    typeof value.macroScene.id === 'string' &&
    typeof value.macroScene.title === 'string' &&
    typeof value.macroScene.objective === 'string' &&
    typeof value.macroScene.order === 'number' &&
    isRecord(value.effectiveContext) &&
    (value.sessionId === undefined || typeof value.sessionId === 'string')
  )
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

// Wrapper function for server.js that doesn't require res parameter
async function generateSceneDetailForServer(req) {
  return new Promise(async (resolve, reject) => {
    try {
      log.info('generateSceneDetailForServer called with:', {
        sessionId: req.body.sessionId,
        sceneId: req.body.sceneId,
        hasSessionId: !!req.body.sessionId
      });
      
      // Create a proper response object that mimics Express response behavior
      const response = {
        status: (code) => ({
          json: (data) => {
            if (code >= 400) {
              reject(new Error(data.error || 'Unknown error'));
            } else {
              resolve(data);
            }
          }
        })
      };
      
      await generateSceneDetail(req, response);
    } catch (error) {
      reject(error);
    }
  });
}

// Export the function for use in server.js
export { generateSceneDetail, generateSceneDetailForServer }
/**
 * Migrates old scene detail structure to new structure
 * @param {Object} sceneDetail - The scene detail to migrate
 * @returns {Object} - The migrated scene detail
 */
function migrateSceneDetailStructure(sceneDetail) {
  // If contextOut is already at top level, return as is
  if (sceneDetail.contextOut) {
    return sceneDetail
  }

  // If contextOut is inside dynamicElements, migrate it
  if (sceneDetail.dynamicElements?.contextOut) {
    const oldContextOut = sceneDetail.dynamicElements.contextOut
    
    // Convert old structure to new structure
    const newContextOut = {
      keyEvents: oldContextOut.story_facts || [],
      revealedInfo: [],
      stateChanges: oldContextOut.world_state || {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    }

    // Add world seeds as environmental state if they exist
    if (oldContextOut.world_seeds) {
      newContextOut.environmentalState = {
        ...newContextOut.environmentalState,
        locations: oldContextOut.world_seeds.locations || [],
        factions: oldContextOut.world_seeds.factions || [],
        constraints: oldContextOut.world_seeds.constraints || []
      }
    }

    // Add character moments as key events if they exist
    if (oldContextOut.characterMoments && Array.isArray(oldContextOut.characterMoments)) {
      newContextOut.keyEvents = [...newContextOut.keyEvents, ...oldContextOut.characterMoments]
    }

    // Create new scene detail with migrated structure
    const { dynamicElements, ...rest } = sceneDetail
    const { contextOut: _, ...newDynamicElements } = dynamicElements || {}

    return {
      ...rest,
      contextOut: newContextOut,
      dynamicElements: newDynamicElements
    }
  }

  // If no contextOut exists, create default structure
  return {
    ...sceneDetail,
    contextOut: {
      keyEvents: [],
      revealedInfo: [],
      stateChanges: {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    }
  }
}

export default generateSceneDetail
