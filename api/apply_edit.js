import { analyzeDelta } from './delta_service.js';
import { buildDeltaAnalysisPrompt, validateDeltaResponse, createFallbackDelta } from './delta_prompt.js';
import { validateApplyEditResponse } from './validation.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const body = parseBody(req.body);
    if (!isApplyEditRequest(body)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const { sceneId, oldDetail, newDetail } = body;

    console.log('Apply Edit Request:', {
      sceneId,
      hasOldDetail: !!oldDetail,
      hasNewDetail: !!newDetail,
      timestamp: Date.now()
    });

    // For now, use programmatic analysis since we don't have OpenAI setup
    const result = analyzeDelta(oldDetail, newDetail);

    const response = {
      ok: true,
      data: result
    };

    // Validate the response
    const validation = validateApplyEditResponse(response);
    if (!validation.isValid) {
      console.warn('Response validation failed:', validation.errors);
    }

    console.log('Apply Edit Response:', {
      sceneId,
      keysChanged: result.delta.keysChanged.length,
      affectedScenesCount: result.affectedScenes.length,
      summary: result.delta.summary.substring(0, 100) + '...',
      isValid: validation.isValid
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in apply_edit:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    res.status(500).json({ error: message });
  }
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }

  if (body instanceof Buffer) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return undefined;
    }
  }

  return body;
}

function isApplyEditRequest(value) {
  return (
    isRecord(value) &&
    typeof value.sceneId === 'string' &&
    isRecord(value.oldDetail) &&
    isRecord(value.newDetail) &&
    // Basic SceneDetail validation
    typeof value.oldDetail.sceneId === 'string' &&
    typeof value.oldDetail.title === 'string' &&
    typeof value.newDetail.sceneId === 'string' &&
    typeof value.newDetail.title === 'string'
  );
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}
