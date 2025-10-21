export interface MacroScene {
  id: string;
  order: number;
  title: string;
  objective: string;
  meta?: {
    gmIntent?: string;
    generatedFrom?: string;
    generatedAt?: string;
  };
}

export interface Playstyle {
  roleplayPct?: number;
  combatPct?: number;
  improv?: boolean;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  race: string;
  class: string;
  personality: string; // 2–3 sentences
  motivation: string; // what drives them in the story
  connectionToStory: string; // direct link to background
  gmSecret: string; // hidden truth or past connection
  potentialConflict: string; // internal or external tension
  voiceTone: string; // how they speak or behave
  inventoryHint: string; // small symbolic item
  motifAlignment: string[]; // motifs from background
  backgroundHistory: string; // full backstory paragraph (1–2 short paragraphs)
  keyRelationships: string[]; // other people, factions, or NPCs they know
  flawOrWeakness: string; // defining flaw, vice, or vulnerability
}

export interface CharactersBlock {
  characters: Character[]; // 3–5
  locked: boolean;
  lockedAt?: string;
  version: number;
}

export interface MacroChain {
  chainId: string;
  scenes: MacroScene[];
  status: 'Draft' | 'Generated' | 'Edited' | 'Locked' | 'NeedsRegen';
  version: number;
  lockedAt?: string;
  lastUpdatedAt: string;
  meta?: {
    gameType?: string;
    players?: string;
    level?: string;
    playstyle?: Playstyle;
    isDraftIdeaBank?: boolean;
  };
}

export interface GenerateChainRequest {
  concept: string;
  meta?: {
    gameType?: string;
    players?: string;
    level?: string;
    playstyle?: Playstyle;
  };
}

export interface UpdateChainRequest {
  chainId: string;
  sessionId?: string;
  edits: Array<{
    type: 'reorder' | 'edit_title' | 'edit_objective' | 'delete_scene' | 'add_scene';
    sceneId?: string;
    newValue?: string;
    newOrder?: number;
    sceneData?: MacroScene;
  }>;
}

