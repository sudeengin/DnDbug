import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Startup validation - check critical imports
console.log('🔍 Validating critical imports...');
try {
  // Test critical API imports
  await import('./api/characters/generate.js');
  await import('./api/characters/upsert.js');
  await import('./api/characters/lock.js');
  await import('./api/generate_chain.js');
  await import('./api/lib/logger.js');
  await import('./api/lib/creativityTracker.js');
  console.log('✅ All critical imports validated successfully');
} catch (error) {
  console.error('\n🚨 STARTUP VALIDATION FAILED 🚨');
  console.error('═'.repeat(80));
  console.error('❌ Critical import failed:', error.message);
  
  if (error.message.includes('Cannot find module')) {
    console.error('🔍 MODULE RESOLUTION ERROR:');
    console.error('   Check import paths in the following files:');
    console.error('   - api/characters/*.js');
    console.error('   - api/lib/*.js');
    console.error('   - api/generate_chain.js');
    console.error('\n💡 Common fixes:');
    console.error('   - Use "../lib/logger.js" instead of "./lib/logger.js"');
    console.error('   - Use "../../lib/logger.js" for nested directories');
    console.error('   - Ensure all imported files exist');
  }
  
  console.error('\n📋 Full Error:');
  console.error(error.stack);
  console.error('═'.repeat(80));
  console.error('🛑 Server startup aborted due to import errors');
  process.exit(1);
}

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware - log all incoming POST/PUT/DELETE requests
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const bodyPreview = req.body ? JSON.stringify(req.body).substring(0, 150) : '';
    console.log(`📨 ${req.method} ${req.url} ${bodyPreview ? '- Body: ' + bodyPreview : ''}`);
  }
  next();
});

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

