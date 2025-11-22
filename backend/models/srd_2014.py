"""
Pydantic models for SRD 2014 character creation
Converted from src/types/srd-2014.ts
"""
from typing import Optional, List, Literal
from pydantic import BaseModel


class AbilityScores(BaseModel):
    """Ability scores"""
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int


class AbilityScoreModifiers(BaseModel):
    """Ability score modifiers"""
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int


class RaceTrait(BaseModel):
    """Race trait"""
    name: str
    description: str


class Subrace(BaseModel):
    """Subrace"""
    name: str
    abilityScoreIncrease: dict
    traits: List[RaceTrait]


class Race(BaseModel):
    """Race"""
    name: str
    subraces: Optional[List[Subrace]] = None
    abilityScoreIncrease: dict
    traits: List[RaceTrait]
    languages: List[str]
    speed: int
    size: Literal["Small", "Medium", "Large"]


class BackgroundFeature(BaseModel):
    """Background feature"""
    name: str
    description: str


class Background(BaseModel):
    """Background"""
    name: str
    skillProficiencies: List[str]
    toolProficiencies: List[str]
    languages: List[str]
    equipment: List[str]
    feature: BackgroundFeature
    personalityTraits: List[str]
    ideals: List[str]
    bonds: List[str]
    flaws: List[str]


class SRD2014Character(BaseModel):
    """SRD 2014 character"""
    id: str
    name: str
    level: int
    ruleset: Literal["SRD2014"] = "SRD2014"
    abilityScores: AbilityScores
    abilityScoreMethod: Literal["standard", "point-buy"]
    pointBuyTotal: Optional[int] = None
    race: Race
    subrace: Optional[Subrace] = None
    background: Background
    abilityModifiers: AbilityScoreModifiers
    storyCharacterId: Optional[str] = None
    customLanguages: Optional[List[str]] = None
    customProficiencies: Optional[List[str]] = None
    customAge: Optional[int] = None
    customHeight: Optional[str] = None
    customPhysicalDescription: Optional[str] = None
    customEquipmentPreferences: Optional[List[str]] = None
    createdAt: str
    updatedAt: str

