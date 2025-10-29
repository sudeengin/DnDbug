/**
 * Prompt templates for Scene Detail composition
 * Implements the new manual-grade one-shot blueprint with Goal→Conflict→Revelation→Transition
 */

/**
 * Renders the Scene Detail template with the new composition structure
 * @param {Object} params - Template parameters
 * @param {Object} params.background - Background context
 * @param {Object} params.characters - Characters context
 * @param {number} params.numberOfPlayers - Number of players
 * @param {Object} params.effectiveContext - Context from previous scenes
 * @param {Object} params.macroScene - The macro scene to detail
 * @returns {string} The rendered prompt
 */
export function renderDetailTemplate({ background, characters, numberOfPlayers, effectiveContext, macroScene }) {
  const backgroundBlock = background ? `
BACKGROUND_CONTEXT:
PREMISE: ${background.premise || 'No premise provided'}

TONE_RULES (use these to set the emotional tone):
${(background.tone_rules || []).map(rule => `- ${rule}`).join('\n')}

STAKES (connect scene to these conflicts):
${(background.stakes || []).map(stake => `- ${stake}`).join('\n')}

MYSTERIES (reveal these gradually):
${(background.mysteries || []).map(mystery => `- ${mystery}`).join('\n')}

LOCATIONS (choose from these places):
${(background.location_palette || []).map(location => `- ${location}`).join('\n')}

NPCs (these characters should appear):
${(background.npc_roster_skeleton || []).map(npc => `- ${npc}`).join('\n')}

MOTIFS (weave these themes throughout):
${(background.motifs || []).map(motif => `- ${motif}`).join('\n')}

CONSTRAINTS (follow these rules):
${(background.doNots || []).map(constraint => `- ${constraint}`).join('\n')}

PLAYSTYLE (consider these implications):
${(background.playstyle_implications || []).map(implication => `- ${implication}`).join('\n')}` : '';

  const charactersBlock = characters && characters.list ? `
CHARACTERS (these PCs will be in the scene):
${characters.list.map(char => `- ${char.name} (${char.class || 'Unknown class'}): ${char.motivation || 'No motivation provided'}
  Connection: ${char.connectionToStory || 'No connection provided'}`).join('\n')}

CHARACTER MOTIVATIONS (use these to shape scene beats):
${characters.list.map(char => `- ${char.name}: ${char.motivation || 'No motivation provided'}`).join('\n')}` : '';

  const playerCountBlock = `
PLAYER COUNT: ${numberOfPlayers}
- Generate scene details that work well for a group of ${numberOfPlayers} players
- Consider encounter complexity and dialogue spread appropriate for this party size
- Balance scene beats to engage all ${numberOfPlayers} characters
- Reference ≥1 PC per scene where natural`;

  const effectiveContextBlock = effectiveContext && Object.keys(effectiveContext).length > 0 ? `
EFFECTIVE_CONTEXT (from previous scenes):
${JSON.stringify(effectiveContext, null, 2)}

CONTEXT_INTEGRATION:
- Build upon the context from previous scenes
- Do not contradict established facts
- Reference key events, revealed info, state changes, NPC relationships, environmental changes, plot threads, and player decisions from previous scenes
- The scene should feel like a natural continuation of the story` : `
EFFECTIVE_CONTEXT:
No previous scenes - this is the first scene.`;

  return `You are a D&D GM assistant creating detailed scene content. Follow the rules strictly and return valid JSON only.

${backgroundBlock}${charactersBlock}${playerCountBlock}

MACRO_SCENE:
- title: "${macroScene.title}"
- objective: "${macroScene.objective}"
- sequence: ${macroScene.order || 1}

${effectiveContextBlock}

CRITICAL INSTRUCTIONS - NEW SCENE DETAIL SCHEMA:

1. NARRATIVE CORE (Goal→Conflict→Revelation→Transition):
   - goal: What the scene is trying to achieve
   - conflict: The central tension or obstacle
   - revelation: What new information is discovered
   - transition: How the scene leads to the next

2. DYNAMIC ELEMENTS:
   - npcProfiles: NPCs with motivations and personalities
   - environment: Setting details and atmosphere
   - challenge: Optional skill challenge with DC and consequences
   - revealedInfo: Information revealed in this scene
   - contextOut: Changes to world state, story facts, world seeds, and character moments

3. CONSTRAINTS:
   - Follow BACKGROUND tone/motifs and CHARACTERS motivations
   - Reference ≥1 PC per scene where natural
   - No contradictions with effectiveContext
   - Output valid JSON for the schema

4. CREATIVITY REQUIREMENTS:
   - Avoid repetitive patterns from previous generations
   - Use unexpected combinations of elements
   - Create unique NPC personalities and motivations
   - Develop distinctive environmental details
   - Include surprising revelations or plot twists
   - Vary the pacing and structure from typical scenes

REQUIRED OUTPUT FORMAT - Generate ALL fields:
{
  "sceneDetail": {
    "sceneId": "${macroScene.id}",
    "title": "${macroScene.title}",
    "objective": "${macroScene.objective}",
    "sequence": ${macroScene.order || 1},
    "sceneType": "exploration|combat|social|investigation|puzzle|transition",
    "narrativeCore": {
      "goal": "What this scene aims to achieve",
      "conflict": "The central tension or obstacle",
      "revelation": "What new information is discovered",
      "transition": "How this scene leads to the next"
    },
    "dynamicElements": {
      "npcProfiles": [
        {
          "name": "NPC Name",
          "motivation": "What drives this NPC",
          "personality": "How they behave and speak"
        }
      ],
      "environment": "Detailed setting description",
      "challenge": {
        "type": "skill|save|ability",
        "dc": 15,
        "failureConsequence": "What happens on failure"
      },
      "revealedInfo": [
        "Information revealed in this scene"
      ],
      "contextOut": {
        "world_state": {},
        "story_facts": [
          "New story facts established"
        ],
        "world_seeds": {
          "locations": ["New locations discovered"],
          "factions": ["New factions encountered"],
          "constraints": ["New constraints established"]
        },
        "characterMoments": [
          "Character development moments"
        ]
      }
    },
    "status": "Generated",
    "version": 1,
    "lastUpdatedAt": "${new Date().toISOString()}"
  }
}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting. The response must be valid JSON that can be parsed directly.`;
}

