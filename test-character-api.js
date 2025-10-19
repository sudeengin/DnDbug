#!/usr/bin/env node

/**
 * Test script for the Character Generation API
 * Tests the new D&D-style character generation with detailed backgrounds
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

// Mock background context data that matches the expected input structure
const mockBackgroundContext = {
  fiveWoneH: {
    who: {
      value: "The mysterious owner of Esmond Manor",
      status: "known",
      revealPlan: "early",
      confidence: 0.9
    },
    what: {
      value: "A group of strangers receiving mysterious invitations",
      status: "known", 
      revealPlan: "early",
      confidence: 1.0
    },
    where: {
      value: "Esmond Manor in the Northern Woods",
      status: "known",
      revealPlan: "early", 
      confidence: 0.95
    },
    when: {
      value: "Mid-winter, on the anniversary of death",
      status: "known",
      revealPlan: "mid",
      confidence: 0.85
    },
    why: {
      value: "The true purpose of the invitation is unknown",
      status: "unknown",
      revealPlan: "late",
      confidence: 0.3
    },
    how: {
      value: "Invitations delivered secretly in unsealed envelopes",
      status: "known",
      revealPlan: "early",
      confidence: 0.9
    }
  },
  backgroundSummary: "In the depths of the Northern Woods stands Esmond Manor, a gothic estate shrouded in mystery and whispered legends. The manor's owner vanished years ago under mysterious circumstances, yet invitations bearing his personal seal continue to arrive at the doors of strangers. Those who accept find themselves drawn into a web of secrets where nothing is as it seems, and every reflection holds a hidden truth.",
  anchors: [
    "The manor remains a fixed location throughout the story",
    "All invitations arrive on the same day",
    "The owner's seal is authentic but his fate is unknown"
  ],
  gmSecrets: [
    "The real invitation sender is still alive",
    "The manor contains a hidden chamber with ancient artifacts",
    "One of the invited guests has a secret connection to the original owner"
  ],
  motifs: ["unsealed envelopes", "mirrors", "dark woods", "sealed letters", "stormlight"],
  tone: "mysterious",
  pacing: "balanced"
};

async function testCharacterGeneration() {
  console.log('🧙‍♂️ Testing D&D Character Generation API...\n');
  
  try {
    // Test the character generation endpoint
    console.log('📝 Generating characters with background context...');
    
    const response = await fetch(`${API_BASE}/api/characters/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-session-' + Date.now(),
        backgroundContext: mockBackgroundContext
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Generation failed: ${data.error}`);
    }

    console.log('✅ Characters generated successfully!\n');
    
    // Validate response structure
    if (!data.characters || !Array.isArray(data.characters)) {
      throw new Error('Invalid response: missing characters array');
    }

    if (data.characters.length < 3 || data.characters.length > 5) {
      throw new Error(`Invalid character count: ${data.characters.length} (expected 3-5)`);
    }

    console.log(`📊 Generated ${data.characters.length} characters:\n`);

    // Display each character
    data.characters.forEach((char, index) => {
      console.log(`🎭 Character ${index + 1}: ${char.name}`);
      console.log(`   Role: ${char.role}`);
      console.log(`   Race & Class: ${char.race} ${char.class}`);
      console.log(`   Personality: ${char.personality}`);
      console.log(`   Motivation: ${char.motivation}`);
      console.log(`   Connection to Story: ${char.connectionToStory}`);
      console.log(`   GM Secret: ${char.gmSecret}`);
      console.log(`   Potential Conflict: ${char.potentialConflict}`);
      console.log(`   Voice Tone: ${char.voiceTone}`);
      console.log(`   Inventory Hint: ${char.inventoryHint}`);
      console.log(`   Motif Alignment: ${char.motifAlignment.join(', ')}`);
      console.log(`   Background History: ${char.backgroundHistory}`);
      console.log(`   Key Relationships: ${char.keyRelationships.join(', ')}`);
      console.log(`   Flaw or Weakness: ${char.flawOrWeakness}`);
      console.log('');
    });

    // Validate required fields
    const requiredFields = [
      'name', 'role', 'race', 'class', 'personality', 'motivation',
      'connectionToStory', 'gmSecret', 'potentialConflict', 'voiceTone',
      'inventoryHint', 'motifAlignment', 'backgroundHistory', 'keyRelationships', 'flawOrWeakness'
    ];

    let validationErrors = [];
    
    data.characters.forEach((char, charIndex) => {
      requiredFields.forEach(field => {
        if (!char[field]) {
          validationErrors.push(`Character ${charIndex + 1} missing field: ${field}`);
        }
      });
      
      if (!Array.isArray(char.motifAlignment)) {
        validationErrors.push(`Character ${charIndex + 1} motifAlignment must be an array`);
      }
      
      if (!Array.isArray(char.keyRelationships)) {
        validationErrors.push(`Character ${charIndex + 1} keyRelationships must be an array`);
      }
    });

    if (validationErrors.length > 0) {
      console.log('❌ Validation errors found:');
      validationErrors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ All characters have valid structure and required fields');
    }

    // Check motif alignment
    const allMotifs = data.characters.flatMap(char => char.motifAlignment);
    const uniqueMotifs = [...new Set(allMotifs)];
    console.log(`\n🎨 Motif usage: ${uniqueMotifs.length} unique motifs used`);
    console.log(`   Motifs: ${uniqueMotifs.join(', ')}`);

    // Check relationship diversity
    const allRelationships = data.characters.flatMap(char => char.keyRelationships);
    console.log(`\n👥 Relationship diversity: ${allRelationships.length} total relationships`);

    console.log('\n🎉 Character generation test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCharacterGeneration();
}

module.exports = { testCharacterGeneration, mockBackgroundContext };
