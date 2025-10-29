#!/usr/bin/env node

// Debug script to check the exact response from characters/generate
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function debugCharacterResponse() {
  const sessionId = 'debug_response_' + Date.now();
  
  console.log('🔍 Debugging Character Generation Response...');
  console.log('Session ID:', sessionId);
  
  try {
    // Step 1: Create and lock background
    console.log('\n1. Creating background...');
    const backgroundResponse = await fetch(`${API_BASE}/generate_background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        concept: 'A dark gothic mansion with mysterious disappearances',
        meta: { gameType: 'D&D 5e', players: 4, level: '3-5' }
      })
    });
    
    if (!backgroundResponse.ok) {
      const errorText = await backgroundResponse.text();
      console.log('❌ Background generation failed:', errorText);
      return;
    }
    
    const backgroundData = await backgroundResponse.json();
    console.log('✅ Background generated');
    
    // Step 2: Lock background
    console.log('\n2. Locking background...');
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
    console.log('✅ Background locked');
    
    // Step 3: Check context before character generation
    console.log('\n3. Checking context before character generation...');
    const contextResponse = await fetch(`${API_BASE}/context/get?sessionId=${sessionId}`);
    const contextData = await contextResponse.json();
    console.log('Context data:', JSON.stringify(contextData, null, 2));
    
    // Step 4: Generate characters and examine response in detail
    console.log('\n4. Generating characters...');
    const characterResponse = await fetch(`${API_BASE}/characters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    console.log('Response status:', characterResponse.status);
    console.log('Response headers:', Object.fromEntries(characterResponse.headers.entries()));
    
    const responseText = await characterResponse.text();
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response text (first 500 chars):', responseText.substring(0, 500));
    
    if (characterResponse.ok) {
      const characterData = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(characterData, null, 2));
      
      if (characterData.ok) {
        console.log('✅ Characters generated successfully!');
        console.log('Character count:', characterData.list?.length || 0);
        if (characterData.list && characterData.list.length > 0) {
          console.log('First character name:', characterData.list[0].name);
          console.log('First character keys:', Object.keys(characterData.list[0]));
        }
      } else {
        console.log('❌ Character generation failed in response:', characterData.error);
      }
    } else {
      console.log('❌ Character generation failed with status:', characterResponse.status);
    }
    
    // Step 5: Check context after character generation
    console.log('\n5. Checking context after character generation...');
    const contextResponse2 = await fetch(`${API_BASE}/context/get?sessionId=${sessionId}`);
    const contextData2 = await contextResponse2.json();
    console.log('Context after generation:', JSON.stringify(contextData2, null, 2));
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug
debugCharacterResponse();
