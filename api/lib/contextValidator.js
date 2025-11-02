import logger from './logger.js';

const log = logger.context;

/**
 * Validates that a session context has the expected structure
 * @param {Object} context - The session context to validate
 * @returns {Object} - Validation result with { valid: boolean, errors: string[] }
 */
export function validateSessionContext(context) {
  const errors = [];

  if (!context) {
    errors.push('Context is null or undefined');
    return { valid: false, errors };
  }

  // Required fields
  if (!context.sessionId) {
    errors.push('Missing required field: sessionId');
  }

  if (!context.blocks || typeof context.blocks !== 'object') {
    errors.push('Missing or invalid field: blocks (must be an object)');
  }

  if (context.version === undefined || typeof context.version !== 'number') {
    errors.push('Missing or invalid field: version (must be a number)');
  }

  if (!context.createdAt) {
    errors.push('Missing required field: createdAt');
  }

  if (!context.updatedAt) {
    errors.push('Missing required field: updatedAt');
  }

  // Optional but expected fields
  if (context.locks && typeof context.locks !== 'object') {
    errors.push('Invalid field: locks (must be an object)');
  }

  if (context.meta && typeof context.meta !== 'object') {
    errors.push('Invalid field: meta (must be an object)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a session context belongs to a specific session
 * @param {Object} context - The session context to validate
 * @param {string} expectedSessionId - The expected session ID
 * @returns {Object} - Validation result with { valid: boolean, errors: string[] }
 */
export function validateSessionOwnership(context, expectedSessionId) {
  const errors = [];

  if (!context) {
    errors.push('Context is null or undefined');
    return { valid: false, errors };
  }

  if (!expectedSessionId) {
    errors.push('Expected session ID is null or undefined');
    return { valid: false, errors };
  }

  if (context.sessionId !== expectedSessionId) {
    errors.push(
      `Session ID mismatch: context has '${context.sessionId}' but expected '${expectedSessionId}'`
    );
    log.error('🚨 SESSION ID MISMATCH DETECTED', {
      contextSessionId: context.sessionId,
      expectedSessionId,
      contextVersion: context.version,
      contextBlocks: Object.keys(context.blocks || {}),
      severity: 'CRITICAL'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Ensures a new session context is truly empty
 * @param {Object} context - The session context to validate
 * @returns {Object} - Validation result with { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateNewSession(context) {
  const errors = [];
  const warnings = [];

  if (!context) {
    errors.push('Context is null or undefined');
    return { valid: false, errors, warnings };
  }

  // Check that it's a fresh context
  if (context.version !== 0) {
    warnings.push(`New session has non-zero version: ${context.version}`);
  }

  // Check that blocks are empty
  if (context.blocks && Object.keys(context.blocks).length > 0) {
    errors.push(
      `New session should have empty blocks, but has: ${Object.keys(context.blocks).join(', ')}`
    );
    log.error('🚨 NEW SESSION HAS EXISTING DATA - POSSIBLE DATA LEAK', {
      sessionId: context.sessionId,
      blockTypes: Object.keys(context.blocks),
      version: context.version,
      severity: 'CRITICAL'
    });
  }

  // Check that macroChains are empty
  if (context.macroChains && Object.keys(context.macroChains).length > 0) {
    errors.push(
      `New session should have no macro chains, but has: ${Object.keys(context.macroChains).length}`
    );
  }

  // Check that sceneDetails are empty
  if (context.sceneDetails && Object.keys(context.sceneDetails).length > 0) {
    errors.push(
      `New session should have no scene details, but has: ${Object.keys(context.sceneDetails).length}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Logs validation results
 * @param {Object} validationResult - Result from validation functions
 * @param {string} context - Description of what was being validated
 */
export function logValidationResult(validationResult, context = 'Validation') {
  if (validationResult.valid) {
    log.success(`✅ ${context} passed`);
  } else {
    log.error(`❌ ${context} failed:`, {
      errors: validationResult.errors,
      warnings: validationResult.warnings
    });
  }

  if (validationResult.warnings && validationResult.warnings.length > 0) {
    log.warn(`⚠️ ${context} warnings:`, validationResult.warnings);
  }
}
