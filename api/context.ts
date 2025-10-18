/**
 * Two-Layer Scene Architecture - Context System
 * 
 * This module defines the context/state object structure for scene transitions
 * in the new Two-Layer Scene Architecture system.
 */

export type SceneContext = {
  scene_id: number;
  title: string;
  objective: string;
  key_events: string[];
  revealed_info: string[];
  state_changes: Record<string, any>;
  npc_relationships?: Record<string, {
    trust_level: number;
    last_interaction: string;
    attitude: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  }>;
  environmental_state?: Record<string, any>;
  plot_threads?: Array<{
    thread_id: string;
    title: string;
    status: 'active' | 'resolved' | 'abandoned';
    description: string;
  }>;
  player_decisions?: Array<{
    decision_id: string;
    context: string;
    choice: string;
    consequences: string[];
    impact_level: 'low' | 'medium' | 'high';
  }>;
}

export type SceneChainContext = {
  main_objective: string;
  scenes: Array<{
    scene_id: number;
    title: string;
    objective: string;
    context?: SceneContext;
  }>;
  global_state: {
    campaign_theme: string;
    current_phase: 'setup' | 'development' | 'climax' | 'resolution';
    weather?: string;
    time_of_day?: string;
    location?: string;
  };
}

/**
 * Creates a new scene context from a completed scene
 */
export function createSceneContext(
  sceneId: number,
  title: string,
  objective: string,
  sceneData: any
): SceneContext {
  return {
    scene_id: sceneId,
    title,
    objective,
    key_events: extractKeyEvents(sceneData),
    revealed_info: extractRevealedInfo(sceneData),
    state_changes: extractStateChanges(sceneData),
    npc_relationships: extractNPCRelationships(sceneData),
    environmental_state: extractEnvironmentalState(sceneData),
    plot_threads: extractPlotThreads(sceneData),
    player_decisions: extractPlayerDecisions(sceneData)
  };
}

/**
 * Merges multiple scene contexts into a comprehensive context for next scene generation
 */
export function mergeSceneContexts(contexts: SceneContext[]): Partial<SceneContext> {
  const merged: Partial<SceneContext> = {
    key_events: [],
    revealed_info: [],
    state_changes: {},
    npc_relationships: {},
    environmental_state: {},
    plot_threads: [],
    player_decisions: []
  };

  contexts.forEach(context => {
    // Merge key events
    if (context.key_events) {
      merged.key_events!.push(...context.key_events);
    }

    // Merge revealed info
    if (context.revealed_info) {
      merged.revealed_info!.push(...context.revealed_info);
    }

    // Merge state changes (later scenes override earlier ones)
    if (context.state_changes) {
      Object.assign(merged.state_changes!, context.state_changes);
    }

    // Merge NPC relationships (later interactions override earlier ones)
    if (context.npc_relationships) {
      Object.assign(merged.npc_relationships!, context.npc_relationships);
    }

    // Merge environmental state
    if (context.environmental_state) {
      Object.assign(merged.environmental_state!, context.environmental_state);
    }

    // Merge plot threads
    if (context.plot_threads) {
      merged.plot_threads!.push(...context.plot_threads);
    }

    // Merge player decisions
    if (context.player_decisions) {
      merged.player_decisions!.push(...context.player_decisions);
    }
  });

  return merged;
}

/**
 * Creates context-aware prompt for scene detailing
 */
export function createContextAwarePrompt(
  basePrompt: string,
  sceneChain: any,
  previousContexts: SceneContext[],
  currentSceneIndex: number
): string {
  const contextSummary = createContextSummary(previousContexts);
  const sceneChainContext = createSceneChainContext(sceneChain, currentSceneIndex);
  
  return `${basePrompt}

CONTEXT FROM PREVIOUS SCENES:
${contextSummary}

CURRENT SCENE CHAIN CONTEXT:
${sceneChainContext}

IMPORTANT: Use the context from previous scenes to inform the current scene generation. 
The scene should feel like a natural continuation of the story, incorporating:
- Key events that have already happened
- Information that has been revealed
- State changes that have occurred
- NPC relationships that have developed
- Environmental changes that have taken place
- Plot threads that are active or have been resolved
- Player decisions and their consequences

The scene should build upon this context while maintaining the original scene objective from the chain.`;
}

