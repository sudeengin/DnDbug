import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import { PHASE2_PROMPT_V2, CAMPAIGN_LORE_PROMPT, CONVERSATION_MEMORY_PROMPT, STRUCTURED_OUTPUT_PROMPT } from './skeletonPrompt.js'

export type LegacyScene = { title: string; objective: string }

export type Scene = {
  scene_title: string
  scene_objective: string
}

export type SkeletonV2 = { main_objective: string; scenes: Scene[] }

export type ConversationMemory = {
  npcs: Array<{
    name: string
    personality: string
    motivation: string
    relationship: string
    last_interaction: string
  }>
  plot_threads: Array<{
    thread_id: string
    title: string
    status: 'active' | 'resolved' | 'abandoned'
    description: string
    connections: string[]
  }>
  player_decisions: Array<{
    decision_id: string
    context: string
    choice: string
    consequences: string[]
    impact_level: 'low' | 'medium' | 'high'
  }>
}

export type StructuredOutput = {
  stat_blocks?: Array<{
    name: string
    type: 'npc' | 'monster' | 'ally'
    stats: Record<string, number>
    abilities: string[]
    equipment: string[]
    notes: string
  }>
  encounters?: Array<{
    name: string
    difficulty: 'easy' | 'medium' | 'hard' | 'deadly'
    enemies: string[]
    environment: string
    objectives: string[]
    rewards: string[]
  }>
  loot?: Array<{
    name: string
    type: 'weapon' | 'armor' | 'magic_item' | 'currency' | 'information'
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
    description: string
    value?: number
  }>
}

type SceneInput = Partial<Scene> & Partial<LegacyScene>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toSceneInput(value: unknown): SceneInput {
  if (!isRecord(value)) return {}
  return value as SceneInput
}

export function transformLegacyScenes(scenes: SceneInput[]): Scene[] {
  return scenes.map((scene) => ({
    scene_title: String(scene.scene_title ?? scene.title ?? '').trim(),
    scene_objective: String(scene.scene_objective ?? scene.objective ?? '').trim(),
  }))
}

const forbiddenVerbs = ['keşfetmek', 'bulmak', 'takip etmek']

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function extractVerb(text: string): string | null {
  const match = text.toLowerCase().match(/[a-zçğıöşü]+(?:mek|mak)\b/g)
  return match ? match[match.length - 1] : null
}

function analyseVerbs(objectives: string[]) {
  const counts = new Map<string, number>()
  objectives.forEach((obj) => {
    const verb = extractVerb(obj)
    if (verb) counts.set(verb, (counts.get(verb) ?? 0) + 1)
  })

  const duplicates = Array.from(counts.entries())
    .filter(([, total]) => total > 1)
    .map(([verb]) => verb)

  const unique = Array.from(counts.keys())
  // Very lenient for macro-level objectives - only require 1 unique verb for any number of scenes
  const variedThreshold = Math.max(1, Math.ceil(objectives.length * 0.1)) // Much more lenient
  const varied = unique.length >= variedThreshold

  return { varied, duplicates }
}

function lintObjectives(scenes: Scene[]): string[] {
  const errors: string[] = []
  const objectives = scenes.map((scene) => scene.scene_objective)

  scenes.forEach((scene, index) => {
    const wc = countWords(scene.scene_objective)
    // Adjusted word count for macro-level objectives (8-15 words as per new prompt)
    if (wc < 3 || wc > 20) {
      errors.push(`Scene ${index + 1}: kelime sayısı ${wc} (3–20 olmalı)`)
    }

    // Skip forbidden verb checks for macro-level objectives
    // These are general objectives, not detailed actions
  })

  // DISABLED: Verb variety check for macro-level objectives
  // Macro-level scenes are meant to be simple and general
  // Verb variety will be enforced during Scene Detailing phase
  /*
  const { varied, duplicates } = analyseVerbs(objectives)
  if (!varied && objectives.length >= 6 && objectives.length <= 8) {
    errors.push('Fiil çeşitliliği yetersiz')
  }

  if (duplicates.length > objectives.length * 0.6) {
    errors.push(`Tekrarlanan fiiller: ${duplicates.join(', ')}`)
  }
  */

  // Macro-level scenes don't need branch_hint or improv_note
  // These will be handled in the Scene Detailing phase

  return errors
}