export interface TelemetryEvent {
  type: 'generate_chain' | 'update_chain' | 'reorder_scene' | 'edit_scene';
  chainId?: string;
  sceneId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Context-Aware Scene Detailing Types
export interface ContextOut {
  keyEvents: string[];
  revealedInfo: string[];
  stateChanges: Record<string, any>;
  npcRelationships?: Record<string, {
    trust_level: number;
    last_interaction: string;
    attitude: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  }>;
  environmentalState?: Record<string, any>;
  plotThreads?: Array<{
    thread_id: string;
    title: string;
    status: 'active' | 'resolved' | 'abandoned';
    description: string;
  }>;
  playerDecisions?: Array<{
    decision_id: string;
    context: string;
    choice: string;
    consequences: string[];
    impact_level: 'low' | 'medium' | 'high';
  }>;
}

export interface SceneDetail {
  sceneId: string;
  title: string;
  objective: string;
  keyEvents: string[];
  revealedInfo: string[];
  stateChanges: Record<string, any>;
  contextOut: ContextOut;
  status: 'Draft' | 'Generated' | 'Edited' | 'Locked' | 'NeedsRegen';
  version: number;
  lockedAt?: string;
  lastUpdatedAt: string;
  uses?: {
    backgroundV: number;
    charactersV: number;
    prevSceneV: Record<string, number>;
    version: number;
  };
  // Additional scene detail fields
  openingStateAndTrigger?: {
    state: string;
    trigger: string;
  };
  environmentAndSensory?: {
    visual: string[];
    auditory: string[];
    olfactory: string[];
    tactile_or_thermal: string[];
    other: string[];
  };
  epicIntro?: string;
  setting?: string;
  atmosphere?: string;
  gmNarrative?: string;
  beats?: string[];
  checks?: Array<{
    type: 'skill' | 'save';
    ability: string;
    skill: string;
    dnd_skill: string;
    dc_suggested_range: [number, number];
    dc: number;
    check_label: string;
    when: string;
    on_success: string;
    on_fail: string;
    advantage_hints: string[];
  }>;
  cluesAndForeshadowing?: {
    clues: string[];
    foreshadowing: string[];
  };
  npcMiniCards?: Array<{
    name: string;
    role: string;
    demeanor: string;
    quirk: string;
    goal: string;
    secret: string;
  }>;
  combatProbabilityAndBalance?: {
    likelihood: 'low' | 'medium' | 'high';
    enemies: string[];
    balance_notes: string;
    escape_or_alt_paths: string[];
  };
  exitConditionsAndTransition?: {
    exit_conditions: string[];
    transition_to_next: string;
  };
  rewards?: string[];
  skillChallenges?: Array<{
    skill: string;
    dc: number;
    trigger: string;
    success: string;
    failure: string;
    consequence: string;
  }>;
}

export interface EffectiveContext {
  keyEvents: string[];
  revealedInfo: string[];
  stateChanges: Record<string, any>;
  npcRelationships?: Record<string, any>;
  environmentalState?: Record<string, any>;
  plotThreads?: Array<any>;
  playerDecisions?: Array<any>;
}

export interface GenerateDetailRequest {
  sceneId: string;
  macroScene: MacroScene;
  effectiveContext: EffectiveContext;
}

export interface GenerateDetailResponse {
  ok: boolean;
  data: SceneDetail;
}

export interface LockSceneRequest {
  sessionId: string;
  sceneId: string;
}

export interface LockSceneResponse {
  ok: boolean;
  detail: SceneDetail;
}

export interface UnlockSceneRequest {
  sessionId: string;
  sceneId: string;
}

export interface UnlockSceneResponse {
  ok: boolean;
  detail: SceneDetail;
  affectedScenes: string[];
}

// Macro Chain Lock/Unlock Types
export interface LockChainRequest {
  sessionId: string;
  chainId: string;
}

export interface LockChainResponse {
  ok: boolean;
  chain: MacroChain;
}

export interface UnlockChainRequest {
  sessionId: string;
  chainId: string;
}

export interface UnlockChainResponse {
  ok: boolean;
  chain: MacroChain;
  affectedScenes: string[];
}

// Edit Delta & Impact Domain Types
export interface EditDelta {
  keysChanged: string[];
  summary: string;
}

export interface AffectedScene {
  sceneId: string;
  reason: string;
  severity: 'soft' | 'hard';
}

export interface ApplyEditRequest {
  sceneId: string;
  oldDetail: SceneDetail;
  newDetail: SceneDetail;
}

export interface ApplyEditResponse {
  ok: boolean;
  data: {
    updatedDetail: SceneDetail;
    delta: EditDelta;
    affectedScenes: AffectedScene[];
  };
}

export interface PropagateRequest {
  fromSceneIndex: number;
  chainId: string;
  affectedScenes: AffectedScene[];
}

export interface PropagateResponse {
  ok: boolean;
  data: {
    regenerationPlan: string[];
  };
}

// Context Memory Types
export interface Blueprint {
  theme?: string;
  core_idea?: string;
  tone?: string;
  pacing?: string;
  setting?: string;
  hooks?: string[];
}

export interface PlayerHook {
  name: string;
  class: string;
  motivation: string;
  ties: string[];
}

export interface WorldSeed {
  factions?: string[];
  locations?: string[];
  constraints?: string[];
}

export interface StylePreferences {
  language?: string;
  tone?: string;
  pacingHints?: string[];
  doNots?: string[];
}

export interface StoryConcept {
  concept: string;
  meta?: {
    gameType?: string;
    players?: string;
    level?: string;
    playstyle?: Playstyle;
  };
  timestamp: string;
}

export interface SessionContext {
  sessionId: string;
  blocks: {
    blueprint?: Blueprint;
    player_hooks?: PlayerHook[];
    world_seeds?: WorldSeed;
    style_prefs?: StylePreferences;
    custom?: Record<string, any>;
    background?: BackgroundData;
    story_concept?: StoryConcept;
    characters?: CharactersBlock;
    story_facts?: any[];
    world_state?: Record<string, any>;
  };
  locks?: {
    [key: string]: boolean;
  };
  meta?: {
    backgroundV: number;
    charactersV: number;
    macroSnapshotV?: number;
    updatedAt: string;
  };
  version: number;
  updatedAt: string;
  createdAt?: string;
  sceneDetails?: Record<string, SceneDetail>;
  macroChains?: Record<string, MacroChain>;
}

export interface BackgroundData {
  premise: string;
  tone_rules: string[];
  stakes: string[];
  mysteries: string[];
  factions: string[];
  location_palette: string[];
  npc_roster_skeleton: string[];
  motifs: string[];
  doNots: string[];
  playstyle_implications: string[];
}

export interface ContextAppendRequest {
  sessionId: string;
  blockType: 'blueprint' | 'player_hooks' | 'world_seeds' | 'style_prefs' | 'custom' | 'background' | 'story_concept' | 'characters';
  data: any;
}

export interface ContextGetRequest {
  sessionId: string;
}

export interface ContextAppendResponse {
  ok: boolean;
  data: SessionContext;
}

export interface ContextGetResponse {
  ok: boolean;
  data: SessionContext | null;
}

// Story Background Generator Types
export interface FiveWoneHItem {
  value: string;
  status: 'known' | 'unknown' | 'speculative';
  revealPlan: 'early' | 'mid' | 'late' | 'never';
  confidence: number; // 0.0 - 1.0
}

export interface FiveWoneH {
  who: FiveWoneHItem;
  what: FiveWoneHItem;
  where: FiveWoneHItem;
  when: FiveWoneHItem;
  why: FiveWoneHItem;
  how: FiveWoneHItem;
}

export interface StoryBackgroundItem {
  title: string;
  description: string;
}

export interface StoryBackground {
  fiveWoneH: FiveWoneH;
  backgroundSummary: string;
  anchors: string[];
  unknowns: StoryBackgroundItem[];
  gmSecrets: StoryBackgroundItem[];
  motifs: StoryBackgroundItem[];
  hooks: StoryBackgroundItem[];
  continuityFlags: string[];
  tone: string;
  pacing: string;
}

export interface GenerateBackgroundRequest {
  sessionId: string;
  concept: string;
  meta?: any;
}

export interface GenerateBackgroundResponse {
  ok: boolean;
  data: {
    background: BackgroundData;
  };
}

export interface ContextLockRequest {
  sessionId: string;
  blockType: string;
  locked: boolean;
}

export interface ContextLockResponse {
  ok: boolean;
  data: SessionContext;
}

// Project Types
export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
