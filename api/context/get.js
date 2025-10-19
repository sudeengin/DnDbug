// Import the context handler functions
import { getOrCreateSessionContext } from '../context.js';

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

    const sessionContext = await getOrCreateSessionContext(sessionId);

    if (!sessionContext || Object.keys(sessionContext.blocks).length === 0) {
      return res.status(200).json({ 
        ok: true, 
        data: null 
      });
    }

    console.log('Context retrieved:', {
      sessionId,
      version: sessionContext.version,
      blockTypes: Object.keys(sessionContext.blocks),
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    console.error('Error in context/get:', error);
    res.status(500).json({ error: error.message });
  }
}