export async function generateSkeletonV2(
  client: OpenAI, 
  input: unknown, 
  conversationMemory?: ConversationMemory,
  temperature: number = 0.8
): Promise<SkeletonV2> {
  const systemPrompt = [
    PHASE2_PROMPT_V2.trim(),
    CAMPAIGN_LORE_PROMPT.trim(),
    CONVERSATION_MEMORY_PROMPT.trim(),
    STRUCTURED_OUTPUT_PROMPT.trim()
  ].join('\n\n')

  const userContent = conversationMemory 
    ? `Konuşma Hafızası:\n${JSON.stringify(conversationMemory, null, 2)}\n\nGM Girdisi:\n${JSON.stringify(input, null, 2)}`
    : JSON.stringify(input, null, 2)

  const response = await client.chat.completions.create({
    model: MODEL_ID,
    temperature: Math.max(0.7, Math.min(0.9, temperature)),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })

  const text = extractMessageContent(response)
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('SkeletonParseError: Üretilen metin JSON değil')
  }

  if (!isRecord(parsed)) {
    throw new Error('SkeletonParseError: JSON gövdesi hatalı')
  }

  if (!Array.isArray(parsed.scenes)) {
    throw new Error('SkeletonParseError: "scenes" dizisi eksik')
  }

  const scenesRaw = parsed.scenes as unknown[]
  const sceneInputs = scenesRaw.map(toSceneInput)
  const scenes = transformLegacyScenes(sceneInputs)
  const lintErrors = lintObjectives(scenes)
  if (lintErrors.length) {
    throw new Error('SkeletonLint: ' + lintErrors.join(' | '))
  }

  return {
    main_objective: String(parsed.main_objective ?? '').trim(),
    scenes,
  }
}

function isLegacyLike(scene: SceneInput): boolean {
  return Boolean(
    (typeof scene.title === 'string' && scene.title.length > 0) ||
      (typeof scene.objective === 'string' && scene.objective.length > 0),
  )
}

export function getScenesForPhase3(skeleton: unknown): Scene[] {
  if (!isRecord(skeleton) || !Array.isArray(skeleton.scenes)) return []

  const scenesRaw = skeleton.scenes as unknown[]
  const sceneInputs = scenesRaw.map(toSceneInput)
  const hasLegacy = sceneInputs.some(isLegacyLike)

  if (hasLegacy) {
    console.warn('[story] Legacy skeleton schema tespit edildi; v2 formatına dönüştürüldü.')
  }

  return transformLegacyScenes(sceneInputs)
}

export function createConversationMemory(): ConversationMemory {
  return {
    npcs: [],
    plot_threads: [],
    player_decisions: []
  }
}

export function updateConversationMemory(
  memory: ConversationMemory,
  updates: Partial<ConversationMemory>
): ConversationMemory {
  return {
    npcs: updates.npcs || memory.npcs,
    plot_threads: updates.plot_threads || memory.plot_threads,
    player_decisions: updates.player_decisions || memory.player_decisions
  }
}

function extractMessageContent(response: OpenAI.Chat.Completions.ChatCompletion): string {
  const raw = response.choices[0]?.message?.content
  if (typeof raw === 'string') return raw

  if (Array.isArray(raw)) {
    return (raw as any[])
      .map((part: any): string => {
        if (typeof part === 'string') return part
        if (isRecord(part) && typeof part.text === 'string') return part.text
        return ''
      })
      .join('')
  }

  throw new Error('SkeletonParseError: Model döndürdüğü içerik boş')
}
