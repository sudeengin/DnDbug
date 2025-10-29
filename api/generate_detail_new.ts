import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import logger from '../lib/logger.js';

const log = logger.scene;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const { sceneId, macroScene, effectiveContext } = body

    const system = 'You are a DnD GM assistant that writes scene details consistent with previous context. MUTLAKA skillChallenges alanını dahil et ve en az 1 skill challenge ekle.'

    const prompt = buildContextAwarePrompt(macroScene, effectiveContext)
    
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

    res.status(200).json({ ok: true, data: sceneDetail })
  } catch (error: unknown) {
    log.error(error)
    const message = error instanceof Error ? error.message : 'Server error'
    res.status(500).json({ error: message })
  }
}

function buildContextAwarePrompt(macroScene, effectiveContext) {
  const languageDirective = "Tüm çıktıları English üret. GM anlatımını, sahne başlıklarını, ipuçlarını, kontrolleri, her metni English yaz."
  
  const contextSummary = createContextSummary(effectiveContext)
  
  return `Return JSON only.

MACRO_SCENE:
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
  "rewards": [ string ],
  "skillChallenges": [
    {
      "skill": "string",
      "dc": "number",
      "trigger": "string",
      "success": "string",
      "failure": "string",
      "consequence": "string"
    }
  ]
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

SKILL CHALLENGES REQUIREMENT:
- MUST include skillChallenges field with at least 1 skill challenge.
- Each scene should have at least 1 skill challenge (maximum 3).
- Skill names should be in English (examples: Insight, Investigation, Arcana).
- DC values should be between 10-20.
- Success provides information or advantage; failure causes misdirection or minor risk.

EXAMPLE skillChallenges:
[
  {
    "skill": "Insight",
    "dc": 14,
    "trigger": "When trying to decipher the meaning of the whispers.",
    "success": "They understand that this voice belongs to a child spirit asking for help.",
    "failure": "They perceive the whisper as hostile and panic.",
    "consequence": "The failed character remains indecisive for one turn; progress slows down."
  }
]

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
    const parsed = JSON.parse(text)
    
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
    
    return parsed
  } catch (error) {
    log.error('Failed to parse scene detail JSON:', error)
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
      skillChallenges: [],
      raw: text
    }
  }
}

function parseBody(body: unknown): unknown {
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

type GenerateDetailRequest = {
  sceneId: string
  macroScene: {
    id: string
    title: string
    objective: string
    order: number
  }
  effectiveContext: any
}

function isGenerateDetailRequest(value: unknown): value is GenerateDetailRequest {
  return (
    isRecord(value) &&
    typeof value.sceneId === 'string' &&
    isRecord(value.macroScene) &&
    typeof value.macroScene.id === 'string' &&
    typeof value.macroScene.title === 'string' &&
    typeof value.macroScene.objective === 'string' &&
    typeof value.macroScene.order === 'number' &&
    isRecord(value.effectiveContext)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
