import { loadChain, updateChain } from './storage.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { chainId, edits } = req.body;

    if (!chainId || !Array.isArray(edits)) {
      res.status(400).json({ error: 'chainId and edits array are required' });
      return;
    }

    // Load existing chain
    const existingChain = await loadChain(chainId);
    if (!existingChain) {
      res.status(404).json({ error: 'Chain not found' });
      return;
    }

    // Create a copy of the chain to modify
    let updatedChain = { 
      ...existingChain,
      status: existingChain.status || 'Edited',
      version: (existingChain.version || 0) + 1,
      lastUpdatedAt: new Date().toISOString()
    };

    // Process each edit
    for (const edit of edits) {
      switch (edit.type) {
        case 'reorder':
          console.log(`Reordering scene ${edit.sceneId} to position ${edit.newOrder}`);
          // Find the scene and update its order
          const sceneToReorder = updatedChain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToReorder) {
            sceneToReorder.order = edit.newOrder;
            // Re-sort scenes by order
            updatedChain.scenes.sort((a, b) => a.order - b.order);
          }
          break;
          
        case 'edit_title':
          console.log(`Updating title for scene ${edit.sceneId} to: ${edit.newValue}`);
          const sceneToEditTitle = updatedChain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToEditTitle) {
            sceneToEditTitle.title = edit.newValue;
          }
          break;
          
        case 'edit_objective':
          console.log(`Updating objective for scene ${edit.sceneId} to: ${edit.newValue}`);
          const sceneToEditObjective = updatedChain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToEditObjective) {
            sceneToEditObjective.objective = edit.newValue;
          }
          break;
          
        case 'delete_scene':
          console.log(`Deleting scene ${edit.sceneId}`);
          updatedChain.scenes = updatedChain.scenes.filter(s => s.id !== edit.sceneId);
          // Reorder remaining scenes
          updatedChain.scenes.forEach((scene, index) => {
            scene.order = index + 1;
          });
          break;
          
        case 'add_scene':
          console.log(`Adding new scene:`, edit.sceneData);
          const newScene = {
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            order: updatedChain.scenes.length + 1,
            title: edit.sceneData.title || 'New Scene',
            objective: edit.sceneData.objective || 'New objective'
          };
          updatedChain.scenes.push(newScene);
          break;
          
        default:
          console.warn(`Unknown edit type: ${edit.type}`);
      }
    }

    // Save the updated chain
    const savedChain = await updateChain(chainId, updatedChain);

    // Log telemetry
    console.log('Telemetry: update_chain', {
      chainId,
      editCount: edits.length,
      timestamp: Date.now(),
    });

    res.status(200).json({ ok: true, data: savedChain });

  } catch (error) {
    console.error('Error updating chain:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
