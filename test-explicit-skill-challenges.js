#!/usr/bin/env node

/**
 * Explicit test for Skill Challenges Integration
 * This script tests with a very explicit and simple instruction
 */

const testData = {
  sceneId: 'test-explicit-skill-001',
  macroScene: {
    id: 'test-explicit-skill-001',
    title: 'Explicit Test Sahnesi',
    objective: 'Test için explicit bir sahne',
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

async function testExplicitSkillChallenges() {
  console.log('🧪 Testing Explicit Skill Challenges...\n');
  
  try {
    // First, let's test with a direct API call to see the raw response
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
      
      // Check if skillChallenges field exists
      const hasSkillChallenges = sceneDetail.skillChallenges && Array.isArray(sceneDetail.skillChallenges);
      const skillChallengesCount = hasSkillChallenges ? sceneDetail.skillChallenges.length : 0;
      
      console.log('📊 Validation Results:');
      console.log('====================');
      
      if (hasSkillChallenges) {
        console.log(`✅ skillChallenges field exists with ${skillChallengesCount} challenges`);
        
        // Validate each skill challenge structure
        sceneDetail.skillChallenges.forEach((challenge, index) => {
          console.log(`\n🔍 Challenge ${index + 1}:`);
          console.log(`   - Skill: ${challenge.skill}`);
          console.log(`   - DC: ${challenge.dc}`);
          console.log(`   - Trigger: ${challenge.trigger}`);
          console.log(`   - Success: ${challenge.success}`);
          console.log(`   - Failure: ${challenge.failure}`);
          console.log(`   - Consequence: ${challenge.consequence}`);
        });
        
      } else {
        console.log(`❌ skillChallenges field missing or not an array`);
        console.log(`Available fields: ${Object.keys(sceneDetail).join(', ')}`);
        
        // Let's check if there are any fields that might be similar
        const similarFields = Object.keys(sceneDetail).filter(key => 
          key.toLowerCase().includes('skill') || 
          key.toLowerCase().includes('challenge') ||
          key.toLowerCase().includes('check')
        );
        
        if (similarFields.length > 0) {
          console.log(`Similar fields found: ${similarFields.join(', ')}`);
        }
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
testExplicitSkillChallenges();
