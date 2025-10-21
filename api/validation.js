import logger from './lib/logger.js';

const log = logger.validation;
/**
 * Validation utilities for delta analysis responses
 */

/**
 * Validates an ApplyEditResponse
 */
export function validateApplyEditResponse(response) {
  const errors = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object');
    return { isValid: false, errors };
  }

  if (typeof response.ok !== 'boolean') {
    errors.push('Response must have boolean "ok" field');
  }

  if (!response.data || typeof response.data !== 'object') {
    errors.push('Response must have "data" object');
    return { isValid: false, errors };
  }

  const { data } = response;

  // Validate updatedDetail
  if (!data.updatedDetail || typeof data.updatedDetail !== 'object') {
    errors.push('Data must have "updatedDetail" object');
  } else {
    const detailErrors = validateSceneDetail(data.updatedDetail);
    errors.push(...detailErrors.map(e => `updatedDetail: ${e}`));
  }

  // Validate delta
  if (!data.delta || typeof data.delta !== 'object') {
    errors.push('Data must have "delta" object');
  } else {
    const deltaErrors = validateEditDelta(data.delta);
    errors.push(...deltaErrors.map(e => `delta: ${e}`));
  }

  // Validate affectedScenes
  if (!Array.isArray(data.affectedScenes)) {
    errors.push('Data must have "affectedScenes" array');
  } else {
    data.affectedScenes.forEach((scene, index) => {
      const sceneErrors = validateAffectedScene(scene);
      errors.push(...sceneErrors.map(e => `affectedScenes[${index}]: ${e}`));
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a PropagateResponse
 */
export function validatePropagateResponse(response) {
  const errors = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object');
    return { isValid: false, errors };
  }

  if (typeof response.ok !== 'boolean') {
    errors.push('Response must have boolean "ok" field');
  }

  if (!response.data || typeof response.data !== 'object') {
    errors.push('Response must have "data" object');
    return { isValid: false, errors };
  }

  const { data } = response;

  // Validate regenerationPlan
  if (!Array.isArray(data.regenerationPlan)) {
    errors.push('Data must have "regenerationPlan" array');
  } else {
    data.regenerationPlan.forEach((sceneId, index) => {
      if (typeof sceneId !== 'string') {
        errors.push(`regenerationPlan[${index}] must be a string`);
      } else if (!sceneId.match(/scene[-_]?\d+/i)) {
        errors.push(`regenerationPlan[${index}] must be a valid scene ID format`);
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates an EditDelta
 */
export function validateEditDelta(delta) {
  const errors = [];

  if (!delta || typeof delta !== 'object') {
    errors.push('Delta must be an object');
    return errors;
  }

  if (!Array.isArray(delta.keysChanged)) {
    errors.push('keysChanged must be an array');
  } else {
    delta.keysChanged.forEach((key, index) => {
      if (typeof key !== 'string') {
        errors.push(`keysChanged[${index}] must be a string`);
      }
    });
  }

  if (typeof delta.summary !== 'string') {
    errors.push('summary must be a string');
  }

  return errors;
}

/**
 * Validates an AffectedScene
 */
export function validateAffectedScene(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object') {
    errors.push('Scene must be an object');
    return errors;
  }

  if (typeof scene.sceneId !== 'string') {
    errors.push('sceneId must be a string');
  } else if (!scene.sceneId.match(/scene[-_]?\d+/i)) {
    errors.push('sceneId must be a valid scene ID format');
  }

  if (typeof scene.reason !== 'string') {
    errors.push('reason must be a string');
  }

  if (scene.severity !== 'soft' && scene.severity !== 'hard') {
    errors.push('severity must be either "soft" or "hard"');
  }

  return errors;
}

/**
 * Validates a SceneDetail (basic validation)
 */
export function validateSceneDetail(detail) {
  const errors = [];

  if (!detail || typeof detail !== 'object') {
    errors.push('SceneDetail must be an object');
    return errors;
  }

  if (typeof detail.sceneId !== 'string') {
    errors.push('sceneId must be a string');
  }

  if (typeof detail.title !== 'string') {
    errors.push('title must be a string');
  }

  if (typeof detail.objective !== 'string') {
    errors.push('objective must be a string');
  }

  if (!Array.isArray(detail.keyEvents)) {
    errors.push('keyEvents must be an array');
  }

  if (!Array.isArray(detail.revealedInfo)) {
    errors.push('revealedInfo must be an array');
  }

  if (!detail.stateChanges || typeof detail.stateChanges !== 'object') {
    errors.push('stateChanges must be an object');
  }

  if (!detail.contextOut || typeof detail.contextOut !== 'object') {
    errors.push('contextOut must be an object');
  }

  return errors;
}

/**
 * Creates a safe response with validation
 */
export function createSafeResponse(data, validator) {
  const response = { ...data, _validated: true };
  const validation = validator(response);
  
  if (!validation.isValid) {
    log.warn('Response validation failed:', validation.errors);
  }
  
  return response;
}
