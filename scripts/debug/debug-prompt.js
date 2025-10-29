import { processContextForPrompt, getOrCreateSessionContext } from './api/context.js';

async function debugPrompt() {
  console.log('🔍 Debugging Prompt Generation');
  console.log('==============================');
  
  // Create a test session context
  const sessionId = 'debug-session';
  const sessionContext = getOrCreateSessionContext(sessionId);
  
  // Add background data
  sessionContext.blocks.background = {
    premise: "A mysterious fog has enveloped the town of Millbrook, and strange creatures have been sighted in the mist.",
    tone_rules: [
      "Use words like 'mysterious', 'creeping', 'whispered', 'haunting'",
      "Create an atmosphere of unease and dread"
    ],
    stakes: [
      "The fog is spreading to neighboring towns",
      "People are disappearing in the mist"
    ],
    mysteries: [
      "What is the source of the fog?",
      "Why are the children behaving oddly?"
    ],
    location_palette: [
      "The fog-covered town square of Millbrook",
      "The abandoned mill on the outskirts"
    ],
    npc_roster_skeleton: [
      "Mayor Thompson (worried leader of Millbrook)",
      "Dr. Sarah Chen (town physician)"
    ],
    motifs: [
      "Thick, impenetrable fog",
      "Children's laughter in the distance"
    ],
    doNots: [
      "Don't reveal the source of the fog too early",
      "Don't make it too gory"
    ],
    playstyle_implications: [
      "Investigation-heavy gameplay",
      "Atmospheric descriptions are crucial"
    ]
  };
  
  // Process the context
  const contextMemory = processContextForPrompt(sessionContext);
  
  console.log('\n1. Raw Session Context:');
  console.log(JSON.stringify(sessionContext, null, 2));
  
  console.log('\n2. Processed Context Memory:');
  console.log(JSON.stringify(contextMemory, null, 2));
  
  console.log('\n3. Background Present:', !!contextMemory.background);
  
  if (contextMemory.background) {
    console.log('\n4. Background Details:');
    console.log('Premise:', contextMemory.background.premise);
    console.log('Tone Rules:', contextMemory.background.tone_rules);
    console.log('Stakes:', contextMemory.background.stakes);
    console.log('Mysteries:', contextMemory.background.mysteries);
    console.log('Locations:', contextMemory.background.location_palette);
    console.log('NPCs:', contextMemory.background.npc_roster_skeleton);
    console.log('Motifs:', contextMemory.background.motifs);
    console.log('Do Nots:', contextMemory.background.doNots);
    console.log('Playstyle:', contextMemory.background.playstyle_implications);
  }
  
  // Generate the context block as it would be sent to AI
  let contextMemoryBlock = '';
  if (Object.keys(contextMemory).length > 0) {
    if (contextMemory.background) {
      const bg = contextMemory.background;
      contextMemoryBlock = `BACKGROUND_CONTEXT:
PREMISE: ${bg.premise || 'No premise provided'}

TONE_RULES (use these to set the emotional tone of scene titles):
${(bg.tone_rules || []).map(rule => `- ${rule}`).join('\n')}

STAKES (connect each scene to these conflicts):
${(bg.stakes || []).map(stake => `- ${stake}`).join('\n')}

MYSTERIES (reveal these gradually through the scenes):
${(bg.mysteries || []).map(mystery => `- ${mystery}`).join('\n')}

LOCATIONS (choose from these places):
${(bg.location_palette || []).map(location => `- ${location}`).join('\n')}

NPCs (these characters should appear):
${(bg.npc_roster_skeleton || []).map(npc => `- ${npc}`).join('\n')}

MOTIFS (weave these themes throughout):
${(bg.motifs || []).map(motif => `- ${motif}`).join('\n')}

CONSTRAINTS (follow these rules):
${(bg.doNots || []).map(constraint => `- ${constraint}`).join('\n')}

PLAYSTYLE (consider these implications):
${(bg.playstyle_implications || []).map(implication => `- ${implication}`).join('\n')}`;
    } else {
      contextMemoryBlock = `BACKGROUND_CONTEXT: ${JSON.stringify(contextMemory, null, 2)}`;
    }
  } else {
    contextMemoryBlock = 'BACKGROUND_CONTEXT: No background context provided';
  }
  
  console.log('\n5. Generated Context Block for AI:');
  console.log('=====================================');
  console.log(contextMemoryBlock);
  console.log('=====================================');
  
  console.log('\n6. Full Prompt that would be sent to AI:');
  console.log('==========================================');
  const fullPrompt = `${contextMemoryBlock}

STORY_CONCEPT:
"""
The party investigates the mysterious fog in Millbrook and the strange behavior of the children
"""

STRUCTURAL_PREFERENCES:
{"gameType":"D&D","players":"4","level":"5"}

CRITICAL INSTRUCTIONS:
1. The BACKGROUND_CONTEXT above is your PRIMARY SOURCE for creating scenes. Use it extensively.
2. Each scene title should reflect the tone_rules from the background.
3. Each scene objective should connect to the stakes and mysteries from the background.
4. Use locations from the location_palette in your scene descriptions.
5. Reference NPCs from the npc_roster_skeleton when appropriate.
6. Weave the motifs throughout the scene flow.
7. Follow all constraints from the doNots list.

SCENE STRUCTURE (5-6 scenes):
- Scenes 1-2: Early exploration, introduce basic mysteries from background
- Scenes 3-4: Mid development, deepen investigation of background mysteries
- Scenes 5-6: Late resolution, address background stakes and mysteries

OUTPUT FORMAT:
For each scene, provide:
- title: Scene title that matches the tone_rules and uses background elements
- objective: One-sentence purpose that connects to background stakes/mysteries

OUTPUT
Valid MacroChain JSON with scenes that clearly use the background context.`;
  
  console.log(fullPrompt);
  console.log('==========================================');
}

// Run the debug
debugPrompt();
