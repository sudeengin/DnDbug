// Simple test script for the Macro Chain API
const testGenerateChain = async () => {
  try {
    const response = await fetch('/api/generate_chain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        concept: 'A mysterious forest where ancient trees whisper secrets to those who listen carefully',
        meta: {
          gameType: 'one-shot',
          players: '3-4 players',
          level: 'beginner'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Generate Chain API Response:', JSON.stringify(data, null, 2));
    
    if (data.ok && data.data && data.data.scenes) {
      console.log(`✅ Generated ${data.data.scenes.length} scenes`);
      data.data.scenes.forEach((scene, index) => {
        console.log(`  Scene ${index + 1}: ${scene.title}`);
        console.log(`    Objective: ${scene.objective}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Generate Chain API Error:', error.message);
    return null;
  }
};

const testUpdateChain = async (chainId) => {
  try {
    const response = await fetch('/api/update_chain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId: chainId,
        edits: [{
          type: 'edit_title',
          sceneId: 'test_scene_1',
          newValue: 'Updated Scene Title'
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Update Chain API Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Update Chain API Error:', error.message);
    return null;
  }
};

// Run tests
(async () => {
  console.log('🧪 Testing Macro Chain API...\n');
  
  const generateResult = await testGenerateChain();
  
  if (generateResult && generateResult.data) {
    console.log('\n🧪 Testing Update Chain API...\n');
    await testUpdateChain(generateResult.data.chainId);
  }
  
  console.log('\n✅ API tests completed!');
})();
