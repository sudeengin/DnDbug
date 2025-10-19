import fetch from 'node-fetch';

async function testGenerateEndpoint() {
  try {
    console.log('Testing /api/generate_chain endpoint...\n');
    
    const response = await fetch('http://localhost:3000/api/generate_chain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-endpoint-' + Date.now(),
        concept: 'A simple adventure story'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\nResponse body (raw):', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\nResponse body (parsed):', JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('\nFailed to parse response as JSON:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGenerateEndpoint();