// Function to generate dynamic scenes based on concept using AI
async function generateDynamicScenes(concept) {
  const timestamp = Date.now();
  
  try {
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Generate 5-6 scenes for a D&D story based on this concept. Each scene should have a compelling title and clear objective.

Story Concept: "${concept}"

Return a JSON array with this exact structure:
[
  {
    "title": "Scene Title",
    "objective": "What the players need to accomplish in this scene"
  }
]

Requirements:
- Generate exactly 5-6 scenes
- Each scene should build upon the previous one
- Create a logical narrative progression
- Make titles evocative and engaging
- Make objectives clear and actionable
- Ensure scenes are appropriate for the story concept
- Vary the types of challenges (social, exploration, combat, investigation, etc.)

Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a D&D story expert. Generate compelling scenes that create engaging narratives for tabletop roleplaying games.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const scenes = JSON.parse(cleaned);
      
      if (!Array.isArray(scenes)) {
        throw new Error('Response is not an array');
      }
      
      // Generate scenes with dynamic IDs
      return scenes.map((scene, index) => ({
        id: `scene_${index + 1}_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
        order: index + 1,
        title: scene.title,
        objective: scene.objective
      }));
    } catch (parseError) {
      console.error('Failed to parse scene generation response:', parseError);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Error in AI scene generation:', error);
    throw new Error('Failed to generate scenes using AI');
  }
}

// API endpoints for local development
// Import the proper generate_chain handler - use dynamic import to avoid caching
app.post('/api/generate_chain', async (req, res) => {
  const { default: handler } = await import('./api/generate_chain.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/generate_next_scene', async (req, res) => {
  const { default: handler } = await import('./api/generate_next_scene.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/update_chain', async (req, res) => {
  try {
    const { chainId, edits, sessionId } = req.body;

    if (!chainId || !Array.isArray(edits)) {
      return res.status(400).json({ error: 'chainId and edits array are required' });
    }

    console.log('update_chain: Received request', { chainId, sessionId, editCount: edits.length });

    // Try to get the chain from session context first
    let chain = null;
    if (sessionId) {
      const { getOrCreateSessionContext } = await import('./api/context.js');
      const sessionContext = await getOrCreateSessionContext(sessionId);
      
      console.log('update_chain: Session context loaded', {
        hasBlocks: !!sessionContext.blocks,
        hasCustom: !!sessionContext.blocks?.custom,
        hasMacroChain: !!sessionContext.blocks?.custom?.macroChain,
        macroChainId: sessionContext.blocks?.custom?.macroChain?.chainId,
        hasMacroChains: !!sessionContext.macroChains,
        requestedChainId: chainId
      });
      
      // Check both locations: new location (blocks.custom.macroChain) and legacy location (macroChains)
      if (sessionContext.blocks?.custom?.macroChain?.chainId === chainId) {
        console.log('update_chain: Found chain in blocks.custom.macroChain');
        chain = sessionContext.blocks.custom.macroChain;
      } else if (sessionContext.macroChains && sessionContext.macroChains[chainId]) {
        console.log('update_chain: Found chain in macroChains');
        chain = sessionContext.macroChains[chainId];
      } else {
        console.log('update_chain: Chain not found in either location');
      }
    } else {
      console.log('update_chain: No sessionId provided');
    }

    // If not found in session context, return error
    if (!chain) {
      console.error('update_chain: Chain not found', { chainId, sessionId });
      return res.status(404).json({ 
        error: `Chain ${chainId} not found. Please generate a chain first.` 
      });
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
      const { updateSessionContext } = await import('./api/storage.js');
      
      console.log('update_chain: About to save chain with', chain.scenes.length, 'scenes');
      console.log('update_chain: Scene IDs:', chain.scenes.map(s => s.id));
      
      // Prepare the updates - only update the macroChain within custom block
      const updates = {
        blocks: {
          custom: {
            macroChain: chain
          }
        },
        macroChains: {
          [chainId]: chain
        }
      };
      
      try {
        await updateSessionContext(sessionId, updates);
        console.log(`✅ Macro chain ${chainId} updated successfully in session context for ${sessionId} with ${chain.scenes.length} scenes`);
      } catch (error) {
        console.error('❌ update_chain: Failed to update session context', error);
        return res.status(500).json({ error: 'Failed to update session context' });
      }
    } else {
      console.warn('⚠️  update_chain: No sessionId provided, changes will not be saved!');
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
    console.log('Generate detail API called with:', {
      sessionId: req.body.sessionId,
      sceneId: req.body.sceneId,
      hasSessionId: !!req.body.sessionId,
      bodyKeys: Object.keys(req.body)
    });
    
    const { sceneId, macroScene, effectiveContext } = req.body;

    if (!sceneId || !macroScene || !effectiveContext) {
      return res.status(400).json({ error: 'sceneId, macroScene, and effectiveContext are required' });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      return res.status(500).json({ 
        error: 'OpenAI API key is required for scene detail generation. Please configure OPENAI_API_KEY environment variable.' 
      });
    }

    // Use the actual AI generation logic from generate_detail.js
    const { generateSceneDetailForServer } = await import('./api/generate_detail.js');
    
    console.log('Using AI generation for scene detail:', {
      sessionId: req.body.sessionId,
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
      'GET /api/projects/:id',
      'POST /api/generate_chain',
      'POST /api/generate_next_scene',
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
      'POST /api/scene/unlock',
      'POST /api/scene/update',
      'POST /api/scene/delete',
      'POST /api/generate_next_scene'
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

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      return res.status(500).json({ 
        error: 'OpenAI API key is required for background generation. Please configure OPENAI_API_KEY environment variable.' 
      });
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
- numberOfPlayers: number (how many players will participate, default 4, range 3-6)

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

    // Validate numberOfPlayers - use meta value if provided, otherwise use parsed response or default
    const requestedPlayers = meta?.numberOfPlayers;
    console.log('numberOfPlayers validation:', {
      requestedPlayers,
      parsedResponseNumberOfPlayers: parsedResponse.numberOfPlayers,
      metaNumberOfPlayers: meta?.numberOfPlayers
    });
    
    if (typeof requestedPlayers === 'number' && requestedPlayers >= 3 && requestedPlayers <= 6) {
      parsedResponse.numberOfPlayers = requestedPlayers;
      console.log('Using requested numberOfPlayers:', requestedPlayers);
    } else if (typeof parsedResponse.numberOfPlayers !== 'number' || 
        parsedResponse.numberOfPlayers < 3 || 
        parsedResponse.numberOfPlayers > 6) {
      // Set default if invalid
      parsedResponse.numberOfPlayers = 4;
      console.log('Using default numberOfPlayers: 4');
    } else {
      console.log('Using parsed numberOfPlayers:', parsedResponse.numberOfPlayers);
    }

    // Save background to session context
    try {
      const { getOrCreateSessionContext } = await import('./api/context.js');
      const { saveSessionContext } = await import('./api/storage.js');
      const sessionContext = await getOrCreateSessionContext(sessionId);
      
      console.log('Session context before saving background:', {
        sessionId,
        hasBlocks: !!sessionContext.blocks,
        blocksKeys: sessionContext.blocks ? Object.keys(sessionContext.blocks) : []
      });
      
      // Store background in session context
      sessionContext.blocks = sessionContext.blocks || {};
      sessionContext.blocks.background = parsedResponse;
      sessionContext.version = (sessionContext.version || 0) + 1;
      sessionContext.updatedAt = new Date().toISOString();
      
      await saveSessionContext(sessionId, sessionContext);
      
      console.log('Background saved to session context:', {
        sessionId,
        hasBackground: !!sessionContext.blocks.background,
        numberOfPlayers: sessionContext.blocks.background?.numberOfPlayers,
        version: sessionContext.version
      });
    } catch (saveError) {
      console.error('Error saving background to session context:', saveError);
      // Don't fail the request, just log the error
    }

    // Log telemetry
    console.log('Telemetry: generate_background', {
      sessionId,
      conceptLength: concept.length,
      hasMeta: !!meta,
      numberOfPlayers: parsedResponse.numberOfPlayers,
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

app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        error: 'Project ID is required' 
      });
    }

    // Import the projects handler functions
    const { getProject } = await import('./api/projects.js');
    
    const project = getProject(id);
    
    if (!project) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    console.log('Project retrieved:', {
      id: project.id,
      title: project.title,
      timestamp: Date.now()
    });

    res.status(200).json({ 
      ok: true, 
      data: project 
    });

  } catch (error) {
    console.error('Error retrieving project:', error);
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

app.get('/api/context/health', async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'sessionId query parameter is required' 
      });
    }

    // Import the storage function
    const { loadSessionContext } = await import('./api/storage.js');
    
    const sessionContext = await loadSessionContext(sessionId);

    const health = {
      sessionId,
      exists: !!sessionContext,
      timestamp: new Date().toISOString()
    };

    if (sessionContext) {
      health.version = sessionContext.version;
      health.hasBackground = !!(sessionContext.blocks && sessionContext.blocks.background);
      health.hasCharacters = !!(sessionContext.blocks && sessionContext.blocks.characters);
      health.hasMacroChains = !!sessionContext.macroChains;
      health.macroChainCount = sessionContext.macroChains ? Object.keys(sessionContext.macroChains).length : 0;
      health.blocksCount = sessionContext.blocks ? Object.keys(sessionContext.blocks).length : 0;
      health.locks = sessionContext.locks || {};
      health.createdAt = sessionContext.createdAt;
      health.updatedAt = sessionContext.updatedAt;
    }

    console.log('Session health check:', health);

    res.status(200).json({ 
      ok: true, 
      data: health 
    });

  } catch (error) {
    console.error('Error in context/health:', error);
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
    
    // Use unified lock service
    const { lockChain } = await import('./api/lib/lockService.js');
    const { chain } = await lockChain(sessionId, chainId, true);
    
    res.json({
      ok: true,
      chain
    });
    
  } catch (error) {
    console.error('Error locking macro chain:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('already locked') ? 409 : 500;
    res.status(statusCode).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/chain/unlock', async (req, res) => {
  try {
    const { sessionId, chainId } = req.body;
    
    if (!sessionId || !chainId) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, chainId' });
    }
    
    // Use unified lock service
    const { lockChain } = await import('./api/lib/lockService.js');
    const { chain, sessionContext } = await lockChain(sessionId, chainId, false);
    
    // Collect affected scenes (all sceneDetails marked as NeedsRegen)
    const affectedScenes = [];
    if (sessionContext.sceneDetails) {
      for (const [sceneId, sceneDetail] of Object.entries(sessionContext.sceneDetails)) {
        if (sceneDetail && sceneDetail.status === 'NeedsRegen') {
          affectedScenes.push(sceneId);
        }
      }
    }
    
    res.json({
      ok: true,
      chain,
      affectedScenes
    });
    
  } catch (error) {
    console.error('Error unlocking macro chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check session context
app.get('/api/debug/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { getOrCreateSessionContext } = await import('./api/context.js');
    const sessionContext = await getOrCreateSessionContext(sessionId);
    
    res.json({
      sessionId,
      hasSceneDetails: !!sessionContext.sceneDetails,
      sceneDetailsKeys: sessionContext.sceneDetails ? Object.keys(sessionContext.sceneDetails) : [],
      sceneDetails: sessionContext.sceneDetails || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scene Lock/Unlock API Routes

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

// Scene Update API route
app.post('/api/scene/update', async (req, res) => {
  const { default: handler } = await import('./api/scene/update.js?' + Date.now());
  return handler(req, res);
});

// Scene Delete API route
app.post('/api/scene/delete', async (req, res) => {
  const { default: handler } = await import('./api/scene/delete.js?' + Date.now());
  return handler(req, res);
});

// Generate Next Scene API route
app.post('/api/generate_next_scene', async (req, res) => {
  const { default: handler } = await import('./api/generate_next_scene.js?' + Date.now());
  return handler(req, res);
});

// Health check endpoint
// Characters API routes
app.post('/api/characters/generate', async (req, res) => {
  const { default: handler } = await import('./api/characters/generate.js?' + Date.now());
  return handler(req, res);
});

app.get('/api/characters/list', async (req, res) => {
  const { default: handler } = await import('./api/characters/list.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/characters/lock', async (req, res) => {
  const { default: handler } = await import('./api/characters/lock.js?' + Date.now());
  return handler(req, res);
});

// Background lock endpoint - uses context/lock with blockType='background'
// This endpoint is maintained for backward compatibility but routes to context/lock
app.post('/api/background/lock', async (req, res) => {
  const { default: handler } = await import('./api/context/lock.js?' + Date.now());
  // Transform request to match context/lock format
  req.body = { ...req.body, blockType: 'background' };
  req.method = 'PATCH'; // context/lock uses PATCH
  return handler(req, res);
});

app.post('/api/characters/upsert', async (req, res) => {
  const { default: handler } = await import('./api/characters/upsert.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/characters/delete', async (req, res) => {
  const { default: handler } = await import('./api/characters/delete.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/characters/regenerate', async (req, res) => {
  const { default: handler } = await import('./api/characters/regenerate.js?' + Date.now());
  return handler(req, res);
});

// SRD 2014 Character endpoints
app.post('/api/characters/srd2014/save', async (req, res) => {
  const { default: handler } = await import('./api/characters/srd2014/save.js?' + Date.now());
  return handler(req, res);
});

app.get('/api/characters/srd2014/list', async (req, res) => {
  const { default: handler } = await import('./api/characters/srd2014/list.js?' + Date.now());
  return handler(req, res);
});

app.post('/api/characters/srd2014/delete', async (req, res) => {
  const { default: handler } = await import('./api/characters/srd2014/delete.js?' + Date.now());
  return handler(req, res);
});

// Test character generation endpoint
app.post('/api/test-character-generation', async (req, res) => {
  const { default: handler } = await import('./api/test-character-generation.js?' + Date.now());
  return handler(req, res);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Debug routes
app.use('/api/debug', (await import('./api/debug.js')).default);

// Global error handler for unhandled errors
app.use((error, req, res, next) => {
  // Enhanced error logging with module resolution detection
  const errorMessage = error.message || 'Unknown error';
  const errorStack = error.stack || '';
  
  // Detect module resolution errors
  const isModuleError = errorMessage.includes('Cannot find module') || 
                       errorMessage.includes('ERR_MODULE_NOT_FOUND') ||
                       errorMessage.includes('MODULE_NOT_FOUND');
  
  // Detect import/export errors
  const isImportError = errorMessage.includes('import') || 
                       errorMessage.includes('export') ||
                       errorMessage.includes('require');
  
  // Log with enhanced formatting
  console.error('\n🚨 SERVER ERROR DETECTED 🚨');
  console.error('═'.repeat(80));
  console.error(`❌ Error: ${errorMessage}`);
  console.error(`📍 URL: ${req.method} ${req.url}`);
  console.error(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  if (isModuleError) {
    console.error('🔍 MODULE RESOLUTION ERROR DETECTED:');
    console.error('   This appears to be an import/module path issue');
    console.error('   Check file paths and import statements');
  }
  
  if (isImportError) {
    console.error('📦 IMPORT/EXPORT ERROR DETECTED:');
    console.error('   This appears to be an ES module issue');
    console.error('   Check import/export syntax and file extensions');
  }
  
  console.error('\n📋 Full Error Stack:');
  console.error(errorStack);
  console.error('═'.repeat(80));
  
  // Send appropriate response
  res.status(500).json({ 
    error: errorMessage,
    type: isModuleError ? 'MODULE_RESOLUTION_ERROR' : 
          isImportError ? 'IMPORT_EXPORT_ERROR' : 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Handle 404s
app.use((req, res) => {
  console.warn(`⚠️  404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available:`);
  console.log(`   POST /api/projects`);
  console.log(`   GET  /api/projects`);
  console.log(`   GET  /api/projects/:id`);
  console.log(`   DELETE /api/projects/:id`);
  console.log(`   POST /api/generate_chain`);
  console.log(`   POST /api/generate_next_scene`);
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
  console.log(`   POST /api/scene/unlock`);
  console.log(`   POST /api/scene/update`);
  console.log(`   POST /api/scene/delete`);
  console.log(`   POST /api/generate_next_scene`);
  console.log(`   POST /api/characters/generate`);
  console.log(`   GET  /api/characters/list`);
  console.log(`   POST /api/characters/lock`);
  console.log(`   POST /api/characters/upsert`);
  console.log(`   POST /api/characters/regenerate`);
  console.log(`   POST /api/characters/srd2014/save`);
  console.log(`   GET  /api/characters/srd2014/list`);
  console.log(`   POST /api/characters/srd2014/delete`);
  console.log(`   POST /api/background/lock`);
  console.log(`   GET  /api/health`);
});
