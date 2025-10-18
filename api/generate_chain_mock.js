export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { concept, meta } = req.body;

    if (!concept || concept.trim().length === 0) {
      res.status(400).json({ error: 'Story concept is required' });
      return;
    }

    // Mock response for testing
    const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const mockScenes = [
      {
        id: `scene_1_${Date.now()}`,
        order: 1,
        title: 'The Beginning',
        objective: 'Start the adventure'
      },
      {
        id: `scene_2_${Date.now()}`,
        order: 2,
        title: 'The Challenge',
        objective: 'Face the main obstacle'
      },
      {
        id: `scene_3_${Date.now()}`,
        order: 3,
        title: 'The Discovery',
        objective: 'Uncover important information'
      },
      {
        id: `scene_4_${Date.now()}`,
        order: 4,
        title: 'The Confrontation',
        objective: 'Deal with the main conflict'
      },
      {
        id: `scene_5_${Date.now()}`,
        order: 5,
        title: 'The Resolution',
        objective: 'Conclude the story'
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
    console.error('Error in mock generate chain:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
