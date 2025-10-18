import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import { 
  generateSkeletonV2, 
  type ConversationMemory 
} from './genSkeleton.js'
import { 
  createSceneContext, 
  createContextAwarePrompt, 
  type SceneContext 
} from './context.js'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' })
      return
    }

    const body = parseBody(req.body)
    if (!isRequestBody(body)) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const { mode, payload } = body

    if (payload === undefined || payload === null) {
      res.status(400).json({ error: 'Missing mode or payload' })
      return
    }

    // Mode guard: skeleton modu dışında skeleton çağrısı yapılmaz
    if (mode === 'skeleton') {
      // Extract conversation memory and temperature from payload if provided
      let memory: ConversationMemory | undefined
      let temp = 0.8
      let skeletonInput: unknown
      
      if (isRecord(payload)) {
        const { conversationMemory, temperature, ...rest } = payload as Record<string, unknown>
        memory = conversationMemory as ConversationMemory | undefined
        temp = typeof temperature === 'number' ? temperature : 0.8
        skeletonInput = rest
      } else {
        skeletonInput = payload
      }
      
      const data = await generateSkeletonV2(client, skeletonInput, memory, temp)
      res.status(200).json({ ok: true, data })
      return
    }

    // scene1 ve continue modları sadece sahne detayı üretir, skeleton çağrısı yapmaz

    const system =
      'You are Story Agent. Produce concise, runnable JSON for a GM. Always return valid JSON for the requested schema.'

    const prompt = buildPrompt(mode, payload)
    const resp = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    })

    const text = resp.choices[0]?.message?.content ?? ''
    res.status(200).json({ ok: true, data: tryJson(text) })
  } catch (error: unknown) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Server error'
    res.status(500).json({ error: message })
  }
}

function tryJson(t: string) {
  try {
    return JSON.parse(t)
  } catch {
    return { raw: t }
  }
}

function buildPrompt(mode: 'skeleton' | 'scene1' | 'continue', payload: any) {
  const languageDirective = "Tüm çıktıları Türkçe üret. GM anlatımını, sahne başlıklarını, ipuçlarını, kontrolleri, her metni Türkçe yaz.";
  
  if (mode === 'skeleton') {
    return `Return JSON only.
Schema:
{
  "main_objective": string,
  "scenes": [ { "title": string, "objective": string } ]
}
Inputs:
${JSON.stringify(payload, null, 2)}
Rules:
- Create 3–6 concise scenes.
- Keep titles short and evocative.
- Objectives clearly serve the main goal.
- Do not add narration or mechanics yet.
${languageDirective}`;
  }

  if (mode === 'scene1' || mode === 'continue') {
    // Extract context from payload
    const { inputs, skeleton, scene, previousScenes } = payload as any;
    
    // Create context-aware prompt
    const basePrompt = `Return JSON only.
Schema:
{
  "scene_title": string,
  "objective": string,
  "opening_state_and_trigger": { "state": string, "trigger": string },
  "environment_and_sensory": {
    "visual": [ string ],
    "auditory": [ string ],
    "olfactory": [ string ],
    "tactile_or_thermal": [ string ],
    "other": [ string ]
  },
  "epic_intro": string,
  "setting": string,
  "atmosphere": string,
  "gm_narrative": string,
  "beats": [ string ],
  "checks": [
    {
      "type": "skill|save",
      "ability": string,
      "skill": string,
      "dc_suggested_range": [ number, number ],
      "dc": number,
      "check_label": string,       // e.g. "Wisdom (Insight) DC 14"
      "when": string,
      "on_success": string,
      "on_fail": string,
      "advantage_hints": [ string ]
    }
  ],
  "clues_and_foreshadowing": { "clues": [ string ], "foreshadowing": [ string ] },
  "npc_mini_cards": [ { "name": string, "role": string, "demeanor": string, "quirk": string, "goal": string, "secret": string } ],
  "combat_probability_and_balance": { "likelihood": "low|medium|high", "enemies": [ string ], "balance_notes": string, "escape_or_alt_paths": [ string ] },
  "exit_conditions_and_transition": { "exit_conditions": [ string ], "transition_to_next": string },
  "rewards": [ string ]
}

Tone & Style:
- GM narrates in cinematic fantasy tone — vivid, sensory, second-person when appropriate.
- "epic_intro": 2–3 image-rich sentences.
- "gm_narrative": 2–4 short paragraphs, system-neutral, no rules text.
- "atmosphere": one-line mood summary.

Skill Checks – formatting and rules:
- Every check MUST define both "ability" and "skill".
- Generate a "check_label" string formatted as: "<Ability> (<Skill>) DC <number>".
  Examples:
    - Wisdom (Insight) DC 14
    - Dexterity (Stealth) DC 13
    - Intelligence (Investigation) DC 15
- Use that exact format in "check_label" and NEVER use a bare "DC" alone.
- Avoid writing any DC references inside narrative text.
- Choose ability-skill pairs that match the challenge context:
  - Observation → Wisdom (Perception)
  - Reading intentions → Wisdom (Insight)
  - Searching details → Intelligence (Investigation)
  - Lore/symbols → Intelligence (Arcana / History / Religion / Nature)
  - Climbing / forcing → Strength (Athletics)
  - Moving quietly → Dexterity (Stealth)
  - Dodging traps → Dexterity (Acrobatics) or Dex save
  - Survival → Wisdom (Survival)
  - Social pressure → Charisma (Persuasion / Intimidation / Deception)
- Provide clear "when" triggers, success and failure outcomes, and advantage hints.

NPCs & Combat:
- Keep concise, role-focused mini cards.
- Combat section must specify likelihood + escape options.
- Exit & transition always describe how the next scene begins.

${languageDirective}`;

    // Create context from previous scenes if available
    let previousContexts: SceneContext[] = [];
    if (previousScenes && Array.isArray(previousScenes)) {
      previousContexts = previousScenes.map((prevScene: any, index: number) => 
        createSceneContext(index + 1, prevScene.scene_title || '', prevScene.scene_objective || '', prevScene)
      );
    }

    // Get current scene index from skeleton
    const currentSceneIndex = scene ? (skeleton?.scenes?.findIndex((s: any) => s.scene_title === scene.scene_title) ?? 0) : 0;

    // Create context-aware prompt
    return createContextAwarePrompt(basePrompt, skeleton, previousContexts, currentSceneIndex);
  }

  return '';
}

type StoryMode = 'skeleton' | 'scene1' | 'continue'
type StoryRequestBody = { mode: StoryMode; payload: unknown }

function isRequestBody(value: unknown): value is StoryRequestBody {
  return (
    isRecord(value) &&
    isStoryMode(value.mode) &&
    Object.prototype.hasOwnProperty.call(value, 'payload')
  )
}

function isStoryMode(value: unknown): value is StoryMode {
  return value === 'skeleton' || value === 'scene1' || value === 'continue'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