/**
 * Renders the Macro Chain template
 * @param {Object} params - Template parameters
 * @param {Object} params.background - Background context
 * @param {Object} params.characters - Characters context
 * @param {number} params.numberOfPlayers - Number of players
 * @param {Object} params.style_prefs - Style preferences
 * @returns {string} The rendered prompt
 */
export function renderChainTemplate({ background, characters, numberOfPlayers, style_prefs }) {
  const backgroundBlock = background ? `
BACKGROUND_CONTEXT:
PREMISE: ${background.premise || 'No premise provided'}

TONE_RULES (use these to set the emotional tone of scene titles):
${(background.tone_rules || []).map(rule => `- ${rule}`).join('\n')}

STAKES (connect each scene to these conflicts):
${(background.stakes || []).map(stake => `- ${stake}`).join('\n')}

MYSTERIES (reveal these gradually through the scenes):
${(background.mysteries || []).map(mystery => `- ${mystery}`).join('\n')}

LOCATIONS (choose from these places):
${(background.location_palette || []).map(location => `- ${location}`).join('\n')}

NPCs (these characters should appear):
${(background.npc_roster_skeleton || []).map(npc => `- ${npc}`).join('\n')}

MOTIFS (weave these themes throughout):
${(background.motifs || []).map(motif => `- ${motif}`).join('\n')}

CONSTRAINTS (follow these rules):
${(background.doNots || []).map(constraint => `- ${constraint}`).join('\n')}

PLAYSTYLE (consider these implications):
${(background.playstyle_implications || []).map(implication => `- ${implication}`).join('\n')}` : '';

  const charactersBlock = characters && characters.list ? `
CHARACTERS (these PCs will be in the scenes):
${characters.list.map(char => `- ${char.name} (${char.class || 'Unknown class'}): ${char.motivation || 'No motivation provided'}`).join('\n')}

CHARACTER MOTIVATIONS (use these to shape scene objectives):
${characters.list.map(char => `- ${char.name}: ${char.motivation || 'No motivation provided'}`).join('\n')}` : '';

  const playerCountBlock = `
PLAYER COUNT: ${numberOfPlayers}
- Generate scenes that work well for a group of ${numberOfPlayers} players
- Consider encounter complexity and dialogue spread appropriate for this party size
- Balance scene beats to engage all ${numberOfPlayers} characters`;

  return `You are a D&D GM assistant creating a macro chain of 5-6 scenes. Follow the rules strictly and return valid JSON only.

${backgroundBlock}${charactersBlock}${playerCountBlock}

CRITICAL INSTRUCTIONS:
1. Use the BACKGROUND_CONTEXT as the primary foundation for creating scene chains
2. Each scene title MUST use words from the tone_rules and reference specific locations/NPCs from the background
3. Each scene objective MUST connect to the specific stakes and mysteries from the background
4. You MUST use the specific locations from the location_palette in your scene titles/objectives
5. You MUST reference the specific NPCs from the npc_roster_skeleton in your scenes
6. You MUST weave the specific motifs throughout the scene flow
7. You MUST follow all constraints from the doNots list
8. DO NOT create generic scenes - every scene must be clearly connected to the background context

CREATIVITY REQUIREMENTS:
9. Avoid repetitive patterns and clichéd scene structures
10. Create unexpected combinations of locations, NPCs, and objectives
11. Vary the pacing and intensity between scenes
12. Include surprising plot developments and twists
13. Use unique and memorable scene titles that stand out
14. Create diverse scene types (exploration, social, combat, investigation, etc.)
15. Ensure each scene feels distinct and memorable

SCENE STRUCTURE (5-6 scenes):
- Scenes 1-2: Early exploration, introduce basic mysteries from background
- Scenes 3-4: Mid development, deepen investigation of background mysteries
- Scenes 5-6: Late resolution, address background stakes and mysteries

OUTPUT FORMAT:
{
  "scenes": [
    {
      "title": "Scene title that matches the tone_rules and uses background elements",
      "objective": "One-sentence purpose that connects to background stakes/mysteries"
    }
  ]
}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting. The response must be valid JSON that can be parsed directly.`;
}

