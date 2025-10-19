// Simple test for the Story Background Generator API
const testBackgroundGenerator = async () => {
  const testConcept = "Bir grup yabancı, kışın ortasında gizemli bir davet alır.";

  try {
    console.log('🧪 Testing Story Background Generator API...');
    console.log('📝 Test Concept:', testConcept);
    
    const response = await fetch('http://localhost:3000/api/generate_background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storyConcept: testConcept })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📊 Raw response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    console.log('✅ API Response received');
    console.log('📊 Response structure:');
    console.log('  - Has fiveWoneH:', !!data.data?.fiveWoneH);
    console.log('  - Has backgroundSummary:', !!data.data?.backgroundSummary);
    console.log('  - Anchors count:', data.data?.anchors?.length || 0);
    console.log('  - Unknowns count:', data.data?.unknowns?.length || 0);

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
};

// Run the test
testBackgroundGenerator();