function extractKeyEvents(sceneData: any): string[] {
  const events: string[] = [];
  
  if (sceneData.beats && Array.isArray(sceneData.beats)) {
    events.push(...sceneData.beats);
  }
  
  if (sceneData.gm_narrative) {
    // Extract key events from narrative (simplified)
    events.push(`Narrative event: ${sceneData.gm_narrative.substring(0, 100)}...`);
  }
  
  return events;
}

function extractRevealedInfo(sceneData: any): string[] {
  const info: string[] = [];
  
  if (sceneData.clues && Array.isArray(sceneData.clues)) {
    info.push(...sceneData.clues);
  }
  
  if (sceneData.npc_mini_cards && Array.isArray(sceneData.npc_mini_cards)) {
    sceneData.npc_mini_cards.forEach((npc: any) => {
      if (npc.secret) {
        info.push(`NPC ${npc.name}: ${npc.secret}`);
      }
    });
  }
  
  return info;
}

function extractStateChanges(sceneData: any): Record<string, any> {
  const changes: Record<string, any> = {};
  
  // Extract from combat probability
  if (sceneData.combat_probability_and_balance) {
    changes.combat_likelihood = sceneData.combat_probability_and_balance.likelihood;
  }
  
  // Extract from environment
  if (sceneData.environment_and_sensory) {
    changes.environmental_state = sceneData.environment_and_sensory;
  }
  
  return changes;
}

function extractNPCRelationships(sceneData: any): Record<string, any> | undefined {
  if (!sceneData.npc_mini_cards || !Array.isArray(sceneData.npc_mini_cards)) {
    return undefined;
  }
  
  const relationships: Record<string, any> = {};
  
  sceneData.npc_mini_cards.forEach((npc: any) => {
    relationships[npc.name] = {
      trust_level: 0, // Default neutral
      last_interaction: 'met',
      attitude: npc.demeanor === 'friendly' ? 'friendly' : 
                npc.demeanor === 'hostile' ? 'hostile' : 'neutral'
    };
  });
  
  return relationships;
}

function extractEnvironmentalState(sceneData: any): Record<string, any> | undefined {
  if (!sceneData.environment_and_sensory) {
    return undefined;
  }
  
  return {
    visual: sceneData.environment_and_sensory.visual,
    auditory: sceneData.environment_and_sensory.auditory,
    olfactory: sceneData.environment_and_sensory.olfactory,
    tactile: sceneData.environment_and_sensory.tactile_or_thermal
  };
}

function extractPlotThreads(sceneData: any): Array<any> | undefined {
  // This would need to be implemented based on how plot threads are tracked
  // For now, return undefined
  return undefined;
}

function extractPlayerDecisions(sceneData: any): Array<any> | undefined {
  // This would need to be implemented based on how player decisions are tracked
  // For now, return undefined
  return undefined;
}

function createContextSummary(contexts: SceneContext[]): string {
  if (contexts.length === 0) {
    return "No previous scenes - this is the first scene.";
  }
  
  const summary = contexts.map(context => {
    return `Scene ${context.scene_id}: ${context.title}
- Key Events: ${context.key_events.join(', ')}
- Revealed Info: ${context.revealed_info.join(', ')}
- State Changes: ${JSON.stringify(context.state_changes)}
- NPC Relationships: ${JSON.stringify(context.npc_relationships)}`;
  }).join('\n\n');
  
  return summary;
}

function createSceneChainContext(sceneChain: any, currentSceneIndex: number): string {
  if (!sceneChain || !sceneChain.scenes) {
    return "No scene chain context available.";
  }
  
  const currentScene = sceneChain.scenes[currentSceneIndex];
  const previousScenes = sceneChain.scenes.slice(0, currentSceneIndex);
  
  return `Current Scene: ${currentScene?.title || 'Unknown'} - ${currentScene?.objective || 'Unknown'}
Previous Scenes: ${previousScenes.map((s: any) => s.title).join(', ')}
Main Objective: ${sceneChain.main_objective || 'Unknown'}`;
}
