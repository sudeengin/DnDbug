/**
 * Emergency fix script to add missing background and characters to context
 * Run this with: node fix-missing-context.js
 */

import fs from 'fs/promises';
import path from 'path';

const CONTEXT_FILE = path.join(process.cwd(), '.data', 'context.json');
const SESSION_ID = 'project_1760996751148_kx5ga30ie';

async function fixContext() {
  try {
    // Read current context
    const contextData = await fs.readFile(CONTEXT_FILE, 'utf8');
    const contexts = JSON.parse(contextData);
    
    const session = contexts[SESSION_ID];
    if (!session) {
      console.error('❌ Session not found:', SESSION_ID);
      return;
    }
    
    console.log('📋 Current session state:');
    console.log('  - Has background:', !!session.blocks?.background);
    console.log('  - Has characters:', !!session.blocks?.characters);
    console.log('  - Has macro chain:', !!session.blocks?.custom?.macroChain);
    
    // Add placeholder background if missing
    if (!session.blocks?.background) {
      console.log('\n🔧 Adding placeholder background...');
      session.blocks.background = {
        premise: "A world where silence has mysteriously engulfed the land, and heroes must uncover its source.",
        tone_rules: [
          "Use words like 'mysterious', 'silent', 'desolate', 'haunting'",
          "Create an atmosphere of eerie calm and tension",
          "Balance mystery with moments of discovery"
        ],
        stakes: [
          "The silence is spreading to more regions",
          "Communication has become nearly impossible",
          "An ancient relic may hold the key"
        ],
        mysteries: [
          "What caused the silence?",
          "Is the silence natural or magical?",
          "Who or what guards the relic?"
        ],
        factions: [
          "The Silent Watchers (guardians of ancient knowledge)",
          "The Drifter's Guild (wanderers seeking answers)",
          "Oracle Circle (seers attempting to divine the truth)"
        ],
        location_palette: [
          "Ruined fortress shrouded in unnatural quiet",
          "Desolate wilderness with cracked oracle stones",
          "Hidden sanctuary beneath ancient ruins"
        ],
        npc_roster_skeleton: [
          "The Drifter (mysterious wanderer with hidden knowledge)",
          "Oracle Keeper (elderly guardian of forgotten prophecies)",
          "Relic Guardian (protector of ancient artifact)"
        ],
        motifs: [
          "Broken communication",
          "Ancient relics and forgotten knowledge",
          "The weight of silence"
        ],
        doNots: [
          "Don't reveal the source of silence too early",
          "Don't make it purely combat-focused",
          "Don't ignore the emotional impact of silence"
        ],
        playstyle_implications: [
          "Investigation and exploration heavy",
          "Non-verbal communication challenges",
          "Mystery-driven narrative"
        ],
        numberOfPlayers: 4
      };
      
      // Update version
      session.meta.backgroundV = 1;
      session.locks.background = false; // Not locked yet
    }
    
    // Add placeholder characters if missing
    if (!session.blocks?.characters || !session.blocks.characters.list) {
      console.log('🔧 Adding placeholder characters...');
      session.blocks.characters = {
        list: [
          {
            id: `char_${Date.now()}_1`,
            name: "Kael Thornheart",
            role: "Silent Seeker",
            race: "Human",
            class: "Ranger",
            personality: "Stoic and observant, Kael communicates through gestures and keen awareness of surroundings.",
            motivation: "Find the source of the silence that claimed their homeland",
            connectionToStory: "Kael's village was the first to be consumed by the silence",
            gmSecret: "Kael unknowingly carries a shard of the artifact that created the silence, embedded in an old family heirloom. The shard resonates when near the source.",
            potentialConflict: "Trust issues due to past betrayals",
            voiceTone: "Rarely speaks, uses hand signals and facial expressions",
            inventoryHint: "An old compass that spins wildly in silent zones",
            motifAlignment: ["Broken communication", "Ancient relics"],
            backgroundHistory: "Grew up in a small village on the frontier. When the silence came, Kael watched helplessly as loved ones were swallowed by the unnatural quiet. Now dedicates their life to finding answers.",
            keyRelationships: [
              "Elder Mara (village elder, missing)",
              "The Drifter (met on the road)",
              "Oracle Keeper (seeking guidance from)"
            ],
            flawOrWeakness: "Struggles with survivor's guilt"
          },
          {
            id: `char_${Date.now()}_2`,
            name: "Lyra Whisperwind",
            role: "Oracle Apprentice",
            race: "Half-Elf",
            class: "Cleric",
            personality: "Empathetic and intuitive, seeks to understand the silence through divine connection.",
            motivation: "Restore communication and divine guidance to the world",
            connectionToStory: "Her oracle mentor was driven mad by visions of the silence's origin",
            gmSecret: "Lyra has begun hearing whispers in the silence - fragments of an ancient entity's thoughts. These whispers are drawing her toward the relic's location, but they're also slowly affecting her sanity.",
            potentialConflict: "Torn between duty to her order and the whispers' call",
            voiceTone: "Soft-spoken and contemplative",
            inventoryHint: "Cracked oracle stone that glows faintly",
            motifAlignment: ["Ancient relics and forgotten knowledge", "The weight of silence"],
            backgroundHistory: "Trained at the Oracle Circle from a young age. Her mentor's descent into madness after attempting to divine the silence's source haunts her, but also drives her to succeed where they failed.",
            keyRelationships: [
              "Oracle Keeper (current mentor)",
              "Master Darian (the mad oracle, former mentor)",
              "Silent Watchers (seeking their aid)"
            ],
            flawOrWeakness: "Becoming too trusting of the whispers she hears"
          },
          {
            id: `char_${Date.now()}_3`,
            name: "Grimm Ironbound",
            role: "Relic Hunter",
            race: "Dwarf",
            class: "Fighter",
            personality: "Pragmatic and determined, believes action speaks louder than words - perfect for a silent world.",
            motivation: "Claim the ancient relic before it falls into wrong hands",
            connectionToStory: "Part of the Drifter's Guild, following ancient maps to the relic",
            gmSecret: "Grimm's guild master is secretly working with forces that want to weaponize the silence. Grimm has been unknowingly leading the party into a trap, though they would be horrified to learn this truth.",
            potentialConflict: "Greed versus honor when finding the relic",
            voiceTone: "Gruff and direct, uses few words even when speaking is possible",
            inventoryHint: "Ancient map with cryptic symbols",
            motifAlignment: ["Ancient relics", "Broken communication"],
            backgroundHistory: "A veteran treasure hunter who has explored countless ruins. Grimm sees the silence as just another challenge - an opportunity to find something valuable before anyone else.",
            keyRelationships: [
              "Guild Master Torvin (employer, secretly corrupt)",
              "The Drifter (rival and occasional ally)",
              "Relic Guardian (will face)"
            ],
            flawOrWeakness: "Tunnel vision when pursuing treasure"
          },
          {
            id: `char_${Date.now()}_4`,
            name: "Zara Moonweaver",
            role: "Memory Keeper",
            race: "Elf",
            class: "Wizard",
            personality: "Scholarly and curious, documenting everything about the silence phenomenon.",
            motivation: "Preserve knowledge and find a way to reverse the silence",
            connectionToStory: "Researching ancient texts that predicted this event",
            gmSecret: "Zara discovered that the silence is actually a protective barrier created by an ancient civilization to contain something far worse. Breaking the silence might unleash an even greater catastrophe.",
            potentialConflict: "Pursuit of knowledge versus protecting others from dangerous truths",
            voiceTone: "Articulate and precise, frustrated by inability to discuss findings",
            inventoryHint: "Journal filled with sketches and theories",
            motifAlignment: ["Forgotten knowledge", "Ancient relics"],
            backgroundHistory: "Spent years in the great libraries studying lost civilizations. When ancient texts mentioning 'the Great Quieting' surfaced, Zara became obsessed with preventing it. Arrived too late.",
            keyRelationships: [
              "Silent Watchers (seeking their archives)",
              "Master Librarian Vex (deceased mentor)",
              "Oracle Circle (collaborating with)"
            ],
            flawOrWeakness: "Values knowledge preservation over immediate safety"
          }
        ],
        locked: false,
        version: Date.now()
      };
      
      // Update version
      session.meta.charactersV = 1;
      session.locks.characters = false; // Not locked yet
    }
    
    // Update session metadata
    session.version = (session.version || 0) + 1;
    session.updatedAt = new Date().toISOString();
    
    // Save updated context
    await fs.writeFile(CONTEXT_FILE, JSON.stringify(contexts, null, 2));
    
    console.log('\n✅ Context fixed successfully!');
    console.log('\n📌 Next steps:');
    console.log('  1. Refresh your browser');
    console.log('  2. Go to Background tab and review/edit the background');
    console.log('  3. Lock the background');
    console.log('  4. Go to Characters tab and review/edit the characters');
    console.log('  5. Lock the characters');
    console.log('  6. Your macro chain will now have proper context!');
    
  } catch (error) {
    console.error('❌ Error fixing context:', error);
  }
}

fixContext();

