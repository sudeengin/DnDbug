export interface MacroScene {
  id: string;
  order: number;
  title: string;
  objective: string;
}

export interface Playstyle {
  roleplayPct?: number;
  combatPct?: number;
  improv?: boolean;
}

export interface MacroChain {
  chainId: string;
  scenes: MacroScene[];
  meta?: {
    gameType?: string;
    players?: string;
    level?: string;
    playstyle?: Playstyle;
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
  edits: Array<{
    type: 'reorder' | 'edit_title' | 'edit_objective';
    sceneId: string;
    newValue?: string;
    newOrder?: number;
  }>;
}

export interface TelemetryEvent {
  type: 'generate_chain' | 'update_chain' | 'reorder_scene' | 'edit_scene';
  chainId?: string;
  sceneId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
