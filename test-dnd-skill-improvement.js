#!/usr/bin/env node

/**
 * Test for D&D Skill Improvement
 * This script tests that the dnd_skill field is properly generated
 */

const testData = {
  sceneId: 'test-dnd-skill-001',
  macroScene: {
    id: 'test-dnd-skill-001',
    title: 'D&D Skill Test Sahnesi',
    objective: 'Test için D&D skill iyileştirmesi',
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

async function testDndSkillImprovement() {
  console.log('🧪 Testing D&D Skill Improvement...\n');
  
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
      
      // Also check skillChallenges if it exists
      const hasSkillChallenges = sceneDetail.skillChallenges && Array.isArray(sceneDetail.skillChallenges);
      if (hasSkillChallenges) {
        console.log(`\n✅ skillChallenges field exists with ${sceneDetail.skillChallenges.length} challenges`);
      } else {
        console.log(`\n❌ skillChallenges field still missing`);
      }
      
      console.log('\n📋 Full Response:');
      console.log('================');
      console.log(JSON.stringify(sceneDetail, null, 2));
      
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDndSkillImprovement();
