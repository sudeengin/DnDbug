import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import { PHASE2_PROMPT_V2 } from './skeletonPrompt.js'

export type LegacyScene = { title: string; objective: string }

export type Scene = {
  scene_title: string
  scene_objective: string
  branch_hint?: string
  improv_note?: string
}

export type SkeletonV2 = { main_objective: string; scenes: Scene[] }

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
    branch_hint: scene.branch_hint ? String(scene.branch_hint).trim() : undefined,
    improv_note: scene.improv_note ? String(scene.improv_note).trim() : undefined,
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
  const variedThreshold = Math.max(2, Math.ceil(objectives.length * 0.6))
  const varied = unique.length >= variedThreshold

  return { varied, duplicates }
}

function lintObjectives(scenes: Scene[]): string[] {
  const errors: string[] = []
  const objectives = scenes.map((scene) => scene.scene_objective)

  scenes.forEach((scene, index) => {
    const wc = countWords(scene.scene_objective)
    if (wc < 14 || wc > 22) {
      errors.push(`Scene ${index + 1}: kelime sayısı ${wc} (14–22 olmalı)`)
    }

    const lower = scene.scene_objective.toLowerCase()
    if (forbiddenVerbs.some((verb) => lower.includes(verb))) {
      errors.push(`Scene ${index + 1}: monoton fiil kullanımı tespit edildi`)
    }
  })

  const { varied, duplicates } = analyseVerbs(objectives)
  if (!varied) {
    errors.push('Fiil çeşitliliği yetersiz')
  }

  if (duplicates.length) {
    errors.push(`Tekrarlanan fiiller: ${duplicates.join(', ')}`)
  }

  const hasBranch = scenes.some((scene) => Boolean(scene.branch_hint))
  const hasImprov = scenes.some((scene) => Boolean(scene.improv_note))

  if (!hasBranch) errors.push('En az bir scene için branch_hint bekleniyordu')
  if (!hasImprov) errors.push('En az bir scene için improv_note bekleniyordu')

  return errors
}

export async function generateSkeletonV2(client: OpenAI, input: unknown): Promise<SkeletonV2> {
  const response = await client.chat.completions.create({
    model: MODEL_ID,
    messages: [
      { role: 'system', content: PHASE2_PROMPT_V2.trim() },
      { role: 'user', content: JSON.stringify(input, null, 2) },
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

function extractMessageContent(response: OpenAI.Chat.Completions.ChatCompletion): string {
  const raw = response.choices[0]?.message?.content
  if (typeof raw === 'string') return raw

  if (Array.isArray(raw)) {
    const parts = raw as Array<string | Record<string, unknown>>
    return parts
      .map((part): string => {
        if (typeof part === 'string') return part
        if (isRecord(part) && typeof part.text === 'string') return part.text
        return ''
      })
      .join('')
  }

  throw new Error('SkeletonParseError: Model döndürdüğü içerik boş')
}
