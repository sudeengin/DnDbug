import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { MODEL_ID } from './model.js'
import { generateSkeletonV2, getScenesForPhase3, type Scene } from './genSkeleton.js'

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

    if (mode === 'skeleton') {
      const data = await generateSkeletonV2(client, payload)
      res.status(200).json({ ok: true, data })
      return
    }

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

function buildPrompt(mode: 'scene1' | 'continue', payload: unknown): string {
  if (mode === 'scene1') {
    const skeleton = extractSkeleton(payload)
    const normalized = normalizeSkeleton(skeleton)
    const contextPayload = buildContextPayload(payload, normalized)
    const context = JSON.stringify(contextPayload, null, 2)
    return `Return JSON only.
Schema:
{
  "scene_title": string,
  "scene_objective": string,
  "setting": string,
  "atmosphere": string,
  "gm_narrative": string,
  "beats": [ string ],
  "checks": [ { "type": "skill|save", "dc": number, "on_success": string, "on_fail": string } ],
  "clues": [ string ],
  "rewards": [ string ]
}
Context:
${context}
Keep it system neutral and practical.`
  }

  const skeleton = extractSkeleton(payload)
  const normalized = normalizeSkeleton(skeleton)
  const contextPayload = buildContextPayload(payload, normalized)
  const context = JSON.stringify(contextPayload, null, 2)
  return `Return JSON only.
Schema: { "scene_title": string, "scene_objective": string, "gm_narrative": string, "beats": [string] }
Continue with next scene.
Context:
${context}`
}

type NormalizedSkeleton = { main_objective?: string; scenes: Scene[] }
type StoryMode = 'skeleton' | 'scene1' | 'continue'
type StoryRequestBody = { mode: StoryMode; payload: unknown }

function normalizeSkeleton(raw: unknown): NormalizedSkeleton | undefined {
  const scenes = getScenesForPhase3(raw)
  if (!scenes.length) return undefined

  const mainObjective =
    isRecord(raw) && typeof raw.main_objective === 'string' ? raw.main_objective : undefined

  return { main_objective: mainObjective, scenes }
}

function extractSkeleton(payload: unknown): unknown {
  if (isRecord(payload) && 'skeleton' in payload) {
    return (payload as Record<string, unknown>).skeleton
  }
  return undefined
}

function buildContextPayload(
  payload: unknown,
  normalized: NormalizedSkeleton | undefined,
): unknown {
  if (isRecord(payload)) {
    const copy: Record<string, unknown> = { ...payload }
    if (normalized) {
      copy.skeleton = normalized
    }
    return copy
  }
  return { payload, skeleton: normalized }
}

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
