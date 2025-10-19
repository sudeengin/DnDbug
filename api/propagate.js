import { createRegenerationPlan } from './delta_service.js';
import { validatePropagateResponse } from './validation.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const body = parseBody(req.body);
    if (!isPropagateRequest(body)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const { fromSceneIndex, chainId, affectedScenes } = body;

    console.log('Propagate Request:', {
      fromSceneIndex,
      chainId,
      affectedScenesCount: affectedScenes.length,
      timestamp: Date.now()
    });

    // Create regeneration plan based on affected scenes
    const regenerationPlan = createRegenerationPlan(affectedScenes);

    // Filter out scenes that don't exist (beyond the chain length)
    // This would typically come from the database, but for now we'll assume max 10 scenes
    const maxScenes = 10;
    const filteredPlan = regenerationPlan.filter(sceneId => {
      const sceneMatch = sceneId.match(/scene[-_]?(\d+)/i);
      if (!sceneMatch) return false;
      const sceneNumber = parseInt(sceneMatch[1]);
      return sceneNumber <= maxScenes;
    });

    const response = {
      ok: true,
      data: {
        regenerationPlan: filteredPlan
      }
    };

    // Validate the response
    const validation = validatePropagateResponse(response);
    if (!validation.isValid) {
      console.warn('Response validation failed:', validation.errors);
    }

    console.log('Propagate Response:', {
      fromSceneIndex,
      chainId,
      originalPlanCount: regenerationPlan.length,
      filteredPlanCount: filteredPlan.length,
      plan: filteredPlan,
      isValid: validation.isValid
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in propagate:', error);
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

function isPropagateRequest(value) {
  return (
    isRecord(value) &&
    typeof value.fromSceneIndex === 'number' &&
    typeof value.chainId === 'string' &&
    Array.isArray(value.affectedScenes) &&
    value.affectedScenes.every(isAffectedScene)
  );
}

function isAffectedScene(value) {
  return (
    isRecord(value) &&
    typeof value.sceneId === 'string' &&
    typeof value.reason === 'string' &&
    (value.severity === 'soft' || value.severity === 'hard')
  );
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}
