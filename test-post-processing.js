#!/usr/bin/env node

/**
 * Test post-processing functionality
 */

// Simulate the post-processing logic
function testPostProcessing() {
  console.log('🧪 Testing Post-Processing Logic...\n');
  
  // Simulate a check object
  const check = {
    type: 'skill',
    ability: 'Intelligence',
    skill: 'Arcana',
    dc: 15,
    when: 'Test',
    on_success: 'Success',
    on_fail: 'Fail'
  };
  
  console.log('Original check:', check);
  
  // Apply the same logic as in the API
  if (!check.dnd_skill && check.skill) {
    console.log('Processing skill:', check.skill);
    
    const skillMapping = {
      'Araştırma': 'Investigation',
      'Algılama': 'Perception',
      'Fısıltıları Anlama': 'Insight',
      'Arcana': 'Arcana',
      'Athletics': 'Athletics',
      'Stealth': 'Stealth',
      'Deception': 'Deception',
      'Intimidation': 'Intimidation',
      'Persuasion': 'Persuasion',
      'Animal Handling': 'Animal Handling',
      'History': 'History',
      'Medicine': 'Medicine',
      'Nature': 'Nature',
      'Religion': 'Religion',
      'Survival': 'Survival',
      'Acrobatics': 'Acrobatics',
      'Sleight of Hand': 'Sleight of Hand'
    };
    
    const skillName = check.skill.toLowerCase();
    let dndSkill = 'Investigation'; // default
    
    // First check for exact matches
    for (const [turkish, english] of Object.entries(skillMapping)) {
      if (skillName === turkish.toLowerCase() || skillName === english.toLowerCase()) {
        dndSkill = english;
        console.log('Found exact match:', turkish, '->', english);
        break;
      }
    }
    
    // If no exact match, check for partial matches
    if (dndSkill === 'Investigation') {
      for (const [turkish, english] of Object.entries(skillMapping)) {
        if (skillName.includes(turkish.toLowerCase()) || skillName.includes(english.toLowerCase())) {
          dndSkill = english;
          console.log('Found partial match:', turkish, '->', english);
          break;
        }
      }
    }
    
    console.log('Setting dnd_skill to:', dndSkill);
    check.dnd_skill = dndSkill;
  }
  
  console.log('Processed check:', check);
  console.log('dnd_skill field:', check.dnd_skill);
}

testPostProcessing();
