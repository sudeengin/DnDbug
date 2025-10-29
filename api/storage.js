import fs from 'fs/promises';
import path from 'path';
import logger from "./lib/logger.js";

const log = logger.storage;

const DATA_DIR = path.join(process.cwd(), '.data');
const CHAINS_FILE = path.join(DATA_DIR, 'chains.json');
const CONTEXT_FILE = path.join(DATA_DIR, 'context.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Chain storage functions
export async function saveChain(chain) {
  await ensureDataDir();
  
  try {
    const existingData = await loadAllChains();
    existingData[chain.chainId] = {
      ...chain,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(CHAINS_FILE, JSON.stringify(existingData, null, 2));
    log.success('Chain saved:', chain.chainId);
    return chain;
  } catch (error) {
    log.error('Error saving chain:', error);
    throw new Error('Failed to save chain');
  }
}

export async function loadChain(chainId) {
  await ensureDataDir();
  
  try {
    const allChains = await loadAllChains();
    const chain = allChains[chainId] || null;
    if (chain) {
      log.debug('Chain loaded:', chainId);
    } else {
      log.warn('Chain not found:', chainId);
    }
    return chain;
  } catch (error) {
    log.error('Error loading chain:', error);
    return null;
  }
}

export async function loadAllChains() {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(CHAINS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty object
    return {};
  }
}

export async function updateChain(chainId, updates) {
  await ensureDataDir();
  
  try {
    const allChains = await loadAllChains();
    const existingChain = allChains[chainId];
    
    if (!existingChain) {
      throw new Error('Chain not found');
    }
    
    const updatedChain = {
      ...existingChain,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    allChains[chainId] = updatedChain;
    await fs.writeFile(CHAINS_FILE, JSON.stringify(allChains, null, 2));
    
    log.success('Chain updated:', chainId);
    return updatedChain;
  } catch (error) {
    log.error('Error updating chain:', error);
    throw new Error('Failed to update chain');
  }
}

export async function deleteChain(chainId) {
  await ensureDataDir();
  
  try {
    const allChains = await loadAllChains();
    delete allChains[chainId];
    await fs.writeFile(CHAINS_FILE, JSON.stringify(allChains, null, 2));
    log.success('Chain deleted:', chainId);
    return true;
  } catch (error) {
    log.error('Error deleting chain:', error);
    throw new Error('Failed to delete chain');
  }
}

// Context storage functions
export async function saveSessionContext(sessionId, context) {
  await ensureDataDir();
  
  try {
    const allContexts = await loadAllSessionContexts();
    allContexts[sessionId] = {
      ...context,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(CONTEXT_FILE, JSON.stringify(allContexts, null, 2));
    log.success('Session context saved:', sessionId);
    return context;
  } catch (error) {
    log.error('Error saving session context:', error);
    throw new Error('Failed to save session context');
  }
}

export async function loadSessionContext(sessionId) {
  await ensureDataDir();
  
  try {
    const allContexts = await loadAllSessionContexts();
    const context = allContexts[sessionId] || null;
    if (context) {
      log.debug('Session context loaded:', sessionId);
    } else {
      log.warn('Session context not found:', sessionId);
    }
    return context;
  } catch (error) {
    log.error('Error loading session context:', error);
    return null;
  }
}

export async function loadAllSessionContexts() {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(CONTEXT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty object
    return {};
  }
}

export async function updateSessionContext(sessionId, updates) {
  await ensureDataDir();
  
  try {
    const allContexts = await loadAllSessionContexts();
    const existingContext = allContexts[sessionId];
    
    if (!existingContext) {
      throw new Error('Session context not found');
    }
    
    // Deep merge blocks to preserve all existing blocks and nested data
    const mergedBlocks = { ...existingContext.blocks };
    
    if (updates.blocks) {
      // Merge each block type
      for (const [blockType, blockData] of Object.entries(updates.blocks)) {
        if (blockType === 'custom' && mergedBlocks.custom) {
          // Deep merge custom block to preserve existing custom data
          mergedBlocks.custom = {
            ...mergedBlocks.custom,
            ...blockData
          };
        } else {
          // Replace other block types
          mergedBlocks[blockType] = blockData;
        }
      }
    }
    
    // Deep merge macroChains to preserve other chains
    const mergedMacroChains = { ...existingContext.macroChains };
    if (updates.macroChains) {
      for (const [chainId, chainData] of Object.entries(updates.macroChains)) {
        mergedMacroChains[chainId] = chainData;
      }
    }
    
    const updatedContext = {
      ...existingContext,
      ...updates,
      blocks: mergedBlocks,
      macroChains: mergedMacroChains,
      updatedAt: new Date().toISOString()
    };
    
    allContexts[sessionId] = updatedContext;
    await fs.writeFile(CONTEXT_FILE, JSON.stringify(allContexts, null, 2));
    
    log.success('Session context updated:', sessionId);
    return updatedContext;
  } catch (error) {
    log.error('Error updating session context:', error);
    throw new Error('Failed to update session context');
  }
}
