#!/usr/bin/env node

/**
 * Model test for Skill Challenges Integration
 * This script directly tests the model's ability to generate skillChallenges
 */

import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testModelSkillChallenges() {
  console.log('🧪 Testing Model Skill Challenges Generation...\n');
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a DnD GM assistant. MUTLAKA skillChallenges alanını dahil et ve en az 1 skill challenge ekle.' 
        },
        { 
          role: 'user', 
          content: `Return JSON only with the following structure. MUTLAKA skillChallenges alanını dahil et:

{
  "sceneId": "test-model-skill-001",
  "title": "Model Test Sahnesi",
  "objective": "Test için model bir sahne",
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

MUTLAKA skillChallenges alanını dahil et! Bu alan zorunludur.` 
        }
      ],
      temperature: 0.8,
    });
    
    const text = response.choices[0]?.message?.content ?? '';
    console.log('✅ Model Response received successfully\n');
    
    try {
      const parsed = JSON.parse(text);
      
      // Check if skillChallenges field exists
      const hasSkillChallenges = parsed.skillChallenges && Array.isArray(parsed.skillChallenges);
      const skillChallengesCount = hasSkillChallenges ? parsed.skillChallenges.length : 0;
      
      console.log('📊 Validation Results:');
      console.log('====================');
      
      if (hasSkillChallenges) {
        console.log(`✅ skillChallenges field exists with ${skillChallengesCount} challenges`);
        
        // Validate each skill challenge structure
        parsed.skillChallenges.forEach((challenge, index) => {
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
        console.log(`Available fields: ${Object.keys(parsed).join(', ')}`);
      }
      
      console.log('\n📋 Full Response:');
      console.log('================');
      console.log(JSON.stringify(parsed, null, 2));
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError.message);
      console.log('\n📋 Raw Response:');
      console.log('===============');
      console.log(text);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testModelSkillChallenges();
