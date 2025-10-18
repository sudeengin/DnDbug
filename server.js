import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API endpoints for local development
app.post('/api/generate_chain', async (req, res) => {
  try {
    const { concept, meta } = req.body;

    if (!concept || concept.trim().length === 0) {
      return res.status(400).json({ error: 'Story concept is required' });
    }

    // Mock response for local development
    const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate mock scenes based on the concept
    const mockScenes = [
      {
        id: `scene_1_${Date.now()}`,
        order: 1,
        title: 'The Whispering Grove',
        objective: 'Discover the source of the ancient whispers'
      },
      {
        id: `scene_2_${Date.now()}`,
        order: 2,
        title: 'The Guardian Trees',
        objective: 'Navigate through the protective forest guardians'
      },
      {
        id: `scene_3_${Date.now()}`,
        order: 3,
        title: 'The Heart of the Forest',
        objective: 'Reach the central clearing where the oldest tree stands'
      },
      {
        id: `scene_4_${Date.now()}`,
        order: 4,
        title: 'The Ancient Secret',
        objective: 'Uncover the hidden knowledge within the tree'
      },
      {
        id: `scene_5_${Date.now()}`,
        order: 5,
        title: 'The Forest\'s Choice',
        objective: 'Decide whether to preserve or share the forest\'s secret'
      }
    ];

    const macroChain = {
      chainId,
      scenes: mockScenes,
      meta: meta || undefined,
    };

    console.log('Mock Generate Chain:', {
      chainId,
      concept: concept.substring(0, 50) + '...',
      sceneCount: mockScenes.length,
      timestamp: Date.now(),
    });

    res.status(200).json({ ok: true, data: macroChain });

  } catch (error) {
    console.error('Error in generate_chain:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update_chain', async (req, res) => {
  try {
    const { chainId, edits } = req.body;

    if (!chainId || !Array.isArray(edits)) {
      return res.status(400).json({ error: 'chainId and edits array are required' });
    }

    // Mock response for local development
    const mockChain = {
      chainId,
      scenes: [], // This would be populated from the database
      meta: {}
    };

    // Process each edit
    for (const edit of edits) {
      switch (edit.type) {
        case 'reorder':
          console.log(`Mock: Reordering scene ${edit.sceneId} to position ${edit.newOrder}`);
          break;
          
        case 'edit_title':
          console.log(`Mock: Updating title for scene ${edit.sceneId} to: ${edit.newValue}`);
          break;
          
        case 'edit_objective':
          console.log(`Mock: Updating objective for scene ${edit.sceneId} to: ${edit.newValue}`);
          break;
          
        default:
          console.warn(`Mock: Unknown edit type: ${edit.type}`);
      }
    }

    console.log('Mock Update Chain:', {
      chainId,
      editCount: edits.length,
      timestamp: Date.now(),
    });

    res.status(200).json({ ok: true, data: mockChain });

  } catch (error) {
    console.error('Error in update_chain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available:`);
  console.log(`   POST /api/generate_chain`);
  console.log(`   POST /api/update_chain`);
  console.log(`   GET  /api/health`);
});
