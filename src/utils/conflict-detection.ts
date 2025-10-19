import type { SessionContext } from '../types/macro-chain';

export interface ConflictWarning {
  type: 'tone' | 'theme' | 'style' | 'constraint';
  severity: 'low' | 'medium' | 'high';
  message: string;
  context: string;
}

export interface ConflictAnalysis {
  hasConflicts: boolean;
  warnings: ConflictWarning[];
  suggestions: string[];
}

/**
 * Analyzes potential conflicts between a story concept and existing session context
 */
export function analyzeConceptContextConflicts(
  concept: string,
  context: SessionContext | null
): ConflictAnalysis {
  if (!context || !context.blocks) {
    return {
      hasConflicts: false,
      warnings: [],
      suggestions: []
    };
  }

  const warnings: ConflictWarning[] = [];
  const suggestions: string[] = [];
  const conceptLower = concept.toLowerCase();

  // Check blueprint conflicts
  if (context.blocks.blueprint) {
    const blueprint = context.blocks.blueprint;
    
    // Tone conflicts
    if (blueprint.tone) {
      const toneLower = blueprint.tone.toLowerCase();
      if (toneLower.includes('dark') && conceptLower.includes('bright')) {
        warnings.push({
          type: 'tone',
          severity: 'high',
          message: `Concept mentions "bright" but blueprint tone is "${blueprint.tone}"`,
          context: `Blueprint tone: ${blueprint.tone}`
        });
        suggestions.push('Consider adjusting the concept to match the dark tone or update the blueprint tone');
      }
      
      if (toneLower.includes('serious') && (conceptLower.includes('funny') || conceptLower.includes('comedy'))) {
        warnings.push({
          type: 'tone',
          severity: 'medium',
          message: `Concept includes comedic elements but blueprint tone is "${blueprint.tone}"`,
          context: `Blueprint tone: ${blueprint.tone}`
        });
      }
    }

    // Theme conflicts
    if (blueprint.theme) {
      const themeLower = blueprint.theme.toLowerCase();
      if (themeLower.includes('horror') && (conceptLower.includes('cheerful') || conceptLower.includes('happy'))) {
        warnings.push({
          type: 'theme',
          severity: 'high',
          message: `Concept is cheerful but blueprint theme is "${blueprint.theme}"`,
          context: `Blueprint theme: ${blueprint.theme}`
        });
        suggestions.push('Consider making the concept more aligned with the horror theme');
      }
      
      if (themeLower.includes('mystery') && conceptLower.includes('obvious')) {
        warnings.push({
          type: 'theme',
          severity: 'medium',
          message: `Concept seems obvious but blueprint theme is "${blueprint.theme}"`,
          context: `Blueprint theme: ${blueprint.theme}`
        });
      }
    }

    // Setting conflicts
    if (blueprint.setting) {
      const settingLower = blueprint.setting.toLowerCase();
      if (settingLower.includes('urban') && conceptLower.includes('forest')) {
        warnings.push({
          type: 'theme',
          severity: 'medium',
          message: `Concept involves forest but blueprint setting is "${blueprint.setting}"`,
          context: `Blueprint setting: ${blueprint.setting}`
        });
      }
    }
  }

  // Check style preferences conflicts
  if (context.blocks.style_prefs) {
    const stylePrefs = context.blocks.style_prefs;
    
    // Do Nots violations
    if (stylePrefs.doNots && stylePrefs.doNots.length > 0) {
      stylePrefs.doNots.forEach(doNot => {
        const doNotLower = doNot.toLowerCase();
        
        if (doNotLower.includes('death') && conceptLower.includes('kill')) {
          warnings.push({
            type: 'style',
            severity: 'high',
            message: `Concept involves killing but style preference says: "${doNot}"`,
            context: `Style preference: ${doNot}`
          });
          suggestions.push('Consider adjusting the concept to avoid character death or update the style preferences');
        }
        
        if (doNotLower.includes('deus ex machina') && conceptLower.includes('suddenly')) {
          warnings.push({
            type: 'style',
            severity: 'medium',
            message: `Concept may involve sudden solutions but style preference says: "${doNot}"`,
            context: `Style preference: ${doNot}`
          });
        }
      });
    }

    // Tone conflicts with style preferences
    if (stylePrefs.tone) {
      const styleToneLower = stylePrefs.tone.toLowerCase();
      if (styleToneLower.includes('serious') && (conceptLower.includes('silly') || conceptLower.includes('absurd'))) {
        warnings.push({
          type: 'style',
          severity: 'medium',
          message: `Concept is silly but style tone is "${stylePrefs.tone}"`,
          context: `Style tone: ${stylePrefs.tone}`
        });
      }
    }
  }

  // Check world constraints
  if (context.blocks.world_seeds && context.blocks.world_seeds.constraints) {
    context.blocks.world_seeds.constraints.forEach(constraint => {
      const constraintLower = constraint.toLowerCase();
      
      if (constraintLower.includes('no magic') && conceptLower.includes('spell')) {
        warnings.push({
          type: 'constraint',
          severity: 'high',
          message: `Concept involves magic but world constraint says: "${constraint}"`,
          context: `World constraint: ${constraint}`
        });
        suggestions.push('Consider removing magical elements or updating the world constraints');
      }
      
      if (constraintLower.includes('daylight only') && conceptLower.includes('night')) {
        warnings.push({
          type: 'constraint',
          severity: 'medium',
          message: `Concept involves night scenes but world constraint says: "${constraint}"`,
          context: `World constraint: ${constraint}`
        });
      }
    });
  }

  return {
    hasConflicts: warnings.length > 0,
    warnings,
    suggestions
  };
}

/**
 * Generates a user-friendly conflict report
 */
export function generateConflictReport(analysis: ConflictAnalysis): string {
  if (!analysis.hasConflicts) {
    return '✅ No conflicts detected. Concept aligns well with existing context.';
  }

  let report = `⚠️ ${analysis.warnings.length} conflict(s) detected:\n\n`;
  
  analysis.warnings.forEach((warning, index) => {
    const severityIcon = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
    report += `${index + 1}. ${severityIcon} ${warning.message}\n`;
    report += `   Context: ${warning.context}\n\n`;
  });

  if (analysis.suggestions.length > 0) {
    report += '💡 Suggestions:\n';
    analysis.suggestions.forEach((suggestion, index) => {
      report += `${index + 1}. ${suggestion}\n`;
    });
  }

  return report;
}

/**
 * Checks if the concept should be allowed to proceed despite conflicts
 */
export function shouldAllowConceptWithConflicts(analysis: ConflictAnalysis): boolean {
  // Allow if no high-severity conflicts
  const highSeverityConflicts = analysis.warnings.filter(w => w.severity === 'high');
  return highSeverityConflicts.length === 0;
}
