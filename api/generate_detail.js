import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import dotenv from 'dotenv'

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

    const { sceneId, macroScene, effectiveContext, sessionId } = body

    // Lock validation guard: if generating Scene N > 1, require Scene N-1 be Locked
    if (macroScene.order > 1 && sessionId) {
      try {
        const { getOrCreateSessionContext } = await import('./context.js');
        const sessionContext = getOrCreateSessionContext(sessionId);
        
        // Find previous scene ID (assuming scenes are stored with order-based IDs)
        const prevSceneOrder = macroScene.order - 1;
        const prevSceneId = `scene-${prevSceneOrder}`; // Adjust this based on your ID format
        
        // Check if previous scene exists and is locked
        if (sessionContext.sceneDetails && sessionContext.sceneDetails[prevSceneId]) {
          const prevSceneDetail = sessionContext.sceneDetails[prevSceneId];
          if (prevSceneDetail.status !== 'Locked') {
            return NextResponse.json(
              { error: 'Previous scene must be locked before generating this scene.' },
              { status: 409 }
            );
          }
        } else {
          // Previous scene doesn't exist
          return NextResponse.json(
            { error: 'Previous scene must be generated and locked before generating this scene.' },
            { status: 409 }
          );
        }
      } catch (error) {
        console.warn('Failed to validate previous scene lock:', error.message);
        // Continue without validation if check fails
      }
    }

    // Fetch session context if sessionId is provided
    let backgroundContext = null;
    if (sessionId) {
      try {
        const { getOrCreateSessionContext, processContextForPrompt } = await import('./context.js');
        const sessionContext = getOrCreateSessionContext(sessionId);
        const contextMemory = processContextForPrompt(sessionContext);
        backgroundContext = contextMemory.background;
        
        console.log('Background context loaded:', {
          sessionId,
          hasBackground: !!backgroundContext
        });
      } catch (error) {
        console.warn('Failed to load background context:', error.message);
        // Continue without background if loading fails
      }
    }

    const system = 'You are a DnD GM assistant that writes scene details consistent with previous context. All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms.'

    const prompt = buildContextAwarePrompt(macroScene, effectiveContext, backgroundContext)
    
    const resp = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    })

    const text = resp.choices[0]?.message?.content ?? ''
    const sceneDetail = tryParseSceneDetail(text, sceneId, macroScene)

    // Add new status fields to the generated scene detail
    const enrichedSceneDetail = {
      ...sceneDetail,
      status: 'Generated',
      version: 1,
      lastUpdatedAt: new Date().toISOString()
    }

    res.status(200).json({ ok: true, data: enrichedSceneDetail })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Server error'
    res.status(500).json({ error: message })
  }
}

function buildContextAwarePrompt(macroScene, effectiveContext, backgroundContext = null) {
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
  
  return `Return JSON only.

${backgroundBlock}MACRO_SCENE:
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
- Register any new revelations or changes under contextOut

${languageDirective}`
}

function createContextSummary(effectiveContext) {
  if (!effectiveContext || Object.keys(effectiveContext).length === 0) {
    return "No previous scenes - this is the first scene."
  }

  const summary = []
  
  if (effectiveContext.keyEvents && effectiveContext.keyEvents.length > 0) {
    summary.push(`Key Events: ${effectiveContext.keyEvents.join(', ')}`)
  }
  
  if (effectiveContext.revealedInfo && effectiveContext.revealedInfo.length > 0) {
    summary.push(`Revealed Info: ${effectiveContext.revealedInfo.join(', ')}`)
  }
  
  if (effectiveContext.stateChanges && Object.keys(effectiveContext.stateChanges).length > 0) {
    summary.push(`State Changes: ${JSON.stringify(effectiveContext.stateChanges)}`)
  }
  
  if (effectiveContext.npcRelationships && Object.keys(effectiveContext.npcRelationships).length > 0) {
    summary.push(`NPC Relationships: ${JSON.stringify(effectiveContext.npcRelationships)}`)
  }
  
  if (effectiveContext.environmentalState && Object.keys(effectiveContext.environmentalState).length > 0) {
    summary.push(`Environmental State: ${JSON.stringify(effectiveContext.environmentalState)}`)
  }
  
  if (effectiveContext.plotThreads && effectiveContext.plotThreads.length > 0) {
    summary.push(`Plot Threads: ${effectiveContext.plotThreads.map(t => t.title).join(', ')}`)
  }
  
  if (effectiveContext.playerDecisions && effectiveContext.playerDecisions.length > 0) {
    summary.push(`Player Decisions: ${effectiveContext.playerDecisions.map(d => d.choice).join(', ')}`)
  }

  return summary.length > 0 ? summary.join('\n') : "No significant context from previous scenes."
}

