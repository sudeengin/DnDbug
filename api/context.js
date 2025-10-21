import { 
  saveSessionContext, 
  loadSessionContext, 
  updateSessionContext 
} from './storage.js';
import { invalidateMacroChain, invalidateAllScenes } from './lib/invalidation.js';
import logger from './lib/logger.js';

const log = logger.context;

// Helper function to create or get session context
async function getOrCreateSessionContext(sessionId) {
  let sessionContext = await loadSessionContext(sessionId);
  
  if (!sessionContext) {
    log.warn(`Creating NEW session context for ${sessionId} - this should only happen on first initialization!`);
    sessionContext = {
      sessionId,
      blocks: {},
      locks: {},
      meta: {
        backgroundV: 0,
        charactersV: 0,
        macroSnapshotV: 0,
        updatedAt: new Date().toISOString()
      },
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await saveSessionContext(sessionId, sessionContext);
  } else {
    log.success(`Loaded existing session context for ${sessionId} - version: ${sessionContext.version}`);
  }
  
  // Ensure meta exists for existing sessions
  if (!sessionContext.meta) {
    sessionContext.meta = {
      backgroundV: 0,
      charactersV: 0,
      macroSnapshotV: 0,
      updatedAt: new Date().toISOString()
    };
  }
  
  return sessionContext;
}

// Helper function to merge context data
function mergeContextData(existing, newData, blockType) {
  switch (blockType) {
    case 'blueprint':
      // Blueprint always has highest priority - replace completely
      return { ...newData };
    
    case 'player_hooks':
      // Player hooks are additive - append to existing array
      const existingHooks = existing?.player_hooks || [];
      return [...existingHooks, ...(Array.isArray(newData) ? newData : [newData])];
    
    case 'world_seeds':
      // World seeds merge arrays additively
      const existingSeeds = existing?.world_seeds || {};
      return {
        factions: [...(existingSeeds.factions || []), ...(newData.factions || [])],
        locations: [...(existingSeeds.locations || []), ...(newData.locations || [])],
        constraints: [...(existingSeeds.constraints || []), ...(newData.constraints || [])]
      };
    
    case 'style_prefs':
      // Style preferences merge, with doNots being additive
      const existingPrefs = existing?.style_prefs || {};
      return {
        ...existingPrefs,
        ...newData,
        doNots: [...(existingPrefs.doNots || []), ...(newData.doNots || [])]
      };
    
    case 'custom':
      // Custom data merges deeply, preserving existing macro chain data
      const mergedCustom = { ...existing, ...newData };
      
      // If we're updating macro chain data, preserve the existing macro chain if it exists
      if (newData.macroChain && existing?.macroChain) {
        mergedCustom.macroChain = {
          ...existing.macroChain,
          ...newData.macroChain
        };
      }
      
      return mergedCustom;
    
    case 'background':
      // Background always has highest priority - replace completely
      return { ...newData };
    
    case 'story_facts':
      // Story facts from scene details are additive
      const existingFacts = existing || [];
      if (Array.isArray(existingFacts)) {
        return [...existingFacts, newData];
      } else {
        return [newData];
      }
    
    case 'story_concept':
      // Story concept always has highest priority - replace completely
      return { ...newData };
    
    case 'characters':
      // Characters always has highest priority - replace completely
      return { ...newData };
    
    default:
      return newData;
  }
}

// Helper function to summarize large text content
function summarizeContent(content, maxLength = 200) {
  if (typeof content !== 'string' || content.length <= maxLength) {
    return content;
  }
  
  // Simple summarization - take first 2-3 sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const summary = sentences.slice(0, 2).join('. ').trim();
  
  return summary.length > maxLength 
    ? summary.substring(0, maxLength - 3) + '...'
    : summary;
}

// Helper function to process context for prompt injection
function processContextForPrompt(sessionContext) {
  if (!sessionContext || !sessionContext.blocks) {
    return {};
  }

  const processed = {};
  const { blocks } = sessionContext;

  // Process blueprint (highest priority)
  if (blocks.blueprint) {
    processed.blueprint = {
      theme: blocks.blueprint.theme,
      core_idea: summarizeContent(blocks.blueprint.core_idea),
      tone: blocks.blueprint.tone,
      pacing: blocks.blueprint.pacing,
      setting: blocks.blueprint.setting,
      hooks: blocks.blueprint.hooks?.slice(0, 5) // Limit to 5 hooks
    };
  }

  // Process player hooks (limit to 3 most important)
  if (blocks.player_hooks && blocks.player_hooks.length > 0) {
    processed.player_hooks = blocks.player_hooks.slice(0, 3).map(hook => ({
      name: hook.name,
      class: hook.class,
      motivation: summarizeContent(hook.motivation),
      ties: hook.ties?.slice(0, 2) // Limit ties
    }));
  }

  // Process world seeds (limit each array)
  if (blocks.world_seeds) {
    processed.world_seeds = {
      factions: blocks.world_seeds.factions?.slice(0, 3),
      locations: blocks.world_seeds.locations?.slice(0, 3),
      constraints: blocks.world_seeds.constraints?.slice(0, 5)
    };
  }

  // Process style preferences
  if (blocks.style_prefs) {
    processed.style_prefs = {
      language: blocks.style_prefs.language,
      tone: blocks.style_prefs.tone,
      pacingHints: blocks.style_prefs.pacingHints?.slice(0, 3),
      doNots: blocks.style_prefs.doNots?.slice(0, 5)
    };
  }

  // Process background (highest priority after blueprint)
  if (blocks.background) {
    log.debug('Processing background:', JSON.stringify(blocks.background, null, 2));
    processed.background = {
      premise: blocks.background.premise,
      tone_rules: blocks.background.tone_rules?.slice(0, 5),
      stakes: blocks.background.stakes?.slice(0, 5),
      mysteries: blocks.background.mysteries?.slice(0, 5),
      factions: blocks.background.factions?.slice(0, 5),
      location_palette: blocks.background.location_palette?.slice(0, 5),
      npc_roster_skeleton: blocks.background.npc_roster_skeleton?.slice(0, 5),
      motifs: blocks.background.motifs?.slice(0, 5),
      doNots: blocks.background.doNots?.slice(0, 5),
      playstyle_implications: blocks.background.playstyle_implications?.slice(0, 5)
    };
  }

  // Process story concept (highest priority)
  if (blocks.story_concept) {
    processed.story_concept = {
      concept: blocks.story_concept.concept,
      meta: blocks.story_concept.meta,
      timestamp: blocks.story_concept.timestamp
    };
  }

  // Process characters
  if (blocks.characters) {
    processed.characters = {
      list: blocks.characters.list?.slice(0, 5) || [], // Limit to 5 characters
      locked: blocks.characters.locked || false,
      version: blocks.characters.version || 0
    };
  }

  return processed;
}

export default async function handler(req, res) {
  try {
    const { method } = req;
    const url = req.url || '';

    if (method === 'POST' && (url.endsWith('/append') || url === '/context/append')) {
      // POST /context/append
      const { sessionId, blockType, data } = req.body;

      if (!sessionId || !blockType || !data) {
        return res.status(400).json({ 
          error: 'sessionId, blockType, and data are required' 
        });
      }

      if (!['blueprint', 'player_hooks', 'world_seeds', 'style_prefs', 'custom', 'background', 'story_concept', 'characters'].includes(blockType)) {
        return res.status(400).json({ 
          error: 'Invalid blockType. Must be one of: blueprint, player_hooks, world_seeds, style_prefs, custom, background, story_concept, characters' 
        });
      }

      const sessionContext = await getOrCreateSessionContext(sessionId);
      const existingBlock = sessionContext.blocks[blockType];

      // Merge the new data with existing data
      const mergedData = mergeContextData(existingBlock, data, blockType);

      // Update the session context
      sessionContext.blocks[blockType] = mergedData;
      sessionContext.version += 1;
      sessionContext.updatedAt = new Date().toISOString();
      
      // Bump version numbers for specific block types and invalidate downstream
      if (blockType === 'background') {
        sessionContext.meta.backgroundV = (sessionContext.meta.backgroundV || 0) + 1;
        sessionContext.meta.updatedAt = new Date().toISOString();
        
        // Invalidate Macro Chain and all Scenes when Background changes
        invalidateMacroChain(sessionContext, 'background');
        invalidateAllScenes(sessionContext, 'background');
      } else if (blockType === 'characters') {
        sessionContext.meta.charactersV = (sessionContext.meta.charactersV || 0) + 1;
        sessionContext.meta.updatedAt = new Date().toISOString();
        
        // Invalidate Macro Chain and all Scenes when Characters change
        invalidateMacroChain(sessionContext, 'characters');
        invalidateAllScenes(sessionContext, 'characters');
      }
      
      // Save the updated context
      await updateSessionContext(sessionId, sessionContext);

      log.info('Context appended:', {
        sessionId,
        blockType,
        version: sessionContext.version,
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: sessionContext 
      });

    } else if (method === 'GET' && (url.endsWith('/get') || url === '/context/get')) {
      // GET /context/get
      log.debug('GET /context/get - req.query:', req.query);
      log.debug('GET /context/get - url:', url);
      
      const sessionId = req.query?.sessionId;

      if (!sessionId) {
        return res.status(400).json({ 
          error: 'sessionId query parameter is required' 
        });
      }

      const sessionContext = await loadSessionContext(sessionId);

      if (!sessionContext) {
        return res.status(200).json({ 
          ok: true, 
          data: null 
        });
      }

      // Migrate scene details to new structure if needed
      if (sessionContext.sceneDetails) {
        log.debug('Checking scene details for migration:', Object.keys(sessionContext.sceneDetails));
        let needsMigration = false;
        const migratedSceneDetails = {};
        for (const [sceneId, sceneDetail] of Object.entries(sessionContext.sceneDetails)) {
          log.debug(`Checking scene ${sceneId} for migration:`, {
            hasContextOut: !!sceneDetail.contextOut,
            hasDynamicElementsContextOut: !!sceneDetail.dynamicElements?.contextOut
          });
          const migrated = migrateSceneDetailStructure(sceneDetail);
          migratedSceneDetails[sceneId] = migrated;
          // Check if migration was needed
          if (!sceneDetail.contextOut && migrated.contextOut) {
            log.info(`Migration needed for scene ${sceneId}`);
            needsMigration = true;
          }
        }
        sessionContext.sceneDetails = migratedSceneDetails;
        
        // If migration was needed, save the updated context back to storage
        if (needsMigration) {
          log.info('Migrating scene details to new structure and saving to storage');
          await saveSessionContext(sessionId, sessionContext);
        } else {
          log.debug('No migration needed for scene details');
        }
      }

      log.info('Context retrieved:', {
        sessionId,
        version: sessionContext.version,
        blockTypes: Object.keys(sessionContext.blocks),
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: sessionContext 
      });

    } else if (method === 'POST' && (url.endsWith('/clear') || url === '/context/clear')) {
      // POST /context/clear
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ 
          error: 'sessionId is required' 
        });
      }

      // Note: We don't have a delete function in storage yet, but we can clear the context
      // For now, we'll just log that it should be cleared
      log.warn('Context clear requested for sessionId:', sessionId);

      log.info('Context cleared:', {
        sessionId,
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: { sessionId, cleared: true } 
      });

    } else {
      res.status(405).json({ 
        error: 'Method not allowed' 
      });
    }

  } catch (error) {
    log.error('Error in context handler:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}

/**
 * Migrates old scene detail structure to new structure
 * @param {Object} sceneDetail - The scene detail to migrate
 * @returns {Object} - The migrated scene detail
 */
function migrateSceneDetailStructure(sceneDetail) {
  // If contextOut is already at top level, return as is
  if (sceneDetail.contextOut) {
    return sceneDetail
  }

  // If contextOut is inside dynamicElements, migrate it
  if (sceneDetail.dynamicElements?.contextOut) {
    const oldContextOut = sceneDetail.dynamicElements.contextOut
    
    // Convert old structure to new structure
    const newContextOut = {
      keyEvents: oldContextOut.story_facts || [],
      revealedInfo: [],
      stateChanges: oldContextOut.world_state || {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    }

    // Add world seeds as environmental state if they exist
    if (oldContextOut.world_seeds) {
      newContextOut.environmentalState = {
        ...newContextOut.environmentalState,
        locations: oldContextOut.world_seeds.locations || [],
        factions: oldContextOut.world_seeds.factions || [],
        constraints: oldContextOut.world_seeds.constraints || []
      }
    }

    // Add character moments as key events if they exist
    if (oldContextOut.characterMoments && Array.isArray(oldContextOut.characterMoments)) {
      newContextOut.keyEvents = [...newContextOut.keyEvents, ...oldContextOut.characterMoments]
    }

    // Create new scene detail with migrated structure
    const { dynamicElements, ...rest } = sceneDetail
    const { contextOut: _, ...newDynamicElements } = dynamicElements || {}

    return {
      ...rest,
      contextOut: newContextOut,
      dynamicElements: newDynamicElements
    }
  }

  // If no contextOut exists, create default structure
  return {
    ...sceneDetail,
    contextOut: {
      keyEvents: [],
      revealedInfo: [],
      stateChanges: {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    }
  }
}

// Export helper functions for use in other modules
export { processContextForPrompt, getOrCreateSessionContext, mergeContextData, migrateSceneDetailStructure };
