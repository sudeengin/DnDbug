// Test script for the Macro Chain API
const testGenerateChain = async (concept, meta = {}) => {
  if (!concept) {
    throw new Error('Story concept is required for testing. Please provide a concept.');
  }
  
  try {
    const response = await fetch('/api/generate_chain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        concept: concept,
        meta: {
          gameType: 'one-shot',
          players: '3-4 players',
          level: 'beginner',
          ...meta
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
  
  // Example concept for testing - replace with your own
  const testConcept = process.argv[2] || 'A mysterious forest where ancient trees whisper secrets to those who listen carefully';
  
  if (!testConcept) {
    console.log('❌ Please provide a story concept as an argument or set it in the code.');
    console.log('Usage: node test-api.js "Your story concept here"');
    process.exit(1);
  }
  
  const generateResult = await testGenerateChain(testConcept);
  
  if (generateResult && generateResult.data) {
    console.log('\n🧪 Testing Update Chain API...\n');
    await testUpdateChain(generateResult.data.chainId);
  }
  
  console.log('\n✅ API tests completed!');
})();
