export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateMacroScene(scene: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!scene.id || typeof scene.id !== 'string') {
    errors.push({ field: 'id', message: 'Scene ID is required and must be a string' });
  }

  if (!scene.order || typeof scene.order !== 'number' || scene.order < 1) {
    errors.push({ field: 'order', message: 'Scene order is required and must be a positive number' });
  }

  if (!scene.title || typeof scene.title !== 'string' || scene.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Scene title is required and cannot be empty' });
  }

  if (!scene.objective || typeof scene.objective !== 'string' || scene.objective.trim().length === 0) {
    errors.push({ field: 'objective', message: 'Scene objective is required and cannot be empty' });
  }

  // Title length validation
  if (scene.title && scene.title.length > 100) {
    warnings.push({ field: 'title', message: 'Scene title is quite long, consider keeping it concise' });
  }

  // Objective length validation
  if (scene.objective && scene.objective.length > 500) {
    warnings.push({ field: 'objective', message: 'Scene objective is quite long, consider keeping it concise' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateMacroChain(chain: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!chain.chainId || typeof chain.chainId !== 'string') {
    errors.push({ field: 'chainId', message: 'Chain ID is required and must be a string' });
  }

  if (!Array.isArray(chain.scenes)) {
    errors.push({ field: 'scenes', message: 'Scenes must be an array' });
    return { isValid: false, errors, warnings };
  }

  // Scene count validation
  if (chain.scenes.length < 5) {
    errors.push({ field: 'scenes', message: 'Must have at least 5 scenes' });
  } else if (chain.scenes.length > 6) {
    errors.push({ field: 'scenes', message: 'Must have at most 6 scenes' });
  }

  // Validate each scene
  chain.scenes.forEach((scene: any, index: number) => {
    const sceneValidation = validateMacroScene(scene);
    sceneValidation.errors.forEach(error => {
      errors.push({ field: `scenes[${index}].${error.field}`, message: error.message });
    });
    sceneValidation.warnings.forEach(warning => {
      warnings.push({ field: `scenes[${index}].${warning.field}`, message: warning.message });
    });
  });

  // Validate scene order uniqueness and sequence
  const orders = chain.scenes.map((scene: any) => scene.order).filter((order: any) => typeof order === 'number');
  const uniqueOrders = new Set(orders);
  
  if (orders.length !== uniqueOrders.size) {
    errors.push({ field: 'scenes', message: 'Scene orders must be unique' });
  }

  // Check if orders are sequential starting from 1
  const sortedOrders = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      errors.push({ field: 'scenes', message: 'Scene orders must be sequential starting from 1' });
      break;
    }
  }

  // Meta validation (optional)
  if (chain.meta) {
    if (chain.meta.gameType && typeof chain.meta.gameType !== 'string') {
      errors.push({ field: 'meta.gameType', message: 'Game type must be a string' });
    }

    if (chain.meta.players && typeof chain.meta.players !== 'string') {
      errors.push({ field: 'meta.players', message: 'Players must be a string' });
    }

    if (chain.meta.level && typeof chain.meta.level !== 'string') {
      errors.push({ field: 'meta.level', message: 'Level must be a string' });
    }

    if (chain.meta.playstyle) {
      const playstyle = chain.meta.playstyle;
      
      if (playstyle.roleplayPct !== undefined) {
        if (typeof playstyle.roleplayPct !== 'number' || playstyle.roleplayPct < 0 || playstyle.roleplayPct > 100) {
          errors.push({ field: 'meta.playstyle.roleplayPct', message: 'Roleplay percentage must be a number between 0 and 100' });
        }
      }

      if (playstyle.combatPct !== undefined) {
        if (typeof playstyle.combatPct !== 'number' || playstyle.combatPct < 0 || playstyle.combatPct > 100) {
          errors.push({ field: 'meta.playstyle.combatPct', message: 'Combat percentage must be a number between 0 and 100' });
        }
      }

      if (playstyle.improv !== undefined && typeof playstyle.improv !== 'boolean') {
        errors.push({ field: 'meta.playstyle.improv', message: 'Improv must be a boolean' });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateGenerateChainRequest(request: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!request.concept || typeof request.concept !== 'string' || request.concept.trim().length === 0) {
    errors.push({ field: 'concept', message: 'Story concept is required and cannot be empty' });
  }

  if (request.concept && request.concept.length > 2000) {
    warnings.push({ field: 'concept', message: 'Story concept is quite long, consider keeping it concise' });
  }

  if (request.meta) {
    if (request.meta.gameType && typeof request.meta.gameType !== 'string') {
      errors.push({ field: 'meta.gameType', message: 'Game type must be a string' });
    }

    if (request.meta.players && typeof request.meta.players !== 'string') {
      errors.push({ field: 'meta.players', message: 'Players must be a string' });
    }

    if (request.meta.level && typeof request.meta.level !== 'string') {
      errors.push({ field: 'meta.level', message: 'Level must be a string' });
    }

    if (request.meta.playstyle) {
      const playstyle = request.meta.playstyle;
      
      if (playstyle.roleplayPct !== undefined) {
        if (typeof playstyle.roleplayPct !== 'number' || playstyle.roleplayPct < 0 || playstyle.roleplayPct > 100) {
          errors.push({ field: 'meta.playstyle.roleplayPct', message: 'Roleplay percentage must be a number between 0 and 100' });
        }
      }

      if (playstyle.combatPct !== undefined) {
        if (typeof playstyle.combatPct !== 'number' || playstyle.combatPct < 0 || playstyle.combatPct > 100) {
          errors.push({ field: 'meta.playstyle.combatPct', message: 'Combat percentage must be a number between 0 and 100' });
        }
      }

      if (playstyle.improv !== undefined && typeof playstyle.improv !== 'boolean') {
        errors.push({ field: 'meta.playstyle.improv', message: 'Improv must be a boolean' });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
