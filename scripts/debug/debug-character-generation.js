#!/usr/bin/env node

// Debug script for character generation
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testCharacterGeneration() {
  const sessionId = 'test_debug_' + Date.now();
  
  console.log('🔍 Testing Character Generation...');
  console.log('Session ID:', sessionId);
  
  try {
    // Step 1: Check if server is running
    console.log('\n1. Checking server health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server health:', healthData.status);
    
    // Step 2: Create a simple background
    console.log('\n2. Creating test background...');
    const backgroundResponse = await fetch(`${API_BASE}/generate_background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        concept: 'A dark gothic mansion with mysterious disappearances',
        meta: { gameType: 'SRD 2014', players: 4, level: '3-5' }
      })
    });
    
    if (!backgroundResponse.ok) {
      const errorText = await backgroundResponse.text();
      console.log('❌ Background generation failed:', errorText);
      return;
    }
    
    const backgroundData = await backgroundResponse.json();
    console.log('✅ Background generated:', backgroundData.ok);
    
    // Step 3: Lock the background
    console.log('\n3. Locking background...');
    const lockResponse = await fetch(`${API_BASE}/background/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, locked: true })
    });
    
    if (!lockResponse.ok) {
      const errorText = await lockResponse.text();
      console.log('❌ Background lock failed:', errorText);
      return;
    }
    
    const lockData = await lockResponse.json();
    console.log('✅ Background locked:', lockData.ok);
    
    // Step 4: Now generate characters
    console.log('\n4. Generating characters...');
    console.log('Making request to:', `${API_BASE}/characters/generate`);
    
    const characterResponse = await fetch(`${API_BASE}/characters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    console.log('Response status:', characterResponse.status);
    console.log('Response headers:', Object.fromEntries(characterResponse.headers.entries()));
    
    if (!characterResponse.ok) {
      const errorText = await characterResponse.text();
      console.log('❌ Character generation failed:');
      console.log('Status:', characterResponse.status);
      console.log('Error:', errorText);
      return;
    }
    
    const characterData = await characterResponse.json();
    console.log('✅ Characters generated successfully!');
    console.log('Character count:', characterData.list?.length || 0);
    
    if (characterData.list && characterData.list.length > 0) {
      console.log('First character:', characterData.list[0].name);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCharacterGeneration();