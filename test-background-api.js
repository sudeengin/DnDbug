// Test script for the Story Background Generator API
const testBackgroundGenerator = async () => {
  const testConcept = "Bir grup yabancı, kışın ortasında gizemli bir davet alır. Davetiyeler mühürsüz zarflarla ulaşmış ve kim tarafından gönderildiği belirsiz. Kuzey Ormanı'nın derinliklerindeki Esmond Malikanesi'ne çağrılmışlar.";

  try {
    console.log('🧪 Testing Story Background Generator API...');
    console.log('📝 Test Concept:', testConcept.substring(0, 50) + '...');
    
    const response = await fetch('http://localhost:3000/api/generate_background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storyConcept: testConcept })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    console.log('✅ API Response received');
    console.log('📊 Response structure:');
    console.log('  - Has fiveWoneH:', !!data.data?.fiveWoneH);
    console.log('  - Has backgroundSummary:', !!data.data?.backgroundSummary);
    console.log('  - Anchors count:', data.data?.anchors?.length || 0);
    console.log('  - Unknowns count:', data.data?.unknowns?.length || 0);
    console.log('  - GM Secrets count:', data.data?.gmSecrets?.length || 0);
    console.log('  - Motifs count:', data.data?.motifs?.length || 0);
    console.log('  - Hooks count:', data.data?.hooks?.length || 0);
    console.log('  - Continuity Flags count:', data.data?.continuityFlags?.length || 0);
    console.log('  - Tone:', data.data?.tone || 'N/A');
    console.log('  - Pacing:', data.data?.pacing || 'N/A');

    // Test 5N1K structure
    if (data.data?.fiveWoneH) {
      console.log('\n🔍 5N1K Analysis:');
      Object.entries(data.data.fiveWoneH).forEach(([key, item]) => {
        console.log(`  ${key}: "${item.value}" (${item.status}, ${item.revealPlan}, ${Math.round(item.confidence * 100)}%)`);
      });
    }

    console.log('\n📖 Background Summary:');
    console.log(data.data?.backgroundSummary || 'No summary provided');

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
};

// Run the test
testBackgroundGenerator();
