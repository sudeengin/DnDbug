#!/usr/bin/env node

/**
 * Test server debug functionality
 */

const testData = {
  sceneId: 'test-debug-001',
  macroScene: {
    id: 'test-debug-001',
    title: 'Debug Test Sahnesi',
    objective: 'Debug test',
    order: 1
  },
  effectiveContext: {
    keyEvents: [],
    revealedInfo: [],
    stateChanges: {},
    npcRelationships: {},
    environmentalState: {},
    plotThreads: [],
    playerDecisions: []
  }
};

async function testServerDebug() {
  console.log('🧪 Testing Server Debug...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/generate_detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.data) {
      const sceneDetail = data.data;
      console.log('✅ API Response received successfully\n');
      
      // Check if checks field exists and has dnd_skill
      const hasChecks = sceneDetail.checks && Array.isArray(sceneDetail.checks);
      const checksCount = hasChecks ? sceneDetail.checks.length : 0;
      
      console.log('📊 Validation Results:');
      console.log('====================');
      
      if (hasChecks) {
        console.log(`✅ checks field exists with ${checksCount} checks`);
        
        // Validate each check structure
        sceneDetail.checks.forEach((check, index) => {
          console.log(`\n🔍 Check ${index + 1}:`);
          console.log(`   - Type: ${check.type}`);
          console.log(`   - Ability: ${check.ability}`);
          console.log(`   - Skill (Turkish): ${check.skill}`);
          console.log(`   - D&D Skill: ${check.dnd_skill || 'MISSING'}`);
          console.log(`   - DC: ${check.dc}`);
          console.log(`   - When: ${check.when}`);
          console.log(`   - Success: ${check.on_success}`);
          console.log(`   - Failure: ${check.on_fail}`);
          
          if (check.dnd_skill) {
            console.log(`   ✅ D&D Skill specified: ${check.dnd_skill}`);
          } else {
            console.log(`   ❌ D&D Skill missing`);
          }
        });
        
      } else {
        console.log(`❌ checks field missing or not an array`);
      }
      
      // Check if the response has any debug information
      if (data.debug) {
        console.log('\n🔍 Debug Information:');
        console.log('====================');
        console.log(data.debug);
      }
      
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testServerDebug();
