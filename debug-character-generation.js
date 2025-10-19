// Debug script to test character generation API directly
const API_BASE = 'http://localhost:3000/api';

async function debugCharacterGeneration() {
  const sessionId = 'debug-session-' + Date.now();
  
  console.log('🔍 Starting character generation debug...');
  console.log('Session ID:', sessionId);
  
  try {
    // Step 1: Generate background
    console.log('📝 Step 1: Generating background...');
    const backgroundResponse = await fetch(`${API_BASE}/generate_background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        concept: 'A group of adventurers investigates mysterious disappearances in a cursed village.',
        meta: { numberOfPlayers: 4 }
      })
    });
    
    const backgroundData = await backgroundResponse.json();
    console.log('Background response:', backgroundData);
    
    if (!backgroundData.ok) {
      throw new Error('Background generation failed: ' + backgroundData.error);
    }
    
    // Step 2: Check session context before locking
    console.log('🔍 Step 2a: Checking session context...');
    const contextResponse = await fetch(`${API_BASE}/context/get?sessionId=${sessionId}`);
    const contextData = await contextResponse.json();
    console.log('Context response:', contextData);
    
    // Step 2b: Lock background
    console.log('🔒 Step 2b: Locking background...');
    const lockResponse = await fetch(`${API_BASE}/context/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        blockType: 'background',
        locked: true
      })
    });
    
    const lockData = await lockResponse.json();
    console.log('Lock response:', lockData);
    
    if (!lockData.ok) {
      throw new Error('Background lock failed: ' + lockData.error);
    }
    
    // Step 3: Generate characters
    console.log('👥 Step 3: Generating characters...');
    const charactersResponse = await fetch(`${API_BASE}/characters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    const charactersData = await charactersResponse.json();
    console.log('Characters response:', charactersData);
    console.log('Characters response structure:', {
      ok: charactersData.ok,
      hasCharacters: !!charactersData.characters,
      charactersLength: charactersData.characters?.length,
      charactersType: typeof charactersData.characters,
      charactersIsArray: Array.isArray(charactersData.characters)
    });
    
    if (charactersData.ok && charactersData.characters) {
      console.log('✅ Characters generated successfully!');
      console.log('Character names:', charactersData.characters.map(c => c.name));
      console.log('First character:', charactersData.characters[0]);
    } else {
      console.error('❌ Character generation failed:', charactersData.error);
    }
    
    // Step 4: Test character list API
    console.log('📋 Step 4: Testing character list API...');
    const listResponse = await fetch(`${API_BASE}/characters/list?sessionId=${sessionId}`);
    const listData = await listResponse.json();
    console.log('List response:', listData);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugCharacterGeneration();
