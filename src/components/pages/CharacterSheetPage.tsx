import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, ChevronRight, Save, Download, AlertCircle, Users, Plus, Lock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { SRD2014Character, AbilityScores, Race, Background } from '../../types/srd-2014';
import type { Character as StoryCharacter } from '../../types/macro-chain';
import { 
  calculateAbilityModifiers, 
  calculatePointBuyCost, 
  validateCharacter, 
  validateAbilityScores,
  SRD_RACES, 
  SRD_BACKGROUNDS,
  ABILITY_SCORE_NAMES 
} from '../../types/srd-2014';
import logger from '@/utils/logger';

const log = logger.character;

interface CharacterSheetPageProps {
  sessionId: string;
  context: any | null;
  onContextUpdate: (context: any) => void;
}

export default function CharacterSheetPage({ sessionId, context, onContextUpdate }: CharacterSheetPageProps) {
  const [character, setCharacter] = useState<SRD2014Character | null>(null);
  const [storyCharacters, setStoryCharacters] = useState<StoryCharacter[]>([]);
  const [savedSRDCharacters, setSavedSRDCharacters] = useState<SRD2014Character[]>([]);
  const [selectedStoryCharacterId, setSelectedStoryCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['core-info']));
  const [isEditing, setIsEditing] = useState(false);
  const [overrideRace, setOverrideRace] = useState(false);
  const [overrideBackground, setOverrideBackground] = useState(false);
  const [backgroundExplicit, setBackgroundExplicit] = useState(false);
  const [hasEditedScores, setHasEditedScores] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('CharacterSheetPage state:', {
      character: character ? character.name : 'null',
      storyCharacters: storyCharacters.length,
      savedSRDCharacters: savedSRDCharacters.length,
      selectedStoryCharacterId,
      isEditing
    });
    
    // Debug custom fields
    if (character) {
      console.log('Character custom fields:', {
        customLanguages: character.customLanguages,
        customProficiencies: character.customProficiencies,
        customAge: character.customAge,
        customHeight: character.customHeight,
        customPhysicalDescription: character.customPhysicalDescription,
        customEquipmentPreferences: character.customEquipmentPreferences
      });
    }
  }, [character, storyCharacters, savedSRDCharacters, selectedStoryCharacterId, isEditing]);

  // Load story characters and existing SRD characters on mount
  useEffect(() => {
    if (sessionId) {
      loadStoryCharacters();
      loadSRDCharacters();
    }
  }, [sessionId]);

  const loadStoryCharacters = async () => {
    try {
      const response = await fetch(`/api/characters/list?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.ok) {
        setStoryCharacters(data.list || []);
      } else {
        setError(data.error || 'Failed to load story characters');
      }
    } catch (err) {
      setError('Failed to load story characters');
      log.error('Error loading story characters:', err);
    }
  };

  const loadSRDCharacters = async () => {
    try {
      const response = await fetch(`/api/characters/srd2014/list?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.ok) {
        setSavedSRDCharacters(data.characters || []);
        console.log('Loaded saved SRD characters:', data.characters?.length || 0);
      } else {
        console.log('No saved SRD characters found or error:', data.error);
        setSavedSRDCharacters([]);
      }
    } catch (err) {
      console.error('Error loading SRD characters:', err);
      setSavedSRDCharacters([]);
    }
  };

  const validateCharacterData = (char: SRD2014Character) => {
    const errors = validateCharacter(char);
    setValidationErrors(errors);
  };

  const handleFieldChange = (field: keyof SRD2014Character, value: any) => {
    if (!character) return;

    const updatedCharacter = { ...character, [field]: value };
    
    // Recalculate ability modifiers if ability scores changed
    if (field === 'abilityScores') {
      updatedCharacter.abilityModifiers = calculateAbilityModifiers(value as AbilityScores);
    }
    
    // Recalculate point buy cost if using point buy
    if (field === 'abilityScores' && updatedCharacter.abilityScoreMethod === 'point-buy') {
      updatedCharacter.pointBuyTotal = calculatePointBuyCost(value as AbilityScores);
    }
    
    setCharacter(updatedCharacter);
    validateCharacterData(updatedCharacter);
  };

  const handleAbilityScoreChange = (ability: keyof AbilityScores, value: string) => {
    const numValue = parseInt(value) || 8;
    const newScores = { ...character!.abilityScores, [ability]: numValue };
    handleFieldChange('abilityScores', newScores);
    setHasEditedScores(true);
  };

  // Ability score UI helpers
  const ABILITY_DEFINITIONS: Record<keyof AbilityScores, string> = {
    strength: 'STR: Physical power. Impacts athletics, carry capacity, melee damage.',
    dexterity: 'DEX: Initiative, armor class, stealth, finesse/ranged weapons.',
    constitution: 'CON: Hit points, concentration checks, physical resilience.',
    intelligence: 'INT: Knowledge, investigation, and Wizard spellcasting.',
    wisdom: 'WIS: Perception, insight, survival, Cleric/Druid spellcasting.',
    charisma: 'CHA: Persuasion, deception, intimidation, Bard/Warlock/Paladin casting.'
  };

  const getNormalizedClass = (): string | null => {
    const story = selectedStoryCharacterId ? storyCharacters.find(c => c.id === selectedStoryCharacterId) : null;
    if (!story?.class) return null;
    return story.class.toLowerCase();
  };

  const getClassAdvice = (): string[] => {
    const c = getNormalizedClass();
    if (!c) return [
      'Assign higher scores to your core abilities to improve checks and combat effectiveness.',
    ];
    if (c.includes('wizard')) return [
      'As a Wizard, prioritize Intelligence for spell save DC and attack bonus.',
      'Secondary: Dexterity (AC/Initiative) or Constitution (HP/Concentration).'
    ];
    if (c.includes('fighter')) return [
      'As a Fighter, prioritize Strength for melee accuracy/damage.',
      'Secondary: Constitution for hit points and resilience.'
    ];
    if (c.includes('rogue')) return [
      'As a Rogue, prioritize Dexterity for attacks, AC, and stealth.',
      'Secondary: Intelligence or Wisdom depending on playstyle.'
    ];
    if (c.includes('cleric') || c.includes('druid') || c.includes('ranger') || c.includes('paladin') || c.includes('bard') || c.includes('warlock') || c.includes('sorcerer')) return [
      'Prioritize your class spellcasting ability (WIS/CHA/INT depending on class).',
      'Secondary: Constitution for HP and concentration.'
    ];
    return [
      'Assign higher scores to your core abilities to improve checks and combat effectiveness.'
    ];
  };

  const getSuggestedBackgroundsByClass = (): Array<{ name: string; reason: string }> => {
    const c = getNormalizedClass();
    if (!c) return [];
    if (c.includes('wizard')) return [
      { name: 'Sage', reason: 'Knowledge skills and lore fit arcane study.' },
      { name: 'Acolyte', reason: 'Religious study and languages support scholarly themes.' }
    ];
    if (c.includes('fighter')) return [
      { name: 'Soldier', reason: 'Martial background complements combat prowess.' },
      { name: 'Folk Hero', reason: 'Grounded story with useful tool proficiency.' }
    ];
    if (c.includes('rogue')) return [
      { name: 'Criminal', reason: 'Stealth and deception synergize with rogue skills.' },
      { name: 'Urchin', reason: 'Street knowledge and mobility tools.' }
    ];
    return [
      { name: 'Sage', reason: 'Broad knowledge benefits many classes.' },
      { name: 'Folk Hero', reason: 'General utility and story fit.' }
    ];
  };

  type Preset = { id: string; name: string; description: string; scores: Partial<AbilityScores> };
  const getClassPresets = (): Preset[] => {
    const presets: Preset[] = [];
    const c = getNormalizedClass();
    if (c?.includes('wizard')) {
      presets.push(
        { id: 'wiz-balanced', name: 'Balanced Wizard Build', description: 'High INT, solid DEX/CON.', scores: { intelligence: 15, dexterity: 14, constitution: 13, wisdom: 12, strength: 10, charisma: 8 } },
        { id: 'wiz-glass', name: 'High-INT Glass Cannon', description: 'Max INT, trade STR/CHA.', scores: { intelligence: 15, dexterity: 14, wisdom: 13, constitution: 12, charisma: 10, strength: 8 } },
        { id: 'wiz-controller', name: 'Tactical Controller', description: 'INT/WIS control focus.', scores: { intelligence: 15, wisdom: 14, constitution: 13, dexterity: 12, charisma: 10, strength: 8 } },
      );
    } else if (c?.includes('fighter')) {
      presets.push(
        { id: 'ftr-strength', name: 'Strength Bruiser', description: 'STR/CON frontline.', scores: { strength: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 } },
        { id: 'ftr-dex', name: 'DEX Duelist', description: 'DEX-based defense/attacks.', scores: { dexterity: 15, constitution: 14, wisdom: 13, strength: 12, intelligence: 10, charisma: 8 } },
        { id: 'ftr-balanced', name: 'Balanced Soldier', description: 'Even spread with STR/CON.', scores: { strength: 15, constitution: 14, wisdom: 13, dexterity: 12, intelligence: 10, charisma: 8 } },
      );
    } else {
      presets.push(
        { id: 'balanced-generic', name: 'Balanced Build', description: 'General-purpose spread.', scores: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 } }
      );
    }
    return presets;
  };

  const applyPreset = (preset: Preset) => {
    if (!character) return;
    const newScores: AbilityScores = {
      strength: preset.scores.strength ?? character.abilityScores.strength,
      dexterity: preset.scores.dexterity ?? character.abilityScores.dexterity,
      constitution: preset.scores.constitution ?? character.abilityScores.constitution,
      intelligence: preset.scores.intelligence ?? character.abilityScores.intelligence,
      wisdom: preset.scores.wisdom ?? character.abilityScores.wisdom,
      charisma: preset.scores.charisma ?? character.abilityScores.charisma,
    };
    handleFieldChange('abilityScores', newScores);
  };

  const classPresets = getClassPresets();
  const classAdvice = getClassAdvice();

  const handleRaceChange = (raceName: string) => {
    const selectedRace = SRD_RACES.find(r => r.name === raceName);
    if (selectedRace) {
      handleFieldChange('race', selectedRace);
      // Reset subrace when race changes
      handleFieldChange('subrace', undefined);
    }
  };

  const handleSubraceChange = (subraceName: string) => {
    if (!character?.race?.subraces) return;
    const selectedSubrace = character.race.subraces.find(s => s.name === subraceName);
    if (selectedSubrace) {
      handleFieldChange('subrace', selectedSubrace);
    }
  };

  const handleBackgroundChange = (backgroundName: string) => {
    const selectedBackground = SRD_BACKGROUNDS.find(b => b.name === backgroundName);
    if (selectedBackground) {
      handleFieldChange('background', selectedBackground);
      setBackgroundExplicit(true);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleSave = async () => {
    if (!character) return;

    setLoading(true);
    try {
      const response = await fetch('/api/characters/srd2014/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          character
        }),
      });

      const data = await response.json();

      if (data.ok) {
        log.info('Character saved successfully:', character);
        setIsEditing(false);
        setError(null);
        // Reload saved characters list
        await loadSRDCharacters();
      } else {
        setError(data.error || 'Failed to save character');
      }
    } catch (err) {
      setError('Failed to save character');
      log.error('Error saving character:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!character) return;

    const dataStr = JSON.stringify(character, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${character.name.replace(/\s+/g, '_')}_character_sheet.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const findBestRaceMatch = (storyRace: string): Race => {
    const raceLower = storyRace.toLowerCase();
    
    // Direct matches
    if (raceLower.includes('human')) return SRD_RACES[0]; // Human
    if (raceLower.includes('elf') || raceLower.includes('elven')) return SRD_RACES[1]; // Elf
    if (raceLower.includes('dwarf') || raceLower.includes('dwarven')) return SRD_RACES[2]; // Dwarf
    if (raceLower.includes('halfling') || raceLower.includes('hobbit')) return SRD_RACES[3]; // Halfling
    
    // Partial matches
    if (raceLower.includes('half-elf') || raceLower.includes('half elf')) return SRD_RACES[1]; // Elf
    if (raceLower.includes('half-orc') || raceLower.includes('half orc')) return SRD_RACES[0]; // Human (closest)
    if (raceLower.includes('gnome')) return SRD_RACES[3]; // Halfling (closest)
    if (raceLower.includes('dragonborn')) return SRD_RACES[0]; // Human (closest)
    if (raceLower.includes('tiefling')) return SRD_RACES[0]; // Human (closest)
    
    // Default to Human if no match
    return SRD_RACES[0];
  };

  const findBestBackgroundMatch = (storyChar: StoryCharacter): Background => {
    const backgroundText = `${storyChar.backgroundHistory} ${storyChar.role} ${storyChar.personality} ${storyChar.motivation}`.toLowerCase();
    
    // Acolyte keywords
    if (backgroundText.includes('temple') || backgroundText.includes('priest') || 
        backgroundText.includes('cleric') || backgroundText.includes('monastery') ||
        backgroundText.includes('faith') || backgroundText.includes('religious') ||
        backgroundText.includes('divine') || backgroundText.includes('acolyte') ||
        storyChar.role.toLowerCase().includes('priest') || storyChar.role.toLowerCase().includes('cleric')) {
      return SRD_BACKGROUNDS[0]; // Acolyte
    }
    
    // Criminal keywords
    if (backgroundText.includes('thief') || backgroundText.includes('rogue') ||
        backgroundText.includes('criminal') || backgroundText.includes('steal') ||
        backgroundText.includes('outlaw') || backgroundText.includes('bandit') ||
        backgroundText.includes('smuggler') || backgroundText.includes('assassin') ||
        storyChar.role.toLowerCase().includes('thief') || storyChar.role.toLowerCase().includes('rogue')) {
      return SRD_BACKGROUNDS[1]; // Criminal
    }
    
    // Folk Hero keywords
    if (backgroundText.includes('hero') || backgroundText.includes('champion') ||
        backgroundText.includes('defender') || backgroundText.includes('protector') ||
        backgroundText.includes('guardian') || backgroundText.includes('savior') ||
        backgroundText.includes('village') || backgroundText.includes('common') ||
        backgroundText.includes('peasant') || backgroundText.includes('farmer') ||
        storyChar.role.toLowerCase().includes('hero') || storyChar.role.toLowerCase().includes('champion')) {
      return SRD_BACKGROUNDS[2]; // Folk Hero
    }
    
    // Additional background matching based on role
    const roleLower = storyChar.role.toLowerCase();
    
    if (roleLower.includes('noble') || roleLower.includes('lord') || roleLower.includes('lady') ||
        roleLower.includes('duke') || roleLower.includes('count') || roleLower.includes('baron')) {
      return SRD_BACKGROUNDS[2]; // Folk Hero (closest available)
    }
    
    if (roleLower.includes('soldier') || roleLower.includes('warrior') || roleLower.includes('guard') ||
        roleLower.includes('knight') || roleLower.includes('paladin')) {
      return SRD_BACKGROUNDS[2]; // Folk Hero (closest available)
    }
    
    if (roleLower.includes('scholar') || roleLower.includes('sage') || roleLower.includes('wizard') ||
        roleLower.includes('researcher') || roleLower.includes('librarian')) {
      return SRD_BACKGROUNDS[0]; // Acolyte (closest available)
    }
    
    if (roleLower.includes('merchant') || roleLower.includes('trader') || roleLower.includes('guild')) {
      return SRD_BACKGROUNDS[1]; // Criminal (closest available)
    }
    
    // Default to Acolyte if no clear match
    return SRD_BACKGROUNDS[0];
  };

  const convertStoryCharacterToSRD = (storyChar: StoryCharacter): SRD2014Character => {
    console.log('Converting story character to SRD:', storyChar.name);
    console.log('Story character data:', {
      languages: storyChar.languages,
      proficiencies: storyChar.proficiencies,
      age: storyChar.age,
      height: storyChar.height,
      physicalDescription: storyChar.physicalDescription,
      equipmentPreferences: storyChar.equipmentPreferences
    });
    
    // Map story character race to SRD race - be more intelligent about matching
    const srdRace = findBestRaceMatch(storyChar.race);
    
    // Analyze background story to suggest appropriate SRD background
    const srdBackground = findBestBackgroundMatch(storyChar);

    const converted = {
      id: `srd_${storyChar.id}`,
      name: storyChar.name, // Keep the original name
      level: 1,
      ruleset: 'SRD2014' as const,
      abilityScores: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8
      },
      abilityScoreMethod: 'standard' as const,
      race: srdRace,
      background: srdBackground,
      abilityModifiers: calculateAbilityModifiers({
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8
      }),
      // Store reference to original story character
      storyCharacterId: storyChar.id,
      // Custom fields from story character
      customLanguages: storyChar.languages,
      customProficiencies: storyChar.proficiencies,
      customAge: storyChar.age,
      customHeight: storyChar.height,
      customPhysicalDescription: storyChar.physicalDescription,
      customEquipmentPreferences: storyChar.equipmentPreferences,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Converted SRD character:', converted);
    console.log('Custom fields in converted character:', {
      customLanguages: converted.customLanguages,
      customProficiencies: converted.customProficiencies,
      customAge: converted.customAge,
      customHeight: converted.customHeight,
      customPhysicalDescription: converted.customPhysicalDescription,
      customEquipmentPreferences: converted.customEquipmentPreferences
    });
    
    return converted;
  };

  const handleCreateFromStoryCharacter = (storyChar: StoryCharacter) => {
    console.log('Creating character sheet for:', storyChar.name);
    try {
      const srdCharacter = convertStoryCharacterToSRD(storyChar);
      console.log('Converted character:', srdCharacter);
      setCharacter(srdCharacter);
      setBackgroundExplicit(false);
      setSelectedStoryCharacterId(storyChar.id);
      validateCharacterData(srdCharacter);
      setIsEditing(true);
      console.log('Character state set, should show character sheet now');
    } catch (error) {
      console.error('Error creating character sheet:', error);
      setError('Failed to create character sheet');
    }
  };

  if (!character && storyCharacters.length === 0 && savedSRDCharacters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">No Characters Available</h2>
          <p className="text-gray-400 mb-6">
            Create and lock characters in the Characters tab first, then return here to create their SRD 2014 character sheets.
          </p>
          <div className="flex justify-center">
            <Button 
              onClick={() => window.location.hash = '#characters'} 
              variant="primary"
            >
              Go to Characters Tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!character && (storyCharacters.length > 0 || savedSRDCharacters.length > 0)) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Character Sheet</h1>
            <p className="text-gray-400 mt-2">
              Create SRD 2014 character sheets from your story characters or load existing saved sheets.
            </p>
          </div>
        </div>

        {/* Saved SRD Characters Section */}
        {savedSRDCharacters.length > 0 && (
          <Card className="bg-[#151A22] border border-[#2A3340] rounded-2xl shadow-md shadow-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-lg font-semibold">
                <Save className="w-5 h-5" />
                Saved Character Sheets ({savedSRDCharacters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedSRDCharacters.map((srdChar) => (
                  <div key={srdChar.id} className="bg-[#1C1F2B] border border-[#2A3340] rounded-2xl p-5 cursor-pointer transition-colors shadow-md shadow-black/40">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white text-lg">{srdChar.name}</h3>
                      <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">
                        Level {srdChar.level}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div><span className="font-medium text-gray-400">Race:</span> {srdChar.race.name}</div>
                      <div><span className="font-medium text-gray-400">Background:</span> {srdChar.background.name}</div>
                      {srdChar.subrace && (
                        <div><span className="font-medium text-gray-400">Subrace:</span> {srdChar.subrace.name}</div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setCharacter(srdChar);
                          validateCharacterData(srdChar);
                        }}
                        className="flex-1 rounded-xl"
                      >
                        Load Sheet
                      </Button>
                      <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => {
                          const dataStr = JSON.stringify(srdChar, null, 2);
                          const dataBlob = new Blob([dataStr], {type: 'application/json'});
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `${srdChar.name}_character_sheet.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="rounded-xl"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Story Characters Section */}
        {storyCharacters.length > 0 && (
          <Card className="bg-[#151A22] border border-[#2A3340] rounded-2xl shadow-md shadow-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-lg font-semibold">
                <Users className="w-5 h-5" />
                Create New Character Sheet from Story Characters ({storyCharacters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storyCharacters.map((storyChar) => {
                  const suggestedRace = findBestRaceMatch(storyChar.race);
                  const suggestedBackground = findBestBackgroundMatch(storyChar);
                  
                  return (
                    <Card key={storyChar.id} className="cursor-pointer transition-shadow bg-[#151A22] border border-[#2A3340] rounded-2xl shadow-md shadow-black/40">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white font-semibold">{storyChar.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">{storyChar.race}</Badge>
                          <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">{storyChar.class}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Role</Label>
                          <p className="text-sm text-gray-300">{storyChar.role}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Personality</Label>
                          <p className="text-sm text-gray-300 line-clamp-2">{storyChar.personality}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Motivation</Label>
                          <p className="text-sm text-gray-300 line-clamp-2">{storyChar.motivation}</p>
                        </div>
                        
                        {/* Suggested SRD Choices */}
                        <div className="bg-[#1C1F2B] text-gray-300 rounded-xl border border-[#2A3340] px-4 py-2">
                          <div className="text-sm font-semibold text-white">Suggested SRD Choices</div>
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-gray-400">
                              <span className="font-medium">Race:</span> {suggestedRace.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              <span className="font-medium">Background:</span> {suggestedBackground.name}
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            console.log('Button clicked for character:', storyChar.name);
                            handleCreateFromStoryCharacter(storyChar);
                          }}
                          variant="primary"
                          className="w-full rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Character Sheet
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
          <div className="flex">
            <Users className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-white">Character Sheet Creation</h3>
              <div className="mt-2 text-sm text-gray-300">
                <p>Select a character above to create their SRD 2014 character sheet. The system will intelligently suggest appropriate race and background based on the character's story details. You can then customize the mechanical aspects while preserving the narrative elements.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Character Sheet</h2>
          <p className="text-gray-400 mt-1">
            View and edit your SRD 2014 character details
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">
            {character.ruleset}
          </Badge>
          <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">
            Level {character.level}
          </Badge>
          {validationErrors.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {validationErrors.length} Error{validationErrors.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-[#2A3340] border border-[#2A3340] rounded-xl p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-white">Validation Errors</h3>
              <div className="mt-2 text-sm text-gray-300">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 items-center">
        <Button
          onClick={() => {
            setCharacter(null);
            setSelectedStoryCharacterId(null);
            setIsEditing(false);
          }}
          variant="secondary"
        >
          Back to Selection
        </Button>
        
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "secondary" : "primary"}
          className="rounded-lg px-4 py-2 text-sm"
        >
          {isEditing ? 'View Mode' : 'Edit Mode'}
        </Button>
        
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={loading || validationErrors.length > 0}
            variant="primary"
            className="rounded-lg px-4 py-2 text-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Character'}
          </Button>
        )}
        
        <Button
          onClick={handleExport}
          variant="primary"
          className="rounded-lg px-4 py-2 text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      {/* Character Sheet Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Step 1: Background Selection */}
        <Card id="step-1-background" className="lg:col-span-2 bg-[#151A22] border border-[#2A3340] rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold text-white">Step 1: Choose a Background</div>
            <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">Background: {backgroundExplicit ? character.background.name : 'Not Selected'}</Badge>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SRD_BACKGROUNDS.map(bg => (
                <div
                  key={bg.name}
                  className={`bg-[#131A24] border rounded-xl p-4 ${character.background.name === bg.name ? 'border-[#7c63e5]' : 'border-[#2A3340]'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-semibold">{bg.name}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        {bg.feature?.name ? (
                          <span>Feature: {bg.feature.name}</span>
                        ) : (
                          <span>Background option</span>
                        )}
                      </div>
                    </div>
                    {character.background.name === bg.name && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <Badge variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">Selected</Badge>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 space-y-1">
                    {bg.skillProficiencies?.length > 0 && (
                      <div><span className="text-gray-500">Skills:</span> {bg.skillProficiencies.join(', ')}</div>
                    )}
                    {bg.toolProficiencies?.length > 0 && (
                      <div><span className="text-gray-500">Tools:</span> {bg.toolProficiencies.join(', ')}</div>
                    )}
                    {bg.languages?.length > 0 && (
                      <div><span className="text-gray-500">Languages:</span> {bg.languages.join(', ')}</div>
                    )}
                    {bg.feature?.description && (
                      <div className="line-clamp-3"><span className="text-gray-500">About:</span> {bg.feature.description}</div>
                    )}
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant={character.background.name === bg.name ? 'primary' : 'secondary'}
                      onClick={() => {
                        handleBackgroundChange(bg.name);
                        setTimeout(() => {
                          const el = document.getElementById('step-2-ability-scores');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      }}
                    >
                      {character.background.name === bg.name ? 'Selected' : `Select ${bg.name}`}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Step 2: Ability Scores (locked until background chosen) */}
        <Card id="step-2-ability-scores" className={`relative lg:col-span-2 bg-[#121722] border-2 rounded-2xl shadow-xl ${!backgroundExplicit ? 'border-[#2A3340] opacity-60' : 'border-[#7c63e5]/40 shadow-[#7c63e5]/10'}`}>
          <Collapsible 
            open={expandedSections.has('ability-scores')} 
            onOpenChange={() => backgroundExplicit && toggleSection('ability-scores')}
          >
            <CollapsibleTrigger asChild disabled={!backgroundExplicit}>
              <CardHeader className={`transition-colors rounded-t-2xl ${backgroundExplicit ? 'cursor-pointer group hover:bg-[#1A1F2E]' : 'cursor-not-allowed'}`}>
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="group-hover:underline underline-offset-4">Step 2: Assign Ability Scores</span>
                  </div>
                  {expandedSections.has('ability-scores') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className={`space-y-6 text-left max-w-[960px] p-6 md:p-8 ${!backgroundExplicit ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Context summary */}
                {(() => {
                  const storyChar = selectedStoryCharacterId ? storyCharacters.find(c => c.id === selectedStoryCharacterId) : null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
                        <div className="text-xs text-gray-400 flex items-center gap-2">Current</div>
                        <div className="mt-2 text-sm text-gray-300"><span className="text-gray-400">Race:</span> <span className="text-white font-medium">{character.race.name}</span></div>
                      </div>
                      <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
                        <div className="text-xs text-gray-400 flex items-center gap-2">Current</div>
                        <div className="mt-2 text-sm text-gray-300"><span className="text-gray-400">Background:</span> <span className="text-white font-medium">{character.background.name}</span></div>
                      </div>
                      <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
                        <div className="text-xs text-gray-400 flex items-center gap-2">Current</div>
                        <div className="mt-2 text-sm text-gray-300"><span className="text-gray-400">Class:</span> <span className="text-white font-medium">{selectedStoryCharacterId ? (storyCharacters.find(c => c.id === selectedStoryCharacterId)?.class || '—') : '—'}</span></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Suggestions header */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-300">Based on your Race, Class, and Background, here are suggested scores. Modify below or assign manually.</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="primary" onClick={() => { const p = classPresets[0]; if (p) applyPreset(p); }}>Auto-Fill Suggestions</Button>
                    <Button size="sm" variant="secondary">Manual Entry</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-400">Method: {character.abilityScoreMethod === 'standard' ? 'Standard Array' : 'Point Buy'}</Label>
                  {character.abilityScoreMethod === 'point-buy' && character.pointBuyTotal && (
                    <Badge variant="outline" className="bg-[#2A3340] text-gray-300 border-0">
                      {character.pointBuyTotal}/27 points
                    </Badge>
                  )}
                </div>

                {/* Class Tips and Presets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 bg-[#131A24] border border-[#2A3340] rounded-xl p-4">
                    <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Class Tips</div>
                    <div className="text-xs text-gray-300 space-y-2">
                      {classAdvice.map((tip, idx) => (
                        <div key={idx}>• {tip}</div>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 bg-[#131A24] border border-[#2A3340] rounded-xl p-4">
                    <div className="text-sm font-semibold text-white mb-3">Suggested Presets</div>
                    <div className="flex flex-col gap-3">
                      {classPresets.map(p => (
                        <div key={p.id} className="flex items-start justify-between gap-3 bg-[#161D28] border border-[#2A3340] rounded-lg p-3">
                          <div>
                            <div className="text-sm text-white font-medium">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.description}</div>
                            <div className="mt-2 text-xs text-gray-300">
                              {(['strength','dexterity','constitution','intelligence','wisdom','charisma'] as (keyof AbilityScores)[]).map((ab, i) => (
                                <span key={ab} className="mr-3">
                                  <span className="uppercase text-gray-400">{ab.slice(0,3)}</span>: <span className="text-white font-semibold">{p.scores[ab] ?? '-'}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="primary" onClick={() => applyPreset(p)}>Apply</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ABILITY_SCORE_NAMES.map(ability => (
                    <div key={ability} className="space-y-2">
                      <Label htmlFor={ability} className="capitalize text-sm text-gray-400 flex items-center gap-1">
                        {ability}
                        <span title={ABILITY_DEFINITIONS[ability as keyof AbilityScores]}>
                          <Info className="w-3 h-3 text-gray-500" aria-label="Ability info" />
                        </span>
                      </Label>
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <Input
                            id={ability}
                            type="number"
                            min="8"
                            max="15"
                            value={character.abilityScores[ability]}
                            onChange={(e) => handleAbilityScoreChange(ability, e.target.value)}
                            className="w-16 bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5]"
                          />
                        ) : (
                          <div className="w-16 text-center text-lg font-semibold text-white">
                            {character.abilityScores[ability]}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          ({character.abilityModifiers[ability] >= 0 ? '+' : ''}{character.abilityModifiers[ability]})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
              {/* Lock overlay */}
              {!backgroundExplicit && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-[#0f131b]/90 border border-[#2A3340] text-gray-200 text-sm rounded-lg px-4 py-3">
                    Please select a background to unlock ability score assignment suggestions.
                  </div>
                </div>
              )}
        </Card>
        
        {/* Story Character Reference */}
        {selectedStoryCharacterId && (
          <Card className="lg:col-span-2 bg-[#151A22] border border-[#2A3340] rounded-xl shadow-lg shadow-black/40">
            <Collapsible 
              open={expandedSections.has('story-reference')} 
              onOpenChange={() => toggleSection('story-reference')}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer group hover:bg-[#1C1F2B] transition-colors rounded-t-xl">
                  <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2 group-hover:text-[#7c63e5]">
                    <span>Story Character Reference</span>
                    {expandedSections.has('story-reference') ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 text-left max-w-[760px] p-6 md:p-8">
                  {(() => {
                    const storyChar = storyCharacters.find(c => c.id === selectedStoryCharacterId);
                    if (!storyChar) return null;
                    
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Original Role</div>
                            <div className="text-base text-gray-100">{storyChar.role}</div>
                          </div>
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Class</div>
                            <div className="text-base text-gray-100">{storyChar.class}</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-gray-400">Personality</div>
                          <div className="text-base text-gray-100">{storyChar.personality}</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-gray-400">Motivation</div>
                          <div className="text-base text-gray-100">{storyChar.motivation}</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-gray-400">Connection to Story</div>
                          <div className="text-base text-gray-100">{storyChar.connectionToStory}</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-gray-400">Background History</div>
                          <div className="text-base text-gray-100">{storyChar.backgroundHistory}</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-gray-400">Flaw or Weakness</div>
                          <div className="text-base text-gray-100">{storyChar.flawOrWeakness}</div>
                        </div>
                        
                        {storyChar.keyRelationships.length > 0 && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Key Relationships</div>
                            <div className="text-base text-gray-100 space-y-1">
                              {storyChar.keyRelationships.map((rel, index) => (
                                <div key={index}>• {rel}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Additional SRD Fields */}
                        {storyChar.languages && storyChar.languages.length > 0 && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Languages</div>
                            <div className="text-base text-gray-100">{storyChar.languages.join(', ')}</div>
                          </div>
                        )}
                        
                        {storyChar.alignment && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Alignment</div>
                            <div className="text-base text-gray-100">{storyChar.alignment}</div>
                          </div>
                        )}
                        
                        {storyChar.deity && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Deity</div>
                            <div className="text-base text-gray-100">{storyChar.deity}</div>
                          </div>
                        )}
                        
                        {storyChar.physicalDescription && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Physical Description</div>
                            <div className="text-base text-gray-100">{storyChar.physicalDescription}</div>
                          </div>
                        )}
                        
                        {storyChar.equipmentPreferences && storyChar.equipmentPreferences.length > 0 && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Equipment Preferences</div>
                            <div className="text-base text-gray-100 space-y-1">
                              {storyChar.equipmentPreferences.map((item, index) => (
                                <div key={index}>• {item}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {storyChar.subrace && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-400">Subrace</div>
                            <div className="text-base text-gray-100">{storyChar.subrace}</div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
        
        {/* Core Info Section */}
        <Card className="bg-[#151A22] border border-[#2A3340] rounded-xl shadow-lg shadow-black/40">
          <Collapsible 
            open={expandedSections.has('core-info')} 
            onOpenChange={() => toggleSection('core-info')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer group hover:bg-[#1C1F2B] transition-colors rounded-t-xl">
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2 group-hover:text-[#7c63e5]">
                  <span className="group-hover:underline underline-offset-4">Core Information</span>
                  {expandedSections.has('core-info') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 text-left max-w-[760px] p-6 md:p-8">
                <div>
                  <Label htmlFor="name" className="text-sm text-gray-400">Character Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={character.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-4 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5]"
                    />
                  ) : (
                    <div className="text-base text-gray-100">{character.name}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="level" className="text-sm text-gray-400 flex items-center gap-1">Level <span title="Level affects hit points, spell slots, and features granted by your class."><Info className="w-3 h-3 text-gray-500" /></span></Label>
                    {isEditing ? (
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        max="20"
                        value={character.level}
                        onChange={(e) => {
                          const storyChar = selectedStoryCharacterId ? storyCharacters.find(c => c.id === selectedStoryCharacterId) : null;
                          if (!storyChar?.class) {
                            console.warn('Please choose a class before adjusting level.');
                          }
                          handleFieldChange('level', parseInt(e.target.value) || 1)
                        }}
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-4 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5]"
                      />
                    ) : (
                      <div className="text-base text-gray-100">{character.level}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="ruleset" className="text-sm text-gray-400">Ruleset</Label>
                    <div className="text-base text-gray-100">{character.ruleset}</div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="race" className="text-sm text-gray-400">Race</Label>
                  {overrideRace ? (
                    <Select value={character.race.name} onValueChange={handleRaceChange}>
                      <SelectTrigger className="bg-[#1C1F2B] text-white border border-[#2A3340] rounded-lg focus:ring-[#7c63e5] focus:border-[#7c63e5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1C1F2B] text-gray-300 border border-[#2A3340] max-h-64 overflow-auto">
                        {SRD_RACES.map(race => (
                          <SelectItem key={race.name} value={race.name}>{race.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-white">{character.race.name}</div>
                      <Button size="sm" variant="secondary" className="h-7 px-2 py-1" onClick={() => setOverrideRace(true)}>Change</Button>
                    </div>
                  )}
                </div>

                {character.subrace && (
                  <div>
                    <Label htmlFor="subrace" className="text-sm text-gray-400">Subrace</Label>
                    {isEditing ? (
                      <Select value={character.subrace.name} onValueChange={handleSubraceChange}>
                        <SelectTrigger className="bg-[#1C1F2B] text-white border border-[#2A3340] rounded-lg focus:ring-[#7c63e5] focus:border-[#7c63e5]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1C1F2B] text-gray-300 border border-[#2A3340]">
                          {character.race.subraces?.map(subrace => (
                            <SelectItem key={subrace.name} value={subrace.name}>{subrace.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-lg font-semibold text-white">{character.subrace.name}</div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="background" className="text-sm text-gray-400">Background</Label>
                  {overrideBackground ? (
                    <Select value={character.background.name} onValueChange={handleBackgroundChange}>
                      <SelectTrigger className="bg-[#1C1F2B] text-white border border-[#2A3340] rounded-lg focus:ring-[#7c63e5] focus:border-[#7c63e5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1C1F2B] text-gray-300 border border-[#2A3340] max-h-64 overflow-auto">
                        {SRD_BACKGROUNDS.map(background => (
                          <SelectItem key={background.name} value={background.name}>{background.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-white">{character.background.name}</div>
                      <Button size="sm" variant="secondary" className="h-7 px-2 py-1" onClick={() => setOverrideBackground(true)}>Change</Button>
                    </div>
                  )}
                </div>

                {/* Custom Fields from Story Character */}
                {(character.customAge || character.customHeight || character.customPhysicalDescription) && (
                  <div className="border-t border-[#2A3340] pt-4 mt-4">
                    <h4 className="text-sm font-medium text-white mb-3">Story Character Details</h4>
                    
                    {character.customAge && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-400">Age</Label>
                        <div className="text-sm text-gray-300">{character.customAge} years</div>
                      </div>
                    )}
                    
                    {character.customHeight && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-400">Height</Label>
                        <div className="text-sm text-gray-300">{character.customHeight}</div>
                      </div>
                    )}
                    
                    {character.customPhysicalDescription && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-400">Physical Description</Label>
                        <div className="text-sm text-gray-300">{character.customPhysicalDescription}</div>
                      </div>
                    )}
                    
                    {character.customEquipmentPreferences && character.customEquipmentPreferences.length > 0 && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-400">Equipment Preferences</Label>
                        <div className="text-sm text-gray-300">
                          {character.customEquipmentPreferences.map((item, index) => (
                            <div key={index}>• {item}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* (Explanations moved to step sections) */}

              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        

        {/* Race Details Section */}
        <Card className="bg-[#151A22] border border-[#2A3340] rounded-xl shadow-lg shadow-black/40">
          <Collapsible 
            open={expandedSections.has('race-details')} 
            onOpenChange={() => toggleSection('race-details')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer group hover:bg-[#1C1F2B] transition-colors rounded-t-xl">
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2 group-hover:text-[#7c63e5]">
                  <span className="group-hover:underline underline-offset-4">Race Details</span>
                  {expandedSections.has('race-details') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 text-left max-w-[760px] p-6 md:p-8">
                <div>
                  <Label className="text-sm text-gray-400">Ability Score Increases</Label>
                  <div className="text-sm text-gray-300">
                    {Object.entries(character.race.abilityScoreIncrease).map(([ability, bonus]) => (
                      <div key={ability} className="capitalize">
                        {ability}: +{bonus}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Traits</Label>
                  <div className="space-y-2">
                    {character.race.traits.map((trait, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-white">{trait.name}</div>
                        <div className="text-gray-300">{trait.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Languages</Label>
                  <div className="text-sm text-gray-300">
                    {character.race.languages.join(', ')}
                  </div>
                </div>
                
                {/* Custom Languages from Story Character */}
                {character.customLanguages && character.customLanguages.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-400">Story Languages</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.customLanguages.map((language, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-sm text-gray-400">Speed</Label>
                    <div className="text-gray-300">{character.race.speed} ft.</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Size</Label>
                    <div className="text-gray-300">{character.race.size}</div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Background Details Section */}
        <Card className="bg-[#151A22] border border-[#2A3340] rounded-xl shadow-lg shadow-black/40">
          <Collapsible 
            open={expandedSections.has('background-details')} 
            onOpenChange={() => toggleSection('background-details')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer group hover:bg-[#1C1F2B] transition-colors rounded-t-xl">
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2 group-hover:text-[#7c63e5]">
                  <span className="group-hover:underline underline-offset-4">Background Details</span>
                  {expandedSections.has('background-details') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 text-left max-w-[760px] p-6 md:p-8">
                <div>
                  <Label className="text-sm text-gray-400">Skill Proficiencies</Label>
                  <div className="text-sm text-gray-300">
                    {character.background.skillProficiencies.join(', ')}
                  </div>
                </div>
                
                {character.background.toolProficiencies.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-400">Tool Proficiencies</Label>
                    <div className="text-sm text-gray-300">
                      {character.background.toolProficiencies.join(', ')}
                    </div>
                  </div>
                )}
                
                {character.background.languages.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-400">Languages</Label>
                    <div className="text-sm text-gray-300">
                      {character.background.languages.join(', ')}
                    </div>
                  </div>
                )}
                
                {/* Custom Proficiencies from Story Character */}
                {character.customProficiencies && character.customProficiencies.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-400">Story Proficiencies</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.customProficiencies.map((proficiency, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-[#2A3340] text-gray-300 border-0">
                          {proficiency}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm text-gray-400">Equipment</Label>
                  <div className="text-sm text-gray-300 space-y-1">
                    {character.background.equipment.map((item, index) => (
                      <div key={index}>• {item}</div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Feature: {character.background.feature.name}</Label>
                  <div className="text-sm text-gray-300">
                    {character.background.feature.description}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
}
