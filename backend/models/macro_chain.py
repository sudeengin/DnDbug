"""
Pydantic models for macro chain, scenes, characters, and context
Converted from src/types/macro-chain.ts
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class MacroScene(BaseModel):
    """A scene in a macro chain"""
    id: str
    order: int
    title: str
    objective: str


class Playstyle(BaseModel):
    """Playstyle preferences"""
    roleplayPct: Optional[int] = None
    combatPct: Optional[int] = None
    improv: Optional[bool] = None


class Character(BaseModel):
    """A character in the story"""
    id: str
    name: str
    role: str
    race: str
    class_name: str = Field(alias="class")
    personality: str
    motivation: str
    connectionToStory: str
    gmSecret: str
    potentialConflict: str
    voiceTone: str
    inventoryHint: str
    motifAlignment: List[str]
    backgroundHistory: str
    keyRelationships: List[str]
    flawOrWeakness: str
    status: Optional[Literal["generated", "saved"]] = None
    languages: Optional[List[str]] = None
    alignment: Optional[str] = None
    deity: Optional[str] = None
    physicalDescription: Optional[str] = None
    equipmentPreferences: Optional[List[str]] = None
    subrace: Optional[str] = None
    age: Optional[int] = None
    height: Optional[str] = None
    proficiencies: Optional[List[str]] = None

    class Config:
        populate_by_name = True


class CharactersBlock(BaseModel):
    """Block containing characters"""
    characters: List[Character]
    locked: bool
    lockedAt: Optional[str] = None
    version: int


class MacroChain(BaseModel):
    """A macro chain of scenes"""
    chainId: str
    scenes: List[MacroScene]
    status: Literal["Draft", "Generated", "Edited", "Locked", "NeedsRegen"]
    version: int
    lockedAt: Optional[str] = None
    lastUpdatedAt: str
    meta: Optional[Dict[str, Any]] = None


class GenerateChainRequest(BaseModel):
    """Request to generate a macro chain"""
    concept: str
    meta: Optional[Dict[str, Any]] = None


class UpdateChainRequest(BaseModel):
    """Request to update a macro chain"""
    chainId: str
    sessionId: Optional[str] = None
    edits: List[Dict[str, Any]]


class ContextOut(BaseModel):
    """Context output from a scene"""
    keyEvents: List[str]
    revealedInfo: List[str]
    stateChanges: Dict[str, Any]
    npcRelationships: Optional[Dict[str, Any]] = None
    environmentalState: Optional[Dict[str, Any]] = None
    plotThreads: Optional[List[Dict[str, Any]]] = None
    playerDecisions: Optional[List[Dict[str, Any]]] = None


class SceneDetail(BaseModel):
    """Detailed information about a scene"""
    sceneId: str
    title: str
    objective: str
    keyEvents: List[str]
    revealedInfo: List[str]
    stateChanges: Dict[str, Any]
    contextOut: ContextOut
    status: Literal["Draft", "Generated", "Edited", "Locked", "NeedsRegen"]
    version: int
    lockedAt: Optional[str] = None
    lastUpdatedAt: str
    uses: Optional[Dict[str, Any]] = None
    openingStateAndTrigger: Optional[Dict[str, str]] = None
    environmentAndSensory: Optional[Dict[str, List[str]]] = None
    epicIntro: Optional[str] = None
    setting: Optional[str] = None
    atmosphere: Optional[str] = None
    gmNarrative: Optional[str] = None
    beats: Optional[List[str]] = None
    checks: Optional[List[Dict[str, Any]]] = None
    cluesAndForeshadowing: Optional[Dict[str, List[str]]] = None
    npcMiniCards: Optional[List[Dict[str, Any]]] = None
    combatProbabilityAndBalance: Optional[Dict[str, Any]] = None
    exitConditionsAndTransition: Optional[Dict[str, Any]] = None
    rewards: Optional[List[str]] = None
    skillChallenges: Optional[List[Dict[str, Any]]] = None


class EffectiveContext(BaseModel):
    """Effective context for scene generation"""
    keyEvents: List[str]
    revealedInfo: List[str]
    stateChanges: Dict[str, Any]
    npcRelationships: Optional[Dict[str, Any]] = None
    environmentalState: Optional[Dict[str, Any]] = None
    plotThreads: Optional[List[Any]] = None
    playerDecisions: Optional[List[Any]] = None


class GenerateDetailRequest(BaseModel):
    """Request to generate scene detail"""
    sceneId: str
    macroScene: MacroScene
    effectiveContext: EffectiveContext


class Blueprint(BaseModel):
    """Blueprint block"""
    theme: Optional[str] = None
    core_idea: Optional[str] = None
    tone: Optional[str] = None
    pacing: Optional[str] = None
    setting: Optional[str] = None
    hooks: Optional[List[str]] = None


class PlayerHook(BaseModel):
    """Player hook"""
    name: str
    class_name: str = Field(alias="class")
    motivation: str
    ties: List[str]
    
    class Config:
        populate_by_name = True


class WorldSeed(BaseModel):
    """World seed block"""
    factions: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    constraints: Optional[List[str]] = None


class StylePreferences(BaseModel):
    """Style preferences block"""
    language: Optional[str] = None
    tone: Optional[str] = None
    pacingHints: Optional[List[str]] = None
    doNots: Optional[List[str]] = None


class StoryConcept(BaseModel):
    """Story concept block"""
    concept: str
    meta: Optional[Dict[str, Any]] = None
    timestamp: str


class BackgroundData(BaseModel):
    """Background data block"""
    premise: str
    tone_rules: List[str]
    stakes: List[str]
    mysteries: List[str]
    factions: List[str]
    location_palette: List[str]
    npc_roster_skeleton: List[str]
    motifs: List[str]
    doNots: List[str]
    playstyle_implications: List[str]
    numberOfPlayers: Optional[int] = 4


class SessionContextBlocks(BaseModel):
    """Session context blocks"""
    blueprint: Optional[Blueprint] = None
    player_hooks: Optional[List[PlayerHook]] = None
    world_seeds: Optional[WorldSeed] = None
    style_prefs: Optional[StylePreferences] = None
    custom: Optional[Dict[str, Any]] = None
    background: Optional[BackgroundData] = None
    story_concept: Optional[StoryConcept] = None
    characters: Optional[CharactersBlock] = None
    story_facts: Optional[List[Any]] = None
    world_state: Optional[Dict[str, Any]] = None


class SessionContext(BaseModel):
    """Session context"""
    sessionId: str
    blocks: SessionContextBlocks = Field(default_factory=SessionContextBlocks)
    locks: Optional[Dict[str, bool]] = None
    meta: Optional[Dict[str, Any]] = None
    version: int = 0
    updatedAt: str
    createdAt: Optional[str] = None
    sceneDetails: Optional[Dict[str, SceneDetail]] = None
    macroChains: Optional[Dict[str, MacroChain]] = None


class ContextAppendRequest(BaseModel):
    """Request to append context"""
    sessionId: str
    blockType: Literal[
        "blueprint", "player_hooks", "world_seeds", "style_prefs",
        "custom", "background", "story_concept", "characters"
    ]
    data: Any


class Project(BaseModel):
    """Project model"""
    id: str
    title: str
    createdAt: str
    updatedAt: str

