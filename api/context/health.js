import { loadSessionContext } from '../storage.js';
import logger from '../lib/logger.js';

const log = logger.context;

/**
 * Health check endpoint for session context
 * Returns information about whether a session exists and its basic state
 */
export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method !== 'GET') {
      return res.status(405).json({ 
        error: 'Method not allowed' 
      });
    }

    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'sessionId query parameter is required' 
      });
    }

    const sessionContext = await loadSessionContext(sessionId);

    const health = {
      sessionId,
      exists: !!sessionContext,
      timestamp: new Date().toISOString()
    };

    if (sessionContext) {
      health.version = sessionContext.version;
      health.hasBackground = !!(sessionContext.blocks && sessionContext.blocks.background);
      health.hasCharacters = !!(sessionContext.blocks && sessionContext.blocks.characters);
      health.hasMacroChains = !!sessionContext.macroChains;
      health.macroChainCount = sessionContext.macroChains ? Object.keys(sessionContext.macroChains).length : 0;
      health.blocksCount = sessionContext.blocks ? Object.keys(sessionContext.blocks).length : 0;
      health.locks = sessionContext.locks || {};
      health.createdAt = sessionContext.createdAt;
      health.updatedAt = sessionContext.updatedAt;
    }

    log.debug('Session health check:', health);

    res.status(200).json({ 
      ok: true, 
      data: health 
    });

  } catch (error) {
    log.error('Error in context/health:', error);
    res.status(500).json({ error: error.message });
  }
}
