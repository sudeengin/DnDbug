import OpenAI from 'openai'
import { 
  generateSkeletonV2, 
  createConversationMemory, 
  updateConversationMemory,
  type ConversationMemory
} from './genSkeleton.js'

// Example usage of the enhanced skeleton generation system
export async function exampleUsage() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  // Create initial conversation memory
  let memory = createConversationMemory()

  // Add some NPCs to the memory
  memory = updateConversationMemory(memory, {
    npcs: [
      {
        name: "Elder Thorne",
        personality: "Wise but secretive village elder",
        motivation: "Protect the village from ancient threats",
        relationship: "Trusted advisor to the party",
        last_interaction: "Warned about the cursed forest"
      },
      {
        name: "Captain Voss",
        personality: "Strict military commander",
        motivation: "Maintain order and discipline",
        relationship: "Suspicious of the party's intentions",
        last_interaction: "Questioned party about their business"
      }
    ],
    plot_threads: [
      {
        thread_id: "curse_forest",
        title: "The Cursed Forest Mystery",
        status: "active",
        description: "Ancient curse affecting the forest and its creatures",
        connections: ["village_protection", "ancient_artifacts"]
      }
    ],
    player_decisions: [
      {
        decision_id: "trust_elder",
        context: "Whether to trust Elder Thorne's warnings",
        choice: "Accepted the warning and prepared for danger",
        consequences: ["Gained village support", "Access to ancient knowledge"],
        impact_level: "high"
      }
    ]
  })

  // Example input for skeleton generation
  const input = {
    campaign_setting: "Medieval fantasy world with political intrigue",
    party_level: 5,
    session_focus: "Investigation and exploration",
    key_npcs: ["Elder Thorne", "Captain Voss"],
    current_location: "Village of Millbrook"
  }

  try {
    // Generate skeleton with enhanced features
    const skeleton = await generateSkeletonV2(
      client, 
      input, 
      memory, 
      0.8 // Temperature for creative but coherent content
    )

    console.log('Generated Skeleton:', JSON.stringify(skeleton, null, 2))
    
    // The skeleton will now include:
    // - Campaign lore and house rules context
    // - Conversation memory for NPCs and plot threads
    // - Structured outputs for stat blocks, encounters, and loot
    // - Temperature-controlled creative content

    return skeleton
  } catch (error) {
    console.error('Error generating skeleton:', error)
    throw error
  }
}

// Helper function to update memory after a session
export function updateMemoryAfterSession(
  memory: ConversationMemory,
  sessionEvents: {
    newNpcs?: Array<{
      name: string
      personality: string
      motivation: string
      relationship: string
      last_interaction: string
    }>
    plotUpdates?: Array<{
      thread_id: string
      status: 'active' | 'resolved' | 'abandoned'
      description: string
    }>
    newDecisions?: Array<{
      decision_id: string
      context: string
      choice: string
      consequences: string[]
      impact_level: 'low' | 'medium' | 'high'
    }>
  }
): ConversationMemory {
  let updatedMemory = memory

  if (sessionEvents.newNpcs) {
    updatedMemory = updateConversationMemory(updatedMemory, {
      npcs: [...memory.npcs, ...sessionEvents.newNpcs]
    })
  }

  if (sessionEvents.plotUpdates) {
    const updatedThreads = memory.plot_threads.map(thread => {
      const update = sessionEvents.plotUpdates?.find(u => u.thread_id === thread.thread_id)
      return update ? { ...thread, ...update } : thread
    })
    updatedMemory = updateConversationMemory(updatedMemory, {
      plot_threads: updatedThreads
    })
  }

  if (sessionEvents.newDecisions) {
    updatedMemory = updateConversationMemory(updatedMemory, {
      player_decisions: [...memory.player_decisions, ...sessionEvents.newDecisions]
    })
  }

  return updatedMemory
}
