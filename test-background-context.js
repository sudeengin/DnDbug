import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testBackgroundContext() {
  const sessionId = `test-session-${Date.now()}`;
  
  console.log('🧪 Testing Background Context Flow');
  console.log('=====================================');
  
  try {
    // Step 1: Create a test background
    console.log('\n1. Creating test background...');
    const backgroundData = {
      premise: "A mysterious fog has enveloped the town of Millbrook, and strange creatures have been sighted in the mist.",
      tone_rules: [
        "Maintain an atmosphere of creeping dread",
        "Use subtle horror elements",
        "Keep the mystery central to all interactions"
      ],
      stakes: [
        "The fog is spreading to neighboring towns",
        "People are disappearing in the mist",
        "The town's children are acting strangely"
      ],
      mysteries: [
        "What is the source of the fog?",
        "Why are the children behaving oddly?",
        "What happened to the missing people?"
      ],
      factions: [
        "The Town Council (trying to maintain order)",
        "The Children (acting as a collective)",
        "The Outsiders (investigators from outside)"
      ],
      location_palette: [
        "The fog-covered town square",
        "The abandoned mill on the outskirts",
        "The children's playground at night"
      ],
      npc_roster_skeleton: [
        "Mayor Thompson (worried leader)",
        "Dr. Sarah Chen (town physician)",
        "Little Timmy (child who knows too much)"
      ],
      motifs: [
        "Thick, impenetrable fog",
        "Children's laughter in the distance",
        "Whispers in the mist"
      ],
      doNots: [
        "Don't reveal the source too early",
        "Don't make it too gory",
        "Don't break the mystery atmosphere"
      ],
      playstyle_implications: [
        "Investigation-heavy gameplay",
        "Atmospheric descriptions important",
        "Player paranoia should be encouraged"
      ]
    };

    const backgroundResponse = await fetch(`${BASE_URL}/api/context/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        blockType: 'background',
        data: backgroundData
      })
    });

    if (!backgroundResponse.ok) {
      throw new Error(`Failed to store background: ${backgroundResponse.statusText}`);
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

    // Step 3: Retrieve context to verify
    console.log('\n3. Retrieving context to verify...');
    const contextResponse = await fetch(`${BASE_URL}/api/context/get?sessionId=${sessionId}`);
    const contextData = await contextResponse.json();

    if (!contextData.ok) {
      throw new Error('Failed to retrieve context');
    }

    console.log('Context retrieved:', {
      hasBackground: !!contextData.data?.blocks?.background,
      isLocked: contextData.data?.locks?.background,
      backgroundKeys: contextData.data?.blocks?.background ? Object.keys(contextData.data.blocks.background) : []
    });

    // Step 4: Test chain generation
    console.log('\n4. Testing chain generation with background context...');
    const chainResponse = await fetch(`${BASE_URL}/api/generate_chain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        concept: "The party investigates the mysterious fog in Millbrook",
        meta: { gameType: 'D&D', players: '4', level: '5' }
      })
    });

    const chainData = await chainResponse.json();
    
    if (!chainData.ok) {
      throw new Error(`Failed to generate chain: ${chainData.error}`);
    }

    console.log('✅ Chain generated successfully');
    console.log('Generated scenes:');
    chainData.data.scenes.forEach((scene, index) => {
      console.log(`  ${index + 1}. ${scene.title}`);
      console.log(`     Objective: ${scene.objective}`);
    });

    // Step 5: Check if the scenes reflect the background context
    console.log('\n5. Analyzing if scenes use background context...');
    const scenes = chainData.data.scenes;
    const backgroundKeywords = [
      'fog', 'mist', 'millbrook', 'children', 'mystery', 'investigation',
      'atmosphere', 'dread', 'creeping', 'strange', 'disappearing'
    ];

    let contextUsage = 0;
    scenes.forEach((scene, index) => {
      const sceneText = `${scene.title} ${scene.objective}`.toLowerCase();
      const foundKeywords = backgroundKeywords.filter(keyword => 
        sceneText.includes(keyword)
      );
      if (foundKeywords.length > 0) {
        contextUsage++;
        console.log(`  Scene ${index + 1} uses background context: ${foundKeywords.join(', ')}`);
      }
    });

    console.log(`\n📊 Results:`);
    console.log(`   Scenes using background context: ${contextUsage}/${scenes.length}`);
    console.log(`   Context usage rate: ${Math.round((contextUsage / scenes.length) * 100)}%`);

    if (contextUsage === 0) {
      console.log('\n❌ ISSUE DETECTED: No scenes are using the background context!');
      console.log('   This suggests the background is not being properly passed to the AI.');
    } else if (contextUsage < scenes.length / 2) {
      console.log('\n⚠️  PARTIAL ISSUE: Some scenes use background context, but not all.');
      console.log('   The background might be partially working.');
    } else {
      console.log('\n✅ SUCCESS: Background context is being used effectively!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testBackgroundContext();