function tryParseSceneDetail(text, sceneId, macroScene) {
  try {
    // Clean the text by removing markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const parsed = JSON.parse(cleanedText)
    
    // Ensure required fields are present
    if (!parsed.sceneId) parsed.sceneId = sceneId
    if (!parsed.title) parsed.title = macroScene.title
    if (!parsed.objective) parsed.objective = macroScene.objective
    
    // Ensure contextOut is present
    if (!parsed.contextOut) {
      parsed.contextOut = {
        keyEvents: parsed.keyEvents || [],
        revealedInfo: parsed.revealedInfo || [],
        stateChanges: parsed.stateChanges || {},
        npcRelationships: {},
        environmentalState: {},
        plotThreads: [],
        playerDecisions: []
      }
    }
    
    // Ensure skillChallenges is present
    if (!parsed.skillChallenges) {
      parsed.skillChallenges = []
    }
    
    // Add dnd_skill field to checks if missing
    if (parsed.checks && Array.isArray(parsed.checks)) {
      parsed.checks.forEach(check => {
        if (!check.dnd_skill && check.skill) {
          console.log('Processing skill:', check.skill)
          
          // Map skill names to D&D skills (now primarily English)
          const skillMapping = {
            'Investigation': 'Investigation',
            'Perception': 'Perception',
            'Insight': 'Insight',
            'Arcana': 'Arcana',
            'Athletics': 'Athletics',
            'Stealth': 'Stealth',
            'Deception': 'Deception',
            'Intimidation': 'Intimidation',
            'Persuasion': 'Persuasion',
            'Animal Handling': 'Animal Handling',
            'History': 'History',
            'Medicine': 'Medicine',
            'Nature': 'Nature',
            'Religion': 'Religion',
            'Survival': 'Survival',
            'Acrobatics': 'Acrobatics',
            'Sleight of Hand': 'Sleight of Hand',
            // Legacy Turkish mappings for backward compatibility
            'Araştırma': 'Investigation',
            'Algılama': 'Perception',
            'Fısıltıları Anlama': 'Insight'
          }
          
          // Try to find a match
          const skillName = check.skill.toLowerCase()
          let dndSkill = 'Investigation' // default
          
          // First check for exact matches
          for (const [turkish, english] of Object.entries(skillMapping)) {
            if (skillName === turkish.toLowerCase() || skillName === english.toLowerCase()) {
              dndSkill = english
              console.log('Found exact match:', turkish, '->', english)
              break
            }
          }
          
          // If no exact match, check for partial matches
          if (dndSkill === 'Investigation') {
            for (const [turkish, english] of Object.entries(skillMapping)) {
              if (skillName.includes(turkish.toLowerCase()) || skillName.includes(english.toLowerCase())) {
                dndSkill = english
                console.log('Found partial match:', turkish, '->', english)
                break
              }
            }
          }
          
          console.log('Setting dnd_skill to:', dndSkill)
          check.dnd_skill = dndSkill
        }
      })
    }
    
    return parsed
  } catch (error) {
    console.error('Failed to parse scene detail JSON:', error)
    // Return a fallback structure
    return {
      sceneId,
      title: macroScene.title,
      objective: macroScene.objective,
      keyEvents: [],
      revealedInfo: [],
      stateChanges: {},
      contextOut: {
        keyEvents: [],
        revealedInfo: [],
        stateChanges: {},
        npcRelationships: {},
        environmentalState: {},
        plotThreads: [],
        playerDecisions: []
      },
      raw: text
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
export default generateSceneDetail
