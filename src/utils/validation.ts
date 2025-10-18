export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateSkeletonData(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check if data is an object
  if (typeof data !== 'object' || data === null) {
    errors.push({
      field: 'root',
      message: 'Veri bir obje olmalı',
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }

  const obj = data as Record<string, unknown>;

  // Check main_objective
  if (typeof obj.main_objective !== 'string' || obj.main_objective.trim() === '') {
    errors.push({
      field: 'main_objective',
      message: 'Ana hedef boş olamaz',
      severity: 'error'
    });
  }

  // Check scenes array
  if (!Array.isArray(obj.scenes)) {
    errors.push({
      field: 'scenes',
      message: 'Sahneler bir dizi olmalı',
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }

  if (obj.scenes.length === 0) {
    errors.push({
      field: 'scenes',
      message: 'En az bir sahne olmalı',
      severity: 'error'
    });
  }

  if (obj.scenes.length > 10) {
    warnings.push({
      field: 'scenes',
      message: 'Çok fazla sahne var (10\'dan fazla)',
      severity: 'warning'
    });
  }

  // Validate each scene
  obj.scenes.forEach((scene, index) => {
    const sceneErrors = validateScene(scene, index);
    errors.push(...sceneErrors.filter(e => e.severity === 'error'));
    warnings.push(...sceneErrors.filter(e => e.severity === 'warning'));
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function validateScene(scene: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof scene !== 'object' || scene === null) {
    errors.push({
      field: `scenes[${index}]`,
      message: 'Sahne bir obje olmalı',
      severity: 'error'
    });
    return errors;
  }

  const sceneObj = scene as Record<string, unknown>;
  const prefix = `scenes[${index}]`;

  // Check scene_title
  if (typeof sceneObj.scene_title !== 'string' || sceneObj.scene_title.trim() === '') {
    errors.push({
      field: `${prefix}.scene_title`,
      message: 'Sahne başlığı boş olamaz',
      severity: 'error'
    });
  }

  // Check scene_objective
  if (typeof sceneObj.scene_objective !== 'string' || sceneObj.scene_objective.trim() === '') {
    errors.push({
      field: `${prefix}.scene_objective`,
      message: 'Sahne hedefi boş olamaz',
      severity: 'error'
    });
  }

  // Check optional fields
  if (sceneObj.branch_hint !== undefined && typeof sceneObj.branch_hint !== 'string') {
    errors.push({
      field: `${prefix}.branch_hint`,
      message: 'Branch hint bir metin olmalı',
      severity: 'error'
    });
  }

  if (sceneObj.improv_note !== undefined && typeof sceneObj.improv_note !== 'string') {
    errors.push({
      field: `${prefix}.improv_note`,
      message: 'Improv note bir metin olmalı',
      severity: 'error'
    });
  }

  // Word count warnings
  if (typeof sceneObj.scene_objective === 'string') {
    const wordCount = sceneObj.scene_objective.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 5) {
      errors.push({
        field: `${prefix}.scene_objective`,
        message: 'Sahne hedefi en az 5 kelime olmalı',
        severity: 'warning'
      });
    }
    if (wordCount > 50) {
      errors.push({
        field: `${prefix}.scene_objective`,
        message: 'Sahne hedefi çok uzun (50+ kelime)',
        severity: 'warning'
      });
    }
  }

  return errors;
}

export function parseAndValidateSkeleton(rawText: string): { data: unknown; validation: ValidationResult } {
  let parsed: unknown;
  
  try {
    // Remove markdown code blocks if present
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (error) {
    return {
      data: null,
      validation: {
        isValid: false,
        errors: [{
          field: 'json',
          message: `JSON parse hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          severity: 'error'
        }],
        warnings: []
      }
    };
  }

  const validation = validateSkeletonData(parsed);
  return { data: parsed, validation };
}
