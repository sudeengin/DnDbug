import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Function to extract keywords from story concept using AI
async function extractStoryKeywords(concept) {
  try {
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Analyze this story concept and extract key thematic elements, setting details, and narrative themes. Return a JSON object with the following structure:

{
  "themes": ["theme1", "theme2"],
  "setting": "primary setting description",
  "mood": "overall mood/atmosphere",
  "key_elements": ["element1", "element2"],
  "genre": "primary genre",
  "keywords": ["keyword1", "keyword2"]
}

Story Concept: "${concept}"

Focus on:
- Main themes (mystery, horror, adventure, romance, etc.)
- Setting details (forest, castle, city, etc.)
- Mood/atmosphere (dark, mysterious, epic, etc.)
- Key narrative elements (disappearances, strange behavior, etc.)
- Genre classification
- Important keywords for scene generation

Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a story analysis expert. Extract key elements from story concepts for scene generation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse keyword extraction response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error in keyword extraction:', error);
    return null;
  }
}

// Function to generate dynamic scenes based on concept
async function generateDynamicScenes(concept) {
  const conceptLower = concept.toLowerCase();
  const timestamp = Date.now();
  
  // Try to extract keywords using AI first
  console.log('🔍 Starting keyword extraction for concept:', concept.substring(0, 50) + '...');
  const extractedKeywords = await extractStoryKeywords(concept);
  console.log('✅ Extracted keywords:', extractedKeywords);
  
  // Multiple template sets for variety
  const allTemplates = [
    // Forest templates
    [
      { title: 'The Whispering Grove', objective: 'Discover the source of the ancient whispers' },
      { title: 'The Guardian Trees', objective: 'Navigate through the protective forest guardians' },
      { title: 'The Heart of the Forest', objective: 'Reach the central clearing where the oldest tree stands' },
      { title: 'The Ancient Secret', objective: 'Uncover the hidden knowledge within the tree' },
      { title: 'The Forest\'s Choice', objective: 'Decide whether to preserve or share the forest\'s secret' }
    ],
    // Dungeon templates
    [
      { title: 'The Cave Entrance', objective: 'Find and enter the mysterious cave system' },
      { title: 'The Ancient Halls', objective: 'Navigate through the crumbling underground corridors' },
      { title: 'The Guardian Chamber', objective: 'Face the ancient guardian of the dungeon' },
      { title: 'The Hidden Vault', objective: 'Discover the secret treasure chamber' },
      { title: 'The Escape Route', objective: 'Find a way out before the dungeon collapses' }
    ],
    // Castle templates
    [
      { title: 'The Castle Gates', objective: 'Gain entry to the heavily guarded fortress' },
      { title: 'The Great Hall', objective: 'Navigate the grand halls and avoid detection' },
      { title: 'The Throne Room', objective: 'Confront the ruler or discover their fate' },
      { title: 'The Secret Passage', objective: 'Find the hidden passage to the treasure' },
      { title: 'The Final Choice', objective: 'Decide the fate of the kingdom' }
    ],
    // City templates
    [
      { title: 'The City Gates', objective: 'Enter the bustling city and gather information' },
      { title: 'The Market Square', objective: 'Investigate the rumors and find allies' },
      { title: 'The Noble District', objective: 'Navigate the political landscape of the upper class' },
      { title: 'The Underground', objective: 'Discover the city\'s hidden secrets' },
      { title: 'The Final Showdown', objective: 'Confront the mastermind behind the plot' }
    ],
    // Sea templates
    [
      { title: 'The Harbor', objective: 'Board the ship and set sail on the adventure' },
      { title: 'The Open Sea', objective: 'Navigate through treacherous waters and storms' },
      { title: 'The Mysterious Island', objective: 'Discover the hidden island and its secrets' },
      { title: 'The Ancient Temple', objective: 'Explore the underwater temple ruins' },
      { title: 'The Return Journey', objective: 'Make it back home with the treasure' }
    ],
    // Mystery/Investigation templates
    [
      { title: 'The Gathering', objective: 'Meet the other characters and establish relationships' },
      { title: 'The First Clue', objective: 'Discover the initial evidence that starts the investigation' },
      { title: 'The Deeper Mystery', objective: 'Uncover more complex layers of the conspiracy' },
      { title: 'The Revelation', objective: 'Learn the truth behind the mysterious events' },
      { title: 'The Resolution', objective: 'Confront the mastermind and resolve the conflict' }
    ],
    // Horror templates
    [
      { title: 'The Arrival', objective: 'Enter the haunted location and sense something is wrong' },
      { title: 'The First Encounter', objective: 'Experience the first supernatural phenomenon' },
      { title: 'The Investigation', objective: 'Search for clues about the haunting\'s origin' },
      { title: 'The Confrontation', objective: 'Face the source of the supernatural threat' },
      { title: 'The Escape', objective: 'Survive and escape from the haunted location' }
    ],
    // Adventure templates
    [
      { title: 'The Call to Adventure', objective: 'Receive the mission and gather your party' },
      { title: 'The Journey Begins', objective: 'Start the quest and face initial challenges' },
      { title: 'The Trials', objective: 'Overcome major obstacles and gain experience' },
      { title: 'The Climax', objective: 'Face the ultimate challenge or antagonist' },
      { title: 'The Return', objective: 'Complete the quest and return with rewards' }
    ]
  ];
  
  // Determine which template to use based on extracted keywords or fallback to concept analysis
  let templateIndex = 0;
  
  if (extractedKeywords) {
    // Use AI-extracted keywords for better matching
    const themes = extractedKeywords.themes || [];
    const genre = extractedKeywords.genre || '';
    const keywords = extractedKeywords.keywords || [];
    const mood = extractedKeywords.mood || '';
    
    console.log('🎯 Template selection - Themes:', themes, 'Genre:', genre, 'Keywords:', keywords);
    
    // Check themes and genre for template selection
    if (themes.some(theme => ['horror', 'mystery', 'supernatural'].includes(theme.toLowerCase())) || 
        genre.toLowerCase().includes('horror') || 
        keywords.some(k => ['haunted', 'ghost', 'supernatural', 'scary', 'spooky'].includes(k.toLowerCase()))) {
      templateIndex = 6; // Horror template
      console.log('🎭 Selected HORROR template (index 6)');
    } else if (themes.some(theme => ['mystery', 'investigation'].includes(theme.toLowerCase())) || 
               keywords.some(k => ['mystery', 'investigation', 'detective', 'conspiracy', 'strangers'].includes(k.toLowerCase()))) {
      templateIndex = 5; // Mystery template
      console.log('🔍 Selected MYSTERY template (index 5)');
    } else if (keywords.some(k => ['forest', 'wood', 'tree', 'grove'].includes(k.toLowerCase()))) {
      templateIndex = 0; // Forest template
    } else if (keywords.some(k => ['dungeon', 'cave', 'underground', 'tunnel'].includes(k.toLowerCase()))) {
      templateIndex = 1; // Dungeon template
    } else if (keywords.some(k => ['castle', 'palace', 'fortress', 'tower'].includes(k.toLowerCase()))) {
      templateIndex = 2; // Castle template
    } else if (keywords.some(k => ['city', 'town', 'village', 'street'].includes(k.toLowerCase()))) {
      templateIndex = 3; // City template
    } else if (keywords.some(k => ['sea', 'ocean', 'ship', 'water'].includes(k.toLowerCase()))) {
      templateIndex = 4; // Sea template
    } else {
      // Use timestamp to randomly select a template for variety
      templateIndex = Math.floor(Math.random() * allTemplates.length);
    }
  } else {
    // Fallback to original keyword matching if AI extraction fails
    if (conceptLower.includes('horror') || conceptLower.includes('haunted') || conceptLower.includes('ghost') || conceptLower.includes('supernatural') || conceptLower.includes('scary') || conceptLower.includes('mansion') || conceptLower.includes('spooky')) {
      templateIndex = 6;
    } else if (conceptLower.includes('forest') || conceptLower.includes('wood') || conceptLower.includes('tree') || conceptLower.includes('grove')) {
      templateIndex = 0;
    } else if (conceptLower.includes('dungeon') || conceptLower.includes('cave') || conceptLower.includes('underground') || conceptLower.includes('tunnel')) {
      templateIndex = 1;
    } else if (conceptLower.includes('castle') || conceptLower.includes('palace') || conceptLower.includes('fortress') || conceptLower.includes('tower')) {
      templateIndex = 2;
    } else if (conceptLower.includes('city') || conceptLower.includes('town') || conceptLower.includes('village') || conceptLower.includes('street')) {
      templateIndex = 3;
    } else if (conceptLower.includes('sea') || conceptLower.includes('ocean') || conceptLower.includes('ship') || conceptLower.includes('water')) {
      templateIndex = 4;
    } else if (conceptLower.includes('mystery') || conceptLower.includes('investigation') || conceptLower.includes('detective') || conceptLower.includes('strangers') || conceptLower.includes('conspiracy')) {
      templateIndex = 5;
    } else {
      // Use timestamp to randomly select a template for variety
      templateIndex = Math.floor(Math.random() * allTemplates.length);
    }
  }
  
  const sceneTemplates = allTemplates[templateIndex];
  
  // Add randomness to make each generation unique
  const randomSuffixes = ['Ancient', 'Mysterious', 'Forgotten', 'Hidden', 'Sacred', 'Cursed', 'Lost', 'Legendary', 'Enchanted', 'Dark'];
  const randomSuffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
  
  // Generate scenes with dynamic IDs and variations
  return sceneTemplates.map((template, index) => {
    // Add random variations to some scenes
    const shouldVary = Math.random() < 0.3; // 30% chance of variation
    const variationIndex = Math.floor(Math.random() * 3); // Which scene to vary
    
    let finalTitle = template.title;
    let finalObjective = template.objective;
    
    if (shouldVary && index === variationIndex) {
      finalTitle = `${randomSuffix} ${template.title}`;
    }
    
    return {
      id: `scene_${index + 1}_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
      order: index + 1,
      title: finalTitle,
      objective: finalObjective
    };
  });
}

// Mock API endpoints for local development
// Import the proper generate_chain handler - use dynamic import to avoid caching
app.post('/api/generate_chain', async (req, res) => {
  const { default: handler } = await import('./api/generate_chain.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/update_chain', async (req, res) => {
  try {
    const { chainId, edits, sessionId } = req.body;

    if (!chainId || !Array.isArray(edits)) {
      return res.status(400).json({ error: 'chainId and edits array are required' });
    }

    // Try to get the chain from session context first
    let chain = null;
    if (sessionId) {
      const { getOrCreateSessionContext } = await import('./api/context.js');
      const sessionContext = await getOrCreateSessionContext(sessionId);
      
      if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
        chain = sessionContext.macroChains[chainId];
      }
    }

    // If not found in session context, create a mock chain
    if (!chain) {
      chain = {
        chainId,
        scenes: [],
        status: 'Edited',
        version: 1,
        lastUpdatedAt: new Date().toISOString(),
        meta: {}
      };
    }

    // Process each edit
    for (const edit of edits) {
      switch (edit.type) {
        case 'reorder':
          console.log(`Reordering scene ${edit.sceneId} to position ${edit.newOrder}`);
          const sceneToReorder = chain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToReorder) {
            sceneToReorder.order = edit.newOrder;
            chain.scenes.sort((a, b) => a.order - b.order);
          }
          break;
          
        case 'edit_title':
          console.log(`Updating title for scene ${edit.sceneId} to: ${edit.newValue}`);
          const sceneToEditTitle = chain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToEditTitle) {
            sceneToEditTitle.title = edit.newValue;
          }
          break;
          
        case 'edit_objective':
          console.log(`Updating objective for scene ${edit.sceneId} to: ${edit.newValue}`);
          const sceneToEditObjective = chain.scenes.find(s => s.id === edit.sceneId);
          if (sceneToEditObjective) {
            sceneToEditObjective.objective = edit.newValue;
          }
          break;
          
        case 'delete_scene':
          console.log(`Deleting scene ${edit.sceneId}`);
          chain.scenes = chain.scenes.filter(s => s.id !== edit.sceneId);
          chain.scenes.forEach((scene, index) => {
            scene.order = index + 1;
          });
          break;
          
        case 'add_scene':
          console.log(`Adding new scene:`, edit.sceneData);
          const newScene = {
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            order: chain.scenes.length + 1,
            title: edit.sceneData.title || 'New Scene',
            objective: edit.sceneData.objective || 'New objective'
          };
          chain.scenes.push(newScene);
          break;
          
        default:
          console.warn(`Unknown edit type: ${edit.type}`);
      }
    }

    // Update chain metadata
    chain.status = 'Edited';
    chain.version = (chain.version || 0) + 1;
    chain.lastUpdatedAt = new Date().toISOString();

    // Save back to session context if sessionId is provided
    if (sessionId) {
      const { getOrCreateSessionContext } = await import('./api/context.js');
      const { saveSessionContext } = await import('./api/storage.js');
      
      const sessionContext = await getOrCreateSessionContext(sessionId);
      
      if (!sessionContext.macroChains) {
        sessionContext.macroChains = {};
      }
      
      sessionContext.macroChains[chainId] = chain;
      sessionContext.updatedAt = new Date().toISOString();
      
      await saveSessionContext(sessionId, sessionContext);
      
      console.log(`Macro chain ${chainId} updated in session context for ${sessionId}`);
    }

    console.log('Update Chain:', {
      chainId,
      editCount: edits.length,
      timestamp: Date.now(),
    });

    res.status(200).json({ ok: true, data: chain });

  } catch (error) {
    console.error('Error in update_chain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scene Detail Generation endpoint
app.post('/api/generate_detail', async (req, res) => {
  try {
    const { sceneId, macroScene, effectiveContext } = req.body;

    if (!sceneId || !macroScene || !effectiveContext) {
      return res.status(400).json({ error: 'sceneId, macroScene, and effectiveContext are required' });
    }

    // Check if we should use AI or mock data
    const useAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
    
    if (!useAI) {
      console.log('No OpenAI API key found, using mock data for development');
      
      // Mock response for local development
      const mockSceneDetail = {
        sceneId,
        title: macroScene.title,
        objective: macroScene.objective,
        keyEvents: [
          'Players arrive at the scene',
          'Initial environmental observation',
          'First interaction or discovery'
        ],
        revealedInfo: [
          'Scene-specific information revealed',
          'Clues discovered during exploration'
        ],
        stateChanges: {
          scene_visited: true,
          time_elapsed: '1 hour',
          ...effectiveContext.stateChanges
        },
        contextOut: {
          keyEvents: [
            'Scene completed successfully',
            'Key decisions made by players'
          ],
          revealedInfo: [
            'New information about the world',
            'Important plot revelations'
          ],
          stateChanges: {
            trust_level_host: effectiveContext.stateChanges?.trust_level_host || 0,
            environmental_state: 'modified',
            scene_completion: true
          },
          npcRelationships: effectiveContext.npcRelationships || {},
          environmentalState: effectiveContext.environmentalState || {},
          plotThreads: effectiveContext.plotThreads || [],
          playerDecisions: effectiveContext.playerDecisions || []
        },
        openingStateAndTrigger: {
          state: 'The scene begins with players entering the area',
          trigger: 'Players approach the designated location'
        },
        environmentAndSensory: {
          visual: ['Atmospheric visual elements'],
          auditory: ['Ambient sounds'],
          olfactory: ['Environmental smells'],
          tactile_or_thermal: ['Physical sensations'],
          other: ['Other sensory details']
        },
        epicIntro: 'An epic introduction to the scene that sets the mood and atmosphere.',
        setting: 'Detailed description of the scene setting',
        atmosphere: 'The overall mood and feeling of the scene',
        gmNarrative: 'GM narrative text that describes what happens in the scene',
        beats: [
          'Scene beat 1',
          'Scene beat 2',
          'Scene beat 3'
        ],
        checks: [
          {
            type: 'skill',
            ability: 'Wisdom',
            skill: 'Perception',
            dc_suggested_range: [12, 15],
            dc: 14,
            check_label: 'Wisdom (Perception) DC 14',
            when: 'When players search the area',
            on_success: 'Players notice important details',
            on_fail: 'Players miss subtle clues',
            advantage_hints: ['Look for unusual patterns', 'Pay attention to details']
          }
        ],
        cluesAndForeshadowing: {
          clues: ['Important clues for the players'],
          foreshadowing: ['Hints about future events']
        },
        npcMiniCards: [
          {
            name: 'Sample NPC',
            role: 'Important character',
            demeanor: 'Friendly',
            quirk: 'Always speaks in riddles',
            goal: 'Help the players',
            secret: 'Knows more than they let on'
          }
        ],
        combatProbabilityAndBalance: {
          likelihood: 'low',
          enemies: ['Potential threats'],
          balance_notes: 'Combat is unlikely but possible',
          escape_or_alt_paths: ['Ways to avoid or escape combat']
        },
        exitConditionsAndTransition: {
          exit_conditions: ['Players complete their objective'],
          transition_to_next: 'Transition to the next scene'
        },
        rewards: ['Experience points', 'Treasure', 'Information']
      };

      console.log('Mock Generate Detail:', {
        sceneId,
        title: macroScene.title,
        hasContext: Object.keys(effectiveContext).length > 0,
        contextKeys: Object.keys(effectiveContext),
        timestamp: Date.now(),
      });

      return res.status(200).json({ ok: true, data: mockSceneDetail });
    }

    // Use the actual AI generation logic from generate_detail.js
    const { generateSceneDetailForServer } = await import('./api/generate_detail.js');
    
    console.log('Using AI generation for scene detail:', {
      sceneId,
      title: macroScene.title,
      hasContext: Object.keys(effectiveContext).length > 0,
      contextKeys: Object.keys(effectiveContext),
    });

    // Call the AI generation function
    const result = await generateSceneDetailForServer(req);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in generate_detail:', error);
    res.status(500).json({ error: error.message });
  }
});

// Root endpoint - redirect to frontend
app.get('/', (req, res) => {
  res.json({ 
    message: 'DnDBug API Server', 
    status: 'running',
    frontend: 'http://localhost:5173',
    endpoints: [
      'GET /api/health',
      'POST /api/projects',
      'GET /api/projects',
      'POST /api/generate_chain',
      'POST /api/update_chain', 
      'POST /api/generate_detail',
      'POST /api/apply_edit',
      'POST /api/propagate',
      'POST /api/generate_background',
      'POST /api/context/append',
      'GET  /api/context/get',
      'POST /api/context/clear',
      'POST /api/context/lock',
      'POST /api/chain/lock',
      'POST /api/chain/unlock',
      'POST /api/scene/lock',
      'POST /api/scene/unlock'
    ]
  });
});

// Apply Edit endpoint - for delta analysis and impact calculation
app.post('/api/apply_edit', async (req, res) => {
  try {
    const { sceneId, oldDetail, newDetail } = req.body;

    if (!sceneId || !oldDetail || !newDetail) {
      return res.status(400).json({ error: 'sceneId, oldDetail, and newDetail are required' });
    }

    // Import the apply_edit handler
    const { default: applyEditHandler } = await import('./api/apply_edit.js');
    
    console.log('Apply Edit Request:', {
      sceneId,
      hasOldDetail: !!oldDetail,
      hasNewDetail: !!newDetail,
      timestamp: Date.now()
    });

    // Call the handler with proper request/response objects
    await applyEditHandler(req, res);

  } catch (error) {
    console.error('Error in apply_edit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Propagate endpoint - for regeneration planning
app.post('/api/propagate', async (req, res) => {
  try {
    const { fromSceneIndex, chainId, affectedScenes } = req.body;

    if (typeof fromSceneIndex !== 'number' || !chainId || !Array.isArray(affectedScenes)) {
      return res.status(400).json({ error: 'fromSceneIndex, chainId, and affectedScenes are required' });
    }

    // Import the propagate handler
    const { default: propagateHandler } = await import('./api/propagate.js');
    
    console.log('Propagate Request:', {
      fromSceneIndex,
      chainId,
      affectedScenesCount: affectedScenes.length,
      timestamp: Date.now()
    });

    // Call the handler with proper request/response objects
    await propagateHandler(req, res);

  } catch (error) {
    console.error('Error in propagate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Story Background Generator endpoint - Compact background generation
app.post('/api/generate_background', async (req, res) => {
  try {
    const { sessionId, concept, meta } = req.body;

    if (!concept || concept.trim().length === 0) {
      return res.status(400).json({ error: 'Story concept is required' });
    }

    // Check if we should use AI or mock data
    const useAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
    
    console.log('🔍 Debug: OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('🔍 Debug: OPENAI_API_KEY value:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
    console.log('🔍 Debug: useAI:', useAI);
    
    if (!useAI) {
      console.log('No OpenAI API key found, using mock data for development');
      
      // Mock compact background for development
      const mockBackground = {
        premise: "A dark fantasy adventure where players must navigate political intrigue in a corrupt city while uncovering ancient secrets.",
        tone_rules: [
          "Maintain a dark, mysterious atmosphere",
          "Focus on political intrigue and moral ambiguity",
          "Use Gothic horror elements sparingly",
          "Keep dialogue sharp and meaningful"
        ],
        stakes: [
          "The city's fate hangs in the balance",
          "Ancient evil threatens to return",
          "Political power could corrupt the heroes",
          "Innocent lives are at risk"
        ],
        mysteries: [
          "Who is really pulling the strings?",
          "What ancient power lies beneath the city?",
          "Why are the nobles so secretive?",
          "What happened to the previous heroes?"
        ],
        factions: [
          "The Noble Houses - Corrupt but powerful",
          "The Underground Resistance - Fighting for justice",
          "The Cult of the Ancient - Seeking forbidden knowledge",
          "The City Guard - Divided loyalties"
        ],
        location_palette: [
          "The Grand Cathedral - Sacred and mysterious",
          "The Noble Quarter - Opulent but dangerous",
          "The Underground Tunnels - Dark and treacherous",
          "The Market District - Bustling with secrets"
        ],
        npc_roster_skeleton: [
          "Lord Blackthorne - Corrupt noble with hidden agenda",
          "Captain Valeria - Honest guard captain",
          "The Oracle - Mysterious fortune teller",
          "Master Thorne - Underground resistance leader"
        ],
        motifs: [
          "Corrupted symbols of power",
          "Shadows that move independently",
          "Ancient texts with forbidden knowledge",
          "Whispers in the darkness"
        ],
        doNots: [
          "Don't make the corruption too obvious",
          "Avoid clichéd evil overlord tropes",
          "Don't reveal all secrets at once",
          "Avoid making the heroes too powerful too quickly"
        ],
        playstyle_implications: [
          "Emphasize investigation and social interaction",
          "Include moral choices with consequences",
          "Use environmental storytelling",
          "Balance combat with roleplay"
        ]
      };

      console.log('Mock Generate Background:', {
        concept: concept.substring(0, 50) + '...',
        hasPremise: !!mockBackground.premise,
        timestamp: Date.now(),
      });

      return res.status(200).json({ ok: true, data: { background: mockBackground } });
    }

    // Use the actual AI generation logic
    console.log('Using AI generation for story background:', {
      concept: concept.substring(0, 50) + '...',
    });

    // Generate compact background using AI
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a DnD GM assistant. Generate a compact Story Background from a Story Concept.`;

    const userPrompt = `STORY_CONCEPT:
"""
${concept}
"""

STRUCTURAL_PREFERENCES:
${JSON.stringify(meta || {})}

Generate a compact Story Background JSON with these fields:
- premise: string (core story premise in 1-2 sentences)
- tone_rules: string[] (3-5 tone guidelines)
- stakes: string[] (3-5 key stakes/conflicts)
- mysteries: string[] (3-5 central mysteries)
- factions: string[] (3-5 major factions/groups)
- location_palette: string[] (3-5 key locations)
- npc_roster_skeleton: string[] (3-5 key NPCs with brief descriptions)
- motifs: string[] (3-5 recurring themes/symbols)
- doNots: string[] (3-5 things to avoid)
- playstyle_implications: string[] (3-5 playstyle considerations)

CONSTRAINTS:
- Keep each field concise (1-2 sentences max per item)
- Focus on story-driving elements
- Ensure consistency with concept
- Make it actionable for scene generation

OUTPUT
Valid JSON only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('AI Response:', responseText);
      console.log('Cleaned Response:', cleaned);
      parsedResponse = JSON.parse(cleaned);
      console.log('Parsed Response:', parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate required fields
    const requiredFields = [
      'premise', 'tone_rules', 'stakes', 'mysteries', 
      'factions', 'location_palette', 'npc_roster_skeleton', 
      'motifs', 'doNots', 'playstyle_implications'
    ];

    for (const field of requiredFields) {
      if (!parsedResponse[field]) {
        throw new Error(`Missing field: ${field}`);
      }
      
      // premise should be a string, others should be arrays
      if (field === 'premise') {
        if (typeof parsedResponse[field] !== 'string') {
          throw new Error(`Field ${field} must be a string`);
        }
      } else {
        if (!Array.isArray(parsedResponse[field])) {
          throw new Error(`Field ${field} must be an array`);
        }
      }
    }

    // Log telemetry
    console.log('Telemetry: generate_background', {
      sessionId,
      conceptLength: concept.length,
      hasMeta: !!meta,
      timestamp: Date.now(),
    });

    res.status(200).json({ 
      ok: true, 
      data: { 
        background: parsedResponse 
      } 
    });

  } catch (error) {
    console.error('Error in generate_background:', error);
    res.status(500).json({ error: error.message });
  }
});

// Projects endpoint
app.post('/api/projects', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ 
        error: 'title is required and must be a non-empty string' 
      });
    }

    // Import the projects handler functions
    const { createProject } = await import('./api/projects.js');
    
    const project = createProject(title);

    console.log('Project created:', {
      id: project.id,
      title: project.title,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: project 
    });

  } catch (error) {
    console.error('Error in projects:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    // Import the projects handler functions
    const { listProjects } = await import('./api/projects.js');
    
    const allProjects = listProjects();
    
    console.log('Projects listed:', {
      count: allProjects.length,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: allProjects 
    });

  } catch (error) {
    console.error('Error in projects list:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        error: 'Project ID is required' 
      });
    }

    // Import the projects handler functions
    const { deleteProject } = await import('./api/projects.js');
    
    const deletedProject = deleteProject(id);
    
    if (!deletedProject) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    console.log('Project deleted via server:', {
      id: deletedProject.id,
      title: deletedProject.title,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: { message: 'Project deleted successfully', project: deletedProject }
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Context Memory endpoints - inline implementation
app.post('/api/context/append', async (req, res) => {
  try {
    const { sessionId, blockType, data } = req.body;

    if (!sessionId || !blockType || !data) {
      return res.status(400).json({ 
        error: 'sessionId, blockType, and data are required' 
      });
    }

    if (!['blueprint', 'player_hooks', 'world_seeds', 'style_prefs', 'custom', 'story_facts', 'background', 'story_concept'].includes(blockType)) {
      return res.status(400).json({ 
        error: 'Invalid blockType. Must be one of: blueprint, player_hooks, world_seeds, style_prefs, custom, story_facts, background, story_concept' 
      });
    }

    // Import the context handler functions and storage
    const { getOrCreateSessionContext, mergeContextData } = await import('./api/context.js');
    const { saveSessionContext } = await import('./api/storage.js');
    
    const sessionContext = await getOrCreateSessionContext(sessionId);
    const existingBlock = sessionContext.blocks[blockType];

    // Merge the new data with existing data
    const mergedData = mergeContextData(existingBlock, data, blockType);

    // Update the session context
    sessionContext.blocks[blockType] = mergedData;
    sessionContext.version += 1;
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save the updated session context to storage
    await saveSessionContext(sessionId, sessionContext);

    console.log('Context appended:', {
      sessionId,
      blockType,
      version: sessionContext.version,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    console.error('Error in context/append:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/context/get', async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'sessionId query parameter is required' 
      });
    }

    // Import the context handler functions
    const { getOrCreateSessionContext } = await import('./api/context.js');
    
    const sessionContext = await getOrCreateSessionContext(sessionId);

    if (!sessionContext || Object.keys(sessionContext.blocks).length === 0) {
      return res.status(200).json({ 
        ok: true, 
        data: null 
      });
    }

    console.log('Context retrieved:', {
      sessionId,
      version: sessionContext.version,
      blockTypes: Object.keys(sessionContext.blocks),
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: sessionContext 
    });

  } catch (error) {
    console.error('Error in context/get:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/context/clear', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'sessionId is required' 
      });
    }

    // Import the context handler functions
    const { getOrCreateSessionContext } = await import('./api/context.js');
    
    // Clear the session context
    const sessionContext = await getOrCreateSessionContext(sessionId);
    sessionContext.blocks = {};
    sessionContext.version = 0;
    sessionContext.updatedAt = new Date().toISOString();

    console.log('Context cleared:', {
      sessionId,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: { sessionId, cleared: true } 
    });

  } catch (error) {
    console.error('Error in context/clear:', error);
    res.status(500).json({ error: error.message });
  }
});

// Context Lock endpoint - for locking/unlocking context blocks
app.post('/api/context/lock', async (req, res) => {
  try {
    const { sessionId, blockType, locked } = req.body;

    if (!sessionId || !blockType || typeof locked !== 'boolean') {
      return res.status(400).json({ 
        error: 'sessionId, blockType, and locked (boolean) are required' 
      });
    }

    if (!['blueprint', 'player_hooks', 'world_seeds', 'style_prefs', 'custom', 'story_facts', 'background', 'story_concept'].includes(blockType)) {
      return res.status(400).json({ 
        error: 'Invalid blockType. Must be one of: blueprint, player_hooks, world_seeds, style_prefs, custom, story_facts, background, story_concept' 
      });
    }

    // Import the context handler functions and storage
    const { getOrCreateSessionContext } = await import('./api/context.js');
    const { saveSessionContext } = await import('./api/storage.js');
    
    // Get or create session context
    const context = await getOrCreateSessionContext(sessionId);
    
    // Initialize locks object if it doesn't exist
    if (!context.locks) {
      context.locks = {};
    }
    
    // Update the lock state
    context.locks[blockType] = locked;
    context.version += 1;
    context.updatedAt = new Date().toISOString();
    
    // Save the updated session context to storage
    await saveSessionContext(sessionId, context);

    console.log(`Context lock updated: ${sessionId} - ${blockType} = ${locked}`);

    res.status(200).json({ 
      ok: true, 
      message: `Block ${blockType} ${locked ? 'locked' : 'unlocked'} successfully`,
      context 
    });
  } catch (error) {
    console.error('Error in context/lock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chain Lock/Unlock API Routes
app.get('/api/chain/get', async (req, res) => {
  try {
    const { chainId, sessionId } = req.query;
    
    if (!chainId) {
      return res.status(400).json({ error: 'Missing required field: chainId' });
    }
    
    // Try to get the chain from session context first if sessionId is provided
    if (sessionId) {
      const { getOrCreateSessionContext } = await import('./api/context.js');
      const sessionContext = await getOrCreateSessionContext(sessionId);
      
      if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
        return res.json({ ok: true, chain: sessionContext.macroChains[chainId] });
      }
    }
    
    // Fallback to old storage system
    const { loadChain } = await import('./api/storage.js');
    try {
      const chain = await loadChain(chainId);
      if (chain) {
        return res.json({ ok: true, chain });
      }
    } catch (error) {
      console.warn('Failed to load chain from old storage:', error);
    }
    
    return res.status(404).json({ error: 'Chain not found' });
    
  } catch (error) {
    console.error('Error getting chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/chain/lock', async (req, res) => {
  try {
    const { sessionId, chainId } = req.body;
    
    if (!sessionId || !chainId) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, chainId' });
    }
    
    // Get session context
    const { getOrCreateSessionContext } = await import('./api/context.js');
    const { saveSessionContext } = await import('./api/storage.js');
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Find the macro chain in the session context first
    let macroChain = null;
    if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
      macroChain = sessionContext.macroChains[chainId];
    }
    
    // If not found in session context, try the old storage system
    if (!macroChain) {
      try {
        const { loadChain } = await import('./api/storage.js');
        macroChain = await loadChain(chainId);
        
        // If found in old storage, store it in session context for future use
        if (macroChain) {
          if (!sessionContext.macroChains) {
            sessionContext.macroChains = {};
          }
          sessionContext.macroChains[chainId] = macroChain;
          sessionContext.updatedAt = new Date().toISOString();
          await saveSessionContext(sessionId, sessionContext);
          console.log(`Chain ${chainId} migrated from old storage to session context`);
        }
      } catch (error) {
        console.warn('Failed to load chain from old storage:', error);
      }
    }
    
    // Debug logging
    console.log('Chain lock debug:', {
      sessionId,
      chainId,
      hasMacroChains: !!sessionContext.macroChains,
      macroChainsKeys: sessionContext.macroChains ? Object.keys(sessionContext.macroChains) : [],
      foundChain: !!macroChain
    });
    
    // Validate that macro chain exists
    if (!macroChain) {
      return res.status(404).json({ error: 'Macro chain not found. Generate a chain first.' });
    }
    
    // Check if already locked
    if (macroChain.status === 'Locked') {
      return res.status(409).json({ error: 'Macro chain is already locked' });
    }
    
    // Lock the macro chain
    const lockedChain = {
      ...macroChain,
      status: 'Locked',
      lockedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      version: (macroChain.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.macroChains) {
      sessionContext.macroChains = {};
    }
    sessionContext.macroChains[chainId] = lockedChain;
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save to storage
    await saveSessionContext(sessionId, sessionContext);
    
    console.log(`Macro chain ${chainId} locked for session ${sessionId}`);
    
    res.json({
      ok: true,
      chain: lockedChain
    });
    
  } catch (error) {
    console.error('Error locking macro chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/chain/unlock', async (req, res) => {
  try {
    const { sessionId, chainId } = req.body;
    
    if (!sessionId || !chainId) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, chainId' });
    }
    
    // Get session context
    const { getOrCreateSessionContext } = await import('./api/context.js');
    const { saveSessionContext } = await import('./api/storage.js');
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Find the macro chain in the session context first
    let macroChain = null;
    if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
      macroChain = sessionContext.macroChains[chainId];
    }
    
    // If not found in session context, try the old storage system
    if (!macroChain) {
      try {
        const { loadChain } = await import('./api/storage.js');
        macroChain = await loadChain(chainId);
        
        // If found in old storage, store it in session context for future use
        if (macroChain) {
          if (!sessionContext.macroChains) {
            sessionContext.macroChains = {};
          }
          sessionContext.macroChains[chainId] = macroChain;
          sessionContext.updatedAt = new Date().toISOString();
          await saveSessionContext(sessionId, sessionContext);
          console.log(`Chain ${chainId} migrated from old storage to session context`);
        }
      } catch (error) {
        console.warn('Failed to load chain from old storage:', error);
      }
    }
    
    // Validate that macro chain exists
    if (!macroChain) {
      return res.status(404).json({ error: 'Macro chain not found' });
    }
    
    // Check if already unlocked
    if (macroChain.status !== 'Locked') {
      return res.status(409).json({ error: 'Macro chain is not locked' });
    }
    
    // Unlock the macro chain - set to Edited
    const unlockedChain = {
      ...macroChain,
      status: 'Edited',
      lockedAt: undefined,
      lastUpdatedAt: new Date().toISOString(),
      version: (macroChain.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.macroChains) {
      sessionContext.macroChains = {};
    }
    sessionContext.macroChains[chainId] = unlockedChain;
    
    // Mark all scene details as NeedsRegen since chain was unlocked
    const affectedScenes = [];
    if (sessionContext.sceneDetails) {
      for (const [sceneId, sceneDetail] of Object.entries(sessionContext.sceneDetails)) {
        if (sceneDetail && sceneDetail.sceneId) {
          // Mark as NeedsRegen
          const updatedDetail = {
            ...sceneDetail,
            status: 'NeedsRegen',
            lastUpdatedAt: new Date().toISOString(),
            version: (sceneDetail.version || 0) + 1
          };
          
          sessionContext.sceneDetails[sceneId] = updatedDetail;
          affectedScenes.push(sceneId);
        }
      }
    }
    
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save to storage
    await saveSessionContext(sessionId, sessionContext);
    
    console.log(`Macro chain ${chainId} unlocked for session ${sessionId}, affected scenes:`, affectedScenes);
    
    res.json({
      ok: true,
      chain: unlockedChain,
      affectedScenes
    });
    
  } catch (error) {
    console.error('Error unlocking macro chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scene Lock/Unlock API Routes
app.post('/api/scene/lock', async (req, res) => {
  try {
    const { sessionId, sceneId } = req.body;
    
    if (!sessionId || !sceneId) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, sceneId' });
    }
    
    // Get session context
    const { getOrCreateSessionContext } = await import('./api/context.js');
    const { saveSessionContext } = await import('./api/storage.js');
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Find the scene detail in the session context
    let sceneDetail = null;
    if (sessionContext.sceneDetails && sessionContext.sceneDetails[sceneId]) {
      sceneDetail = sessionContext.sceneDetails[sceneId];
    }
    
    // Validate that scene detail exists
    if (!sceneDetail) {
      return res.status(404).json({ error: 'Scene detail not found. Generate scene detail first.' });
    }
    
    // Check if already locked
    if (sceneDetail.status === 'Locked') {
      return res.status(409).json({ error: 'Scene is already locked' });
    }
    
    // Lock the scene
    const lockedDetail = {
      ...sceneDetail,
      status: 'Locked',
      lockedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      version: (sceneDetail.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.sceneDetails) {
      sessionContext.sceneDetails = {};
    }
    sessionContext.sceneDetails[sceneId] = lockedDetail;
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save to storage
    await saveSessionContext(sessionId, sessionContext);
    
    console.log(`Scene ${sceneId} locked for session ${sessionId}`);
    
    res.json({
      ok: true,
      detail: lockedDetail
    });
    
  } catch (error) {
    console.error('Error locking scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/scene/unlock', async (req, res) => {
  try {
    const { sessionId, sceneId } = req.body;
    
    if (!sessionId || !sceneId) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, sceneId' });
    }
    
    // Get session context
    const { getOrCreateSessionContext } = await import('./api/context.js');
    const { saveSessionContext } = await import('./api/storage.js');
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    // Find the scene detail in the session context
    let sceneDetail = null;
    if (sessionContext.sceneDetails && sessionContext.sceneDetails[sceneId]) {
      sceneDetail = sessionContext.sceneDetails[sceneId];
    }
    
    // Validate that scene detail exists
    if (!sceneDetail) {
      return res.status(404).json({ error: 'Scene detail not found' });
    }
    
    // Check if already unlocked
    if (sceneDetail.status !== 'Locked') {
      return res.status(409).json({ error: 'Scene is not locked' });
    }
    
    // Unlock the scene - set to Edited (or Generated if unchanged from original generation)
    const unlockedDetail = {
      ...sceneDetail,
      status: 'Edited', // Assume edited since it was previously locked
      lockedAt: undefined,
      lastUpdatedAt: new Date().toISOString(),
      version: (sceneDetail.version || 0) + 1
    };
    
    // Update session context
    if (!sessionContext.sceneDetails) {
      sessionContext.sceneDetails = {};
    }
    sessionContext.sceneDetails[sceneId] = unlockedDetail;
    
    // Mark all later scenes as NeedsRegen
    const affectedScenes = [];
    if (sessionContext.sceneDetails) {
      const currentSceneOrder = sceneDetail.order || 0;
      
      for (const [otherSceneId, otherDetail] of Object.entries(sessionContext.sceneDetails)) {
        if (otherSceneId !== sceneId && otherDetail && otherDetail.order > currentSceneOrder) {
          // Mark as NeedsRegen
          const updatedDetail = {
            ...otherDetail,
            status: 'NeedsRegen',
            lastUpdatedAt: new Date().toISOString(),
            version: (otherDetail.version || 0) + 1
          };
          
          sessionContext.sceneDetails[otherSceneId] = updatedDetail;
          affectedScenes.push(otherSceneId);
        }
      }
    }
    
    sessionContext.updatedAt = new Date().toISOString();
    
    // Save to storage
    await saveSessionContext(sessionId, sessionContext);
    
    console.log(`Scene ${sceneId} unlocked for session ${sessionId}, affected scenes:`, affectedScenes);
    
    res.json({
      ok: true,
      detail: unlockedDetail,
      affectedScenes
    });
    
  } catch (error) {
    console.error('Error unlocking scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available:`);
  console.log(`   POST /api/projects`);
  console.log(`   GET  /api/projects`);
  console.log(`   DELETE /api/projects/:id`);
  console.log(`   POST /api/generate_chain`);
  console.log(`   POST /api/update_chain`);
  console.log(`   POST /api/generate_detail`);
  console.log(`   POST /api/apply_edit`);
  console.log(`   POST /api/propagate`);
  console.log(`   POST /api/generate_background`);
  console.log(`   POST /api/context/append`);
  console.log(`   GET  /api/context/get`);
  console.log(`   POST /api/context/clear`);
  console.log(`   POST /api/context/lock`);
  console.log(`   POST /api/chain/lock`);
  console.log(`   POST /api/chain/unlock`);
  console.log(`   POST /api/scene/lock`);
  console.log(`   POST /api/scene/unlock`);
  console.log(`   GET  /api/health`);
});
