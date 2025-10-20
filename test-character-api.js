#!/usr/bin/env node

/**
 * Test script for the Character Generation API
 * Tests the new D&D-style character generation with detailed backgrounds
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

// Test requires a real background context to be generated first
// This test should be run after generating a background using the /api/generate_background endpoint

async function testCharacterGeneration(backgroundContext) {
  console.log('🧙‍♂️ Testing D&D Character Generation API...\n');
  
  if (!backgroundContext) {
    throw new Error('Background context is required. Please generate a background first using /api/generate_background endpoint.');
  }
  
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
        backgroundContext: backgroundContext
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
  console.log('❌ This test requires a background context to be provided.');
  console.log('Please generate a background first using the /api/generate_background endpoint,');
  console.log('then pass the background context to this test function.');
  process.exit(1);
}

module.exports = { testCharacterGeneration };
