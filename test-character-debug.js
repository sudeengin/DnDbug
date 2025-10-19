#!/usr/bin/env node

/**
 * Debug script for Character Generation API
 * Tests the character generation and shows detailed output
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testCharacterGenerationDebug() {
  console.log('🔍 Testing Character Generation with Debug Info...\n');
  
  try {
    const sessionId = 'debug-session-' + Date.now();
    
    // First, let's create a background context
    console.log('📝 Step 1: Creating background context...');
    const backgroundResponse = await fetch(`${API_BASE}/api/generate_background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        concept: "In a gothic manor hidden in the northern woods, mysterious invitations arrive to strangers who have never met. The manor's owner vanished years ago, but the letters bear his seal. Those who accept find themselves trapped in a web of secrets, where mirrors show more than reflections and every locked door leads to another mystery."
      })
    });
    
    if (!backgroundResponse.ok) {
      const errorData = await backgroundResponse.json();
      throw new Error(`Background generation failed: ${errorData.error || backgroundResponse.statusText}`);
    }
    
    const backgroundData = await backgroundResponse.json();
    console.log('✅ Background created successfully');
    console.log('Background structure:', {
      hasData: !!backgroundData.data,
      hasBackground: !!backgroundData.data?.background,
      backgroundKeys: backgroundData.data?.background ? Object.keys(backgroundData.data.background) : 'no background'
    });
    
    // Lock the background
    console.log('\n🔒 Step 2: Locking background...');
    const lockResponse = await fetch(`${API_BASE}/api/background/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        locked: true
      })
    });
    
    if (!lockResponse.ok) {
      const errorData = await lockResponse.json();
      throw new Error(`Background lock failed: ${errorData.error || lockResponse.statusText}`);
    }
    
    console.log('✅ Background locked successfully');
    
    // Now generate characters
    console.log('\n🎭 Step 3: Generating characters...');
    const characterResponse = await fetch(`${API_BASE}/api/characters/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId
      })
    });
    
    if (!characterResponse.ok) {
      const errorData = await characterResponse.json();
      throw new Error(`Character generation failed: ${errorData.error || characterResponse.statusText}`);
    }
    
    const characterData = await characterResponse.json();
    console.log('✅ Characters generated successfully!');
    
    // Analyze the response
    console.log('\n📊 Response Analysis:');
    console.log('Response structure:', {
      ok: characterData.ok,
      hasCharacters: !!characterData.characters,
      characterCount: characterData.characters?.length || 0
    });
    
    if (characterData.characters && characterData.characters.length > 0) {
      const firstChar = characterData.characters[0];
      console.log('\n🎭 First Character Analysis:');
      console.log('Character keys:', Object.keys(firstChar));
      console.log('Required fields check:');
      
      const requiredFields = [
        'name', 'role', 'race', 'class', 'personality', 'motivation',
        'connectionToStory', 'gmSecret', 'potentialConflict', 'voiceTone',
        'inventoryHint', 'motifAlignment', 'backgroundHistory', 'keyRelationships', 'flawOrWeakness'
      ];
      
      requiredFields.forEach(field => {
        const hasField = firstChar.hasOwnProperty(field);
        const fieldValue = firstChar[field];
        const isEmpty = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
        console.log(`  ${hasField ? '✅' : '❌'} ${field}: ${hasField ? (isEmpty ? 'EMPTY' : 'HAS_VALUE') : 'MISSING'}`);
        if (hasField && !isEmpty) {
          console.log(`    Value: ${Array.isArray(fieldValue) ? `[${fieldValue.join(', ')}]` : fieldValue.substring(0, 100) + (fieldValue.length > 100 ? '...' : '')}`);
        }
      });
      
      // Show full first character
      console.log('\n📋 Full First Character:');
      console.log(JSON.stringify(firstChar, null, 2));
    } else {
      console.log('❌ No characters in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testCharacterGenerationDebug();
