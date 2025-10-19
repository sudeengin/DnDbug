#!/usr/bin/env node

/**
 * Test script for Skill Challenges Integration
 * This script tests the generate_detail endpoint to ensure skillChallenges are properly generated
 */

const testData = {
  sceneId: 'test-skill-challenge-001',
  macroScene: {
    id: 'test-skill-challenge-001',
    title: 'Gizemli Kütüphane',
    objective: 'Oyuncular kütüphanede kayıp bir büyü kitabını arıyor',
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

async function testSkillChallenges() {
  console.log('🧪 Testing Skill Challenges Integration...\n');
  
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
      
      // Check if skillChallenges field exists
      const hasSkillChallenges = sceneDetail.skillChallenges && Array.isArray(sceneDetail.skillChallenges);
      const skillChallengesCount = hasSkillChallenges ? sceneDetail.skillChallenges.length : 0;
      
      console.log('📊 Validation Results:');
      console.log('====================');
      
      if (hasSkillChallenges) {
        console.log(`✅ skillChallenges field exists with ${skillChallengesCount} challenges`);
        
        // Validate each skill challenge structure
        sceneDetail.skillChallenges.forEach((challenge, index) => {
          console.log(`\n🔍 Validating Challenge ${index + 1}:`);
          
          const hasRequiredFields = challenge.skill && 
                                 typeof challenge.dc === 'number' && 
                                 challenge.trigger && 
                                 challenge.success && 
                                 challenge.failure && 
                                 challenge.consequence;
          
          if (hasRequiredFields) {
            console.log(`✅ All required fields present`);
            console.log(`   - Skill: ${challenge.skill}`);
            console.log(`   - DC: ${challenge.dc}`);
            console.log(`   - Trigger: ${challenge.trigger}`);
            console.log(`   - Success: ${challenge.success}`);
            console.log(`   - Failure: ${challenge.failure}`);
            console.log(`   - Consequence: ${challenge.consequence}`);
          } else {
            console.log(`❌ Missing required fields`);
            console.log(`   - skill: ${!!challenge.skill}`);
            console.log(`   - dc (number): ${typeof challenge.dc === 'number'}`);
            console.log(`   - trigger: ${!!challenge.trigger}`);
            console.log(`   - success: ${!!challenge.success}`);
            console.log(`   - failure: ${!!challenge.failure}`);
            console.log(`   - consequence: ${!!challenge.consequence}`);
          }
        });
        
        // Check if we have at least 1 skill challenge (as per requirements)
        if (skillChallengesCount >= 1) {
          console.log(`\n✅ Requirement met: At least 1 skill challenge present (${skillChallengesCount} total)`);
        } else {
          console.log(`\n❌ Requirement not met: Need at least 1 skill challenge, got ${skillChallengesCount}`);
        }
        
        // Check if we have maximum 3 skill challenges (as per requirements)
        if (skillChallengesCount <= 3) {
          console.log(`✅ Requirement met: Maximum 3 skill challenges respected (${skillChallengesCount} total)`);
        } else {
          console.log(`\n❌ Requirement not met: Maximum 3 skill challenges exceeded (${skillChallengesCount} total)`);
        }
        
      } else {
        console.log(`❌ skillChallenges field missing or not an array`);
      }
      
      console.log('\n📋 Full Scene Detail:');
      console.log('====================');
      console.log(JSON.stringify(sceneDetail, null, 2));
      
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running on localhost:3000');
    console.log('   Run: npm run dev');
  }
}

// Run the test
testSkillChallenges();
