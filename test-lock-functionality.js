import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testLockFunctionality() {
  try {
    console.log('🔒 Testing Lock Functionality');
    console.log('================================\n');

    const sessionId = `test-lock-${Date.now()}`;
    
    // Step 1: Create a background
    console.log('1. Creating background...');
    const backgroundData = {
      premise: "A mysterious fog has enveloped the town of Millbrook",
      tone_rules: ["Use words like 'mysterious', 'creeping', 'whispered'"],
      stakes: ["The fog is spreading to neighboring towns"],
      mysteries: ["What is the source of the fog?"],
      location_palette: ["The fog-covered town square of Millbrook"],
      npc_roster_skeleton: ["Mayor Thompson (worried leader of Millbrook)"],
      motifs: ["Thick, impenetrable fog"],
      doNots: ["Don't reveal the source of the fog too early"],
      playstyle_implications: ["Investigation-heavy gameplay"]
    };

    const appendResponse = await fetch(`${BASE_URL}/api/context/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        blockType: 'background',
        data: backgroundData
      })
    });

    if (!appendResponse.ok) {
      throw new Error(`Failed to store background: ${appendResponse.statusText}`);
    }
    console.log('✅ Background stored successfully');

    // Step 2: Lock the background
    console.log('\n2. Locking background...');
    const lockResponse = await fetch(`${BASE_URL}/api/context/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        blockType: 'background',
        locked: true
      })
    });

    if (!lockResponse.ok) {
      throw new Error(`Failed to lock background: ${lockResponse.statusText}`);
    }
    console.log('✅ Background locked successfully');

    // Step 3: Check lock state
    console.log('\n3. Checking lock state...');
    const getResponse = await fetch(`${BASE_URL}/api/context/get?sessionId=${sessionId}`);
    const getData = await getResponse.json();
    
    if (!getData.ok) {
      throw new Error(`Failed to get context: ${getData.error}`);
    }

    console.log('Context data:', JSON.stringify(getData.data, null, 2));
    
    if (getData.data.locks && getData.data.locks.background === true) {
      console.log('✅ Lock state is correctly persisted: background = true');
    } else {
      console.log('❌ Lock state is NOT persisted: background =', getData.data.locks?.background);
    }

    // Step 4: Unlock the background
    console.log('\n4. Unlocking background...');
    const unlockResponse = await fetch(`${BASE_URL}/api/context/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        blockType: 'background',
        locked: false
      })
    });

    if (!unlockResponse.ok) {
      throw new Error(`Failed to unlock background: ${unlockResponse.statusText}`);
    }
    console.log('✅ Background unlocked successfully');

    // Step 5: Check unlock state
    console.log('\n5. Checking unlock state...');
    const getResponse2 = await fetch(`${BASE_URL}/api/context/get?sessionId=${sessionId}`);
    const getData2 = await getResponse2.json();
    
    if (getData2.data.locks && getData2.data.locks.background === false) {
      console.log('✅ Unlock state is correctly persisted: background = false');
    } else {
      console.log('❌ Unlock state is NOT persisted: background =', getData2.data.locks?.background);
    }

    console.log('\n🎉 Lock functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLockFunctionality();
