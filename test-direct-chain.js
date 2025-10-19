import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testDirectChain() {
  const sessionId = `direct-test-${Date.now()}`;
  
  console.log('🧪 Testing Direct Chain Generation');
  console.log('==================================');
  
  try {
    // Step 1: Create a very specific background
    console.log('\n1. Creating specific background...');
    const backgroundData = {
      premise: "A mysterious fog has enveloped the town of Millbrook, and strange creatures have been sighted in the mist. The children of the town are acting strangely, gathering in the playground at night and speaking in unison.",
      tone_rules: [
        "Use words like 'mysterious', 'creeping', 'whispered', 'haunting'",
        "Create an atmosphere of unease and dread",
        "Focus on the supernatural and unexplained"
      ],
      stakes: [
        "The fog is spreading to neighboring towns",
        "People are disappearing in the mist",
        "The children are being controlled by something"
      ],
      mysteries: [
        "What is the source of the fog?",
        "Why are the children behaving oddly?",
        "What happened to the missing people?",
        "What is the thing in the mist?"
      ],
      factions: [
        "The Town Council (trying to maintain order)",
        "The Children (acting as a collective)",
        "The Outsiders (investigators from outside)"
      ],
      location_palette: [
        "The fog-covered town square of Millbrook",
        "The abandoned mill on the outskirts",
        "The children's playground at night",
        "The thick fog banks around town"
      ],
      npc_roster_skeleton: [
        "Mayor Thompson (worried leader of Millbrook)",
        "Dr. Sarah Chen (town physician investigating the children)",
        "Little Timmy (child who knows too much about the fog)"
      ],
      motifs: [
        "Thick, impenetrable fog",
        "Children's laughter in the distance",
        "Whispers in the mist",
        "The abandoned mill"
      ],
      doNots: [
        "Don't reveal the source of the fog too early",
        "Don't make it too gory or violent",
        "Don't break the mystery atmosphere",
        "Don't ignore the children's behavior"
      ],
      playstyle_implications: [
        "Investigation-heavy gameplay",
        "Atmospheric descriptions are crucial",
        "Player paranoia should be encouraged",
        "Focus on the children and their strange behavior"
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

    // Step 3: Generate chain with very specific concept
    console.log('\n3. Generating chain with specific concept...');
    const chainResponse = await fetch(`${BASE_URL}/api/generate_chain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        concept: "The party investigates the mysterious fog in Millbrook and the strange behavior of the children",
        meta: { gameType: 'D&D', players: '4', level: '5' }
      })
    });

    const chainData = await chainResponse.json();
    
    if (!chainData.ok) {
      throw new Error(`Failed to generate chain: ${chainData.error}`);
    }

    console.log('✅ Chain generated successfully');
    console.log('\nGenerated scenes:');
    chainData.data.scenes.forEach((scene, index) => {
      console.log(`  ${index + 1}. ${scene.title}`);
      console.log(`     Objective: ${scene.objective}`);
    });

    // Step 4: Analyze background usage
    console.log('\n4. Analyzing background usage...');
    const scenes = chainData.data.scenes;
    const backgroundKeywords = [
      'millbrook', 'fog', 'mist', 'children', 'mysterious', 'creeping', 'haunting',
      'playground', 'town', 'investigation', 'strange', 'whispers', 'abandoned'
    ];

    let contextUsage = 0;
    scenes.forEach((scene, index) => {
      const sceneText = `${scene.title} ${scene.objective}`.toLowerCase();
      const foundKeywords = backgroundKeywords.filter(keyword => 
        sceneText.includes(keyword)
      );
      if (foundKeywords.length > 0) {
        contextUsage++;
        console.log(`  ✅ Scene ${index + 1} uses background: ${foundKeywords.join(', ')}`);
      } else {
        console.log(`  ❌ Scene ${index + 1} does NOT use background context`);
      }
    });

    console.log(`\n📊 Results:`);
    console.log(`   Scenes using background context: ${contextUsage}/${scenes.length}`);
    console.log(`   Context usage rate: ${Math.round((contextUsage / scenes.length) * 100)}%`);

    if (contextUsage === 0) {
      console.log('\n❌ CRITICAL ISSUE: No scenes are using the background context!');
      console.log('   The background is not being passed to the AI properly.');
    } else if (contextUsage < scenes.length / 2) {
      console.log('\n⚠️  PARTIAL ISSUE: Some scenes use background context, but not all.');
    } else {
      console.log('\n✅ SUCCESS: Background context is being used effectively!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testDirectChain();
