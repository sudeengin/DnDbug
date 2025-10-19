import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIDirect() {
  console.log('🧪 Testing OpenAI Direct with Background Context');
  console.log('================================================');
  
  try {
    const prompt = `BACKGROUND_CONTEXT:
PREMISE: A mysterious fog has enveloped the town of Millbrook, and strange creatures have been sighted in the mist.

TONE_RULES (use these to set the emotional tone of scene titles):
- Use words like 'mysterious', 'creeping', 'whispered', 'haunting'
- Create an atmosphere of unease and dread

STAKES (connect each scene to these conflicts):
- The fog is spreading to neighboring towns
- People are disappearing in the mist

MYSTERIES (reveal these gradually through the scenes):
- What is the source of the fog?
- Why are the children behaving oddly?

LOCATIONS (choose from these places):
- The fog-covered town square of Millbrook
- The abandoned mill on the outskirts

NPCs (these characters should appear):
- Mayor Thompson (worried leader of Millbrook)
- Dr. Sarah Chen (town physician)

MOTIFS (weave these themes throughout):
- Thick, impenetrable fog
- Children's laughter in the distance

CONSTRAINTS (follow these rules):
- Don't reveal the source of the fog too early
- Don't make it too gory

PLAYSTYLE (consider these implications):
- Investigation-heavy gameplay
- Atmospheric descriptions are crucial

STORY_CONCEPT:
"""
The party investigates the mysterious fog in Millbrook and the strange behavior of the children
"""

STRUCTURAL_PREFERENCES:
{"gameType":"D&D","players":"4","level":"5"}

CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:
1. The BACKGROUND_CONTEXT above is your PRIMARY SOURCE for creating scenes. Use it extensively.
2. Each scene title MUST use words from the tone_rules and reference specific locations/NPCs from the background.
3. Each scene objective MUST connect to the specific stakes and mysteries from the background.
4. You MUST use the specific locations from the location_palette in your scene titles/objectives.
5. You MUST reference the specific NPCs from the npc_roster_skeleton in your scenes.
6. You MUST weave the specific motifs throughout the scene flow.
7. You MUST follow all constraints from the doNots list.
8. DO NOT create generic scenes - every scene must be clearly connected to the background context.

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

    console.log('\nSending prompt to OpenAI...');
    console.log('Prompt length:', prompt.length);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a D&D GM assistant. You MUST use the provided BACKGROUND_CONTEXT as the primary foundation for creating scene chains. The background context contains the story's premise, tone, mysteries, and world details that should drive every scene. 

CRITICAL: You MUST incorporate specific elements from the background context into your scene titles and objectives. Do not create generic scenes - use the specific locations, NPCs, mysteries, and tone from the background.

All text output must be in English. Use clear, natural language suitable for tabletop Game Masters. Do not use Turkish words or local idioms.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    console.log('\nOpenAI Response:');
    console.log('================');
    console.log(responseText);
    console.log('================');
    
    // Parse the response
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedResponse = JSON.parse(cleaned);
      
      console.log('\nParsed Response:');
      console.log(JSON.stringify(parsedResponse, null, 2));
      
      // Analyze the scenes
      if (parsedResponse.scenes) {
        console.log('\nScene Analysis:');
        const backgroundKeywords = [
          'millbrook', 'fog', 'mist', 'children', 'mysterious', 'creeping', 'haunting',
          'playground', 'town', 'investigation', 'strange', 'whispers', 'abandoned',
          'mayor', 'thompson', 'dr', 'chen', 'square'
        ];
        
        let contextUsage = 0;
        parsedResponse.scenes.forEach((scene, index) => {
          const sceneText = `${scene.title} ${scene.objective}`.toLowerCase();
          const foundKeywords = backgroundKeywords.filter(keyword => 
            sceneText.includes(keyword)
          );
          if (foundKeywords.length > 0) {
            contextUsage++;
            console.log(`  ✅ Scene ${index + 1}: "${scene.title}" - uses background: ${foundKeywords.join(', ')}`);
          } else {
            console.log(`  ❌ Scene ${index + 1}: "${scene.title}" - does NOT use background context`);
          }
        });
        
        console.log(`\n📊 Results:`);
        console.log(`   Scenes using background context: ${contextUsage}/${parsedResponse.scenes.length}`);
        console.log(`   Context usage rate: ${Math.round((contextUsage / parsedResponse.scenes.length) * 100)}%`);
      }
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testOpenAIDirect();