/**
 * Renders the Next Scene template for iterative scene expansion
 * @param {Object} params - Template parameters
 * @param {Object} params.background - Background context
 * @param {Object} params.characters - Characters context
 * @param {Object} params.previousScene - The previous scene data
 * @param {Object} params.effectiveContext - Context from locked predecessors
 * @param {string} params.gmIntent - GM's intent for the next scene
 * @returns {string} The rendered prompt
 */
export function renderNextScenePrompt({ background, characters, previousScene, effectiveContext, gmIntent }) {
  const backgroundBlock = background ? `
BACKGROUND_CONTEXT:
PREMISE: ${background.premise || 'No premise provided'}

TONE_RULES (use these to set the emotional tone):
${(background.tone_rules || []).map(rule => `- ${rule}`).join('\n')}

STAKES (connect scene to these conflicts):
${(background.stakes || []).map(stake => `- ${stake}`).join('\n')}

MYSTERIES (reveal these gradually):
${(background.mysteries || []).map(mystery => `- ${mystery}`).join('\n')}

LOCATIONS (choose from these places):
${(background.location_palette || []).map(location => `- ${location}`).join('\n')}

NPCs (these characters should appear):
${(background.npc_roster_skeleton || []).map(npc => `- ${npc}`).join('\n')}

MOTIFS (weave these themes throughout):
${(background.motifs || []).map(motif => `- ${motif}`).join('\n')}

CONSTRAINTS (follow these rules):
${(background.doNots || []).map(constraint => `- ${constraint}`).join('\n')}

PLAYSTYLE (consider these implications):
${(background.playstyle_implications || []).map(implication => `- ${implication}`).join('\n')}` : '';

  const charactersBlock = characters && characters.list ? `
CHARACTERS (these PCs will be in the scene):
${characters.list.map(char => `- ${char.name} (${char.class || 'Unknown class'}): ${char.motivation || 'No motivation provided'}
  Connection: ${char.connectionToStory || 'No connection provided'}`).join('\n')}

CHARACTER MOTIVATIONS (use these to shape scene beats):
${characters.list.map(char => `- ${char.name}: ${char.motivation || 'No motivation provided'}`).join('\n')}` : '';

  const effectiveContextBlock = effectiveContext && Object.keys(effectiveContext).length > 0 ? `
EFFECTIVE_CONTEXT (from locked predecessors):
${JSON.stringify(effectiveContext, null, 2)}

CONTEXT_INTEGRATION:
- Build upon the context from previous locked scenes
- Do not contradict established facts
- Reference key events, revealed info, state changes, NPC relationships, environmental changes, plot threads, and player decisions from previous scenes
- The scene should feel like a natural continuation of the story` : `
EFFECTIVE_CONTEXT:
No previous locked scenes - this is the first scene.`;

  return `You are a D&D GM assistant helping to expand a scene chain iteratively. Follow the rules strictly and return valid JSON only.

${backgroundBlock}${charactersBlock}

PREVIOUS_SCENE:
- title: "${previousScene.title}"
- objective: "${previousScene.objective}"
- sequence: ${previousScene.sequence}

${effectiveContextBlock}

GM_INTENT:
"${gmIntent}"

CRITICAL INSTRUCTIONS:

1. Create the NEXT SCENE that logically follows the previous scene and the GM's intent.
2. The scene should:
   - Build naturally from the previous scene
   - Incorporate the GM's specific intent
   - Respect BACKGROUND tone/motifs and CHARACTERS motivations
   - Not contradict EFFECTIVE_CONTEXT
   - Use specific locations/NPCs from the background when appropriate

3. Output concise JSON with these fields:
   - "title": Short, evocative title that matches tone_rules and uses background elements
   - "objective": 1-2 sentence purpose-only objective that connects to background stakes/mysteries
   - "sequence": ${previousScene.sequence + 1}

4. Keep the objective focused on purpose only - no micro-details about implementation.

REQUIRED OUTPUT FORMAT:
{
  "title": "Scene title that matches the tone_rules and uses background elements",
  "objective": "One-sentence purpose that connects to background stakes/mysteries",
  "sequence": ${previousScene.sequence + 1}
}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting. The response must be valid JSON that can be parsed directly.`;
}
