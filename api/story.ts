import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' })
      return
    }

    const { mode, payload } = req.body as {
      mode: 'skeleton' | 'scene1' | 'continue'
      payload: any
    }

    if (!mode || !payload) {
      res.status(400).json({ error: 'Missing mode or payload' })
      return
    }

    const system =
      'You are Story Agent. Produce concise, runnable JSON for a GM. Always return valid JSON for the requested schema.'

    const user = buildPrompt(mode, payload)
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })

    const text = resp.choices[0]?.message?.content ?? ''
    res.status(200).json({ ok: true, data: tryJson(text) })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: e?.message ?? 'Server error' })
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
  if (mode === 'skeleton') {
    return `Return JSON only.
Schema:
{
  "main_objective": string,
  "scenes": [ { "title": string, "objective": string } ]
}
Inputs:
${JSON.stringify(payload, null, 2)}
Rules: 3-6 scenes. Short titles.`
  }
  if (mode === 'scene1') {
    return `Return JSON only.
Schema:
{
  "scene_title": string,
  "objective": string,
  "setting": string,
  "atmosphere": string,
  "gm_narrative": string,
  "beats": [ string ],
  "checks": [ { "type": "skill|save", "dc": number, "on_success": string, "on_fail": string } ],
  "clues": [ string ],
  "rewards": [ string ]
}
Context:
${JSON.stringify(payload, null, 2)}
Keep it system neutral and practical.`
  }
  return `Return JSON only.
Schema: { "scene_title": string, "objective": string, "gm_narrative": string, "beats": [string] }
Continue with next scene.
Context:
${JSON.stringify(payload, null, 2)}`
}
