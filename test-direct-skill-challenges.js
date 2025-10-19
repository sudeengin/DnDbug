#!/usr/bin/env node

/**
 * Direct test for Skill Challenges Integration
 * This script tests with a very direct and explicit instruction
 */

const testData = {
  sceneId: 'test-direct-skill-001',
  macroScene: {
    id: 'test-direct-skill-001',
    title: 'Direct Test Sahnesi',
    objective: 'Test için direct bir sahne',
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

async function testDirectSkillChallenges() {
  console.log('🧪 Testing Direct Skill Challenges...\n');
  
  try {
    // Let's try a direct API call with a custom prompt
    const customPrompt = `Return JSON only with the following structure. MUTLAKA skillChallenges alanını dahil et:

{
  "sceneId": "test-direct-skill-001",
  "title": "Direct Test Sahnesi",
  "objective": "Test için direct bir sahne",
  "keyEvents": ["string"],
  "revealedInfo": ["string"],
  "stateChanges": {},
  "contextOut": {
    "keyEvents": ["string"],
    "revealedInfo": ["string"],
    "stateChanges": {},
    "npcRelationships": {},
    "environmentalState": {},
    "plotThreads": [],
    "playerDecisions": []
  },
  "openingStateAndTrigger": {
    "state": "string",
    "trigger": "string"
  },
  "environmentAndSensory": {
    "visual": ["string"],
    "auditory": ["string"],
    "olfactory": ["string"],
    "tactile_or_thermal": ["string"],
    "other": ["string"]
  },
  "epicIntro": "string",
  "setting": "string",
  "atmosphere": "string",
  "gmNarrative": "string",
  "beats": ["string"],
  "checks": [
    {
      "type": "skill",
      "ability": "string",
      "skill": "string",
      "dc_suggested_range": [10, 15],
      "dc": 12,
      "check_label": "string",
      "when": "string",
      "on_success": "string",
      "on_fail": "string",
      "advantage_hints": ["string"]
    }
  ],
  "cluesAndForeshadowing": {
    "clues": ["string"],
    "foreshadowing": ["string"]
  },
  "npcMiniCards": [],
  "combatProbabilityAndBalance": {
    "likelihood": "low",
    "enemies": [],
    "balance_notes": "string",
    "escape_or_alt_paths": ["string"]
  },
  "exitConditionsAndTransition": {
    "exit_conditions": ["string"],
    "transition_to_next": "string"
  },
  "rewards": ["string"],
  "skillChallenges": [
    {
      "skill": "Insight",
      "dc": 14,
      "trigger": "Oyuncular bir şeyi fark etmeye çalıştığında",
      "success": "Önemli bir ipucu bulurlar",
      "failure": "Yanlış bir sonuca varırlar",
      "consequence": "Zaman kaybederler"
    }
  ]
}

MUTLAKA skillChallenges alanını dahil et! Bu alan zorunludur.`;

    const response = await fetch('http://localhost:3000/api/generate_detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testData,
        customPrompt: customPrompt
      })
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
testDirectSkillChallenges();
