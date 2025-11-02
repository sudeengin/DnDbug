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
import BackgroundSelector from '../BackgroundSelector';

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [overrideRace, setOverrideRace] = useState(false);
  const [overrideBackground, setOverrideBackground] = useState(false);
  const [backgroundExplicit, setBackgroundExplicit] = useState(false);
  const [backgroundLocked, setBackgroundLocked] = useState(false);
  const [hasEditedScores, setHasEditedScores] = useState(false);
  const [abilityScoresLocked, setAbilityScoresLocked] = useState(false);
  const [equipmentLocked, setEquipmentLocked] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<{
    weapons: string[];
    armor: string;
    tools: string[];
    packs: string[];
    miscellaneous: string[];
  }>({
    weapons: [],
    armor: '',
    tools: [],
    packs: [],
    miscellaneous: []
  });

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

  const getSuggestedEquipment = () => {
    const classType = getNormalizedClass();
    const backgroundName = character?.background.name.toLowerCase() || '';
    const raceName = character?.race.name.toLowerCase() || '';
    
    const suggestions = {
      weapons: [] as string[],
      armor: '',
      tools: [] as string[],
      packs: [] as string[],
      miscellaneous: [] as string[]
    };

    // Class-based weapon suggestions
    if (classType?.includes('wizard')) {
      suggestions.weapons = ['Quarterstaff', 'Dagger'];
      suggestions.armor = 'None (Mage Armor spell recommended)';
      suggestions.packs = ['Scholar\'s Pack'];
      suggestions.miscellaneous = ['Spellbook', 'Component Pouch', 'Arcane Focus'];
    } else if (classType?.includes('fighter')) {
      suggestions.weapons = ['Longsword', 'Shield', 'Light Crossbow'];
      suggestions.armor = 'Chain Mail';
      suggestions.packs = ['Dungeoneer\'s Pack'];
      suggestions.miscellaneous = ['20 Bolts'];
    } else if (classType?.includes('rogue')) {
      suggestions.weapons = ['Rapier', 'Shortbow', 'Dagger (2)'];
      suggestions.armor = 'Leather Armor';
      suggestions.packs = ['Burglar\'s Pack'];
      suggestions.miscellaneous = ['Thieves\' Tools', '20 Arrows'];
    } else if (classType?.includes('cleric')) {
      suggestions.weapons = ['Mace', 'Shield'];
      suggestions.armor = 'Scale Mail';
      suggestions.packs = ['Priest\'s Pack'];
      suggestions.miscellaneous = ['Holy Symbol', 'Prayer Book'];
    } else {
      // Default for other classes
      suggestions.weapons = ['Longsword', 'Shield'];
      suggestions.armor = 'Leather Armor';
      suggestions.packs = ['Explorer\'s Pack'];
    }

    // Background-based tool additions
    if (backgroundName.includes('criminal')) {
      suggestions.tools = ['Thieves\' Tools', 'Gaming Set'];
    } else if (backgroundName.includes('acolyte')) {
      suggestions.tools = ['Holy Symbol'];
      suggestions.miscellaneous.push('Incense (5 sticks)', 'Prayer Book');
    } else if (backgroundName.includes('folk hero')) {
      suggestions.tools = ['Artisan\'s Tools', 'Smith\'s Tools'];
      suggestions.miscellaneous.push('Iron Pot', 'Shovel');
    }

    // Race-based additions
    if (raceName.includes('dwarf')) {
      if (!suggestions.tools.some(t => t.includes('Smith') || t.includes('Mason') || t.includes('Brewer'))) {
        suggestions.tools.push('Smith\'s Tools or Mason\'s Tools');
      }
    } else if (raceName.includes('elf')) {
      if (!suggestions.weapons.some(w => w.includes('Longbow') || w.includes('Shortbow'))) {
        suggestions.miscellaneous.push('Longbow proficiency (racial)');
      }
    }

    return suggestions;
  };

  const applySuggestedEquipment = () => {
    const suggested = getSuggestedEquipment();
    setSelectedEquipment(suggested);
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
      setBackgroundLocked(false);
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

      {/* Step Progress Tracker */}
      {character && (
        <div className="bg-[#151A22] border border-[#2A3340] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Character Creation Progress</h3>
            <div className="text-xs text-gray-400">
              {character.name} • {storyCharacters.find(c => c.id === selectedStoryCharacterId)?.class || 'Unknown Class'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Step 1: Background */}
            <div className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                backgroundLocked 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-[#1C1F2B] border-[#7c63e5] text-[#7c63e5]'
              }`}>
                {backgroundLocked ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <div className="ml-2 flex-1">
                <div className={`text-xs font-medium ${backgroundLocked ? 'text-green-300' : 'text-white'}`}>
                  Background
                </div>
                {backgroundLocked && (
                  <div className="text-xs text-gray-400 truncate">{character.background.name}</div>
                )}
              </div>
            </div>

            {/* Connector */}
            <div className={`h-0.5 w-8 transition-colors ${backgroundLocked ? 'bg-green-500' : 'bg-[#2A3340]'}`} />

            {/* Step 2: Ability Scores */}
            <div className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                abilityScoresLocked 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : backgroundLocked
                  ? 'bg-[#1C1F2B] border-[#7c63e5] text-[#7c63e5]'
                  : 'bg-[#1C1F2B] border-[#2A3340] text-gray-500'
              }`}>
                {abilityScoresLocked ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <div className="ml-2 flex-1">
                <div className={`text-xs font-medium ${
                  abilityScoresLocked ? 'text-green-300' : backgroundLocked ? 'text-white' : 'text-gray-500'
                }`}>
                  Abilities
                </div>
                {abilityScoresLocked && (
                  <div className="text-xs text-gray-400">Assigned</div>
                )}
              </div>
            </div>

            {/* Connector */}
            <div className={`h-0.5 w-8 transition-colors ${abilityScoresLocked ? 'bg-green-500' : 'bg-[#2A3340]'}`} />

            {/* Step 3: Equipment */}
            <div className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                equipmentLocked 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : abilityScoresLocked
                  ? 'bg-[#1C1F2B] border-[#7c63e5] text-[#7c63e5]'
                  : 'bg-[#1C1F2B] border-[#2A3340] text-gray-500'
              }`}>
                {equipmentLocked ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">3</span>
                )}
              </div>
              <div className="ml-2 flex-1">
                <div className={`text-xs font-medium ${
                  equipmentLocked ? 'text-green-300' : abilityScoresLocked ? 'text-white' : 'text-gray-500'
                }`}>
                  Equipment
                </div>
                {equipmentLocked && (
                  <div className="text-xs text-gray-400">Selected</div>
                )}
              </div>
            </div>
          </div>

          {/* Completion Status */}
          {equipmentLocked && (
            <div className="mt-4 pt-4 border-t border-[#2A3340] flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-300">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Character sheet complete!</span>
              </div>
              <Button size="sm" variant="primary" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" />
                Save Character
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Character Sheet Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Step 1: Background Selection */}
        <Card id="step-1-background" className="lg:col-span-2 bg-[#151A22] border border-[#2A3340] rounded-xl shadow-lg shadow-black/40">
          <Collapsible 
            open={!backgroundLocked} 
            onOpenChange={(open) => {
              if (open && backgroundLocked) {
                // Allow expanding to review
                setBackgroundLocked(false);
                // Collapse later steps
                const newExpanded = new Set(expandedSections);
                newExpanded.delete('ability-scores');
                newExpanded.delete('equipment-preferences');
                setExpandedSections(newExpanded);
                setAbilityScoresLocked(false);
                setEquipmentLocked(false);
              }
            }}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer group hover:bg-[#1C1F2B] transition-colors rounded-t-xl">
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 border-b border-gray-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                      backgroundLocked 
                        ? 'bg-green-500 border-green-500' 
                        : 'bg-[#1C1F2B] border-[#7c63e5]'
                    }`}>
                      {backgroundLocked ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <span className="text-sm font-semibold text-[#7c63e5]">1</span>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold group-hover:underline underline-offset-4">
                        Step 1: Choose a Background
                      </div>
                      {backgroundLocked && (
                        <div className="text-sm text-gray-400 font-normal mt-0.5">
                          Selected: {character.background.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {backgroundLocked && (
                      <Badge variant="outline" className="text-xs bg-green-900/30 text-green-300 border border-green-600/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {!backgroundLocked ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-6 md:p-8">
                <p className="text-sm text-gray-400 mb-6">
                  Select a background that fits your character's history and role. Each background provides skill proficiencies, tool proficiencies, and a special feature. <strong>Click the info icon</strong> on any card to see full details.
                </p>
                
                <BackgroundSelector
                  backgrounds={SRD_BACKGROUNDS}
                  selectedBackground={backgroundExplicit ? character.background.name : null}
                  suggestedBackgrounds={getSuggestedBackgroundsByClass()}
                  onSelect={handleBackgroundChange}
                  onLock={() => {
                    setBackgroundLocked(true);
                    // Expand Step 2 and scroll to it
                    const newExpanded = new Set(expandedSections);
                    newExpanded.add('ability-scores');
                    setExpandedSections(newExpanded);
                    
                    setTimeout(() => {
                      const el = document.getElementById('step-2-ability-scores');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}
                  isLocked={backgroundLocked}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Step 2: Ability Scores (locked until background chosen) */}
        <Card id="step-2-ability-scores" className={`relative lg:col-span-2 bg-[#121722] border-2 rounded-2xl shadow-xl transition-all duration-300 overflow-hidden ${
          !backgroundLocked 
            ? 'border-[#2A3340]' 
            : 'border-[#7c63e5]/40 shadow-[#7c63e5]/10'
        } ${!backgroundLocked ? 'min-h-[320px]' : ''}`}>
          <Collapsible 
            open={expandedSections.has('ability-scores')} 
            onOpenChange={() => backgroundLocked && toggleSection('ability-scores')}
          >
            <CollapsibleTrigger asChild disabled={!backgroundLocked}>
              <CardHeader className={`transition-colors rounded-t-2xl ${backgroundLocked ? 'cursor-pointer group hover:bg-[#1A1F2E]' : 'cursor-not-allowed'}`}>
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 border-b border-gray-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                      abilityScoresLocked 
                        ? 'bg-green-500 border-green-500' 
                        : backgroundLocked
                        ? 'bg-[#1C1F2B] border-[#7c63e5]'
                        : 'bg-[#1C1F2B] border-[#2A3340]'
                    }`}>
                      {abilityScoresLocked ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <span className={`text-sm font-semibold ${backgroundLocked ? 'text-[#7c63e5]' : 'text-gray-500'}`}>2</span>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold group-hover:underline underline-offset-4">
                        Step 2: Assign Ability Scores
                      </div>
                      {abilityScoresLocked && (
                        <div className="text-sm text-gray-400 font-normal mt-0.5">
                          Scores assigned and locked
                        </div>
                      )}
                      {!backgroundLocked && (
                        <div className="text-sm text-gray-400 font-normal mt-0.5">
                          Complete Step 1 first
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {abilityScoresLocked && (
                      <Badge variant="outline" className="text-xs bg-green-900/30 text-green-300 border border-green-600/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {backgroundLocked && !abilityScoresLocked && (
                      <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-300 border border-blue-600/30">
                        Ready
                      </Badge>
                    )}
                    {expandedSections.has('ability-scores') ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 text-left max-w-[960px] p-6 md:p-8">
                
                {/* Success Banner */}
                {backgroundLocked && (
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-300">
                        Background locked: {character.background.name}
                      </p>
                      <p className="text-xs text-green-400/80 mt-1">
                        Now assign your ability scores based on your race, class, and background.
                      </p>
                    </div>
                  </div>
                )}
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
                        {isEditing && !abilityScoresLocked ? (
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

                {/* Lock Ability Scores Button */}
                {!abilityScoresLocked && hasEditedScores && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => {
                        setAbilityScoresLocked(true);
                        // Collapse Step 2 and expand Step 3
                        const newExpanded = new Set(expandedSections);
                        newExpanded.delete('ability-scores');
                        newExpanded.add('equipment-preferences');
                        setExpandedSections(newExpanded);
                        
                        setTimeout(() => {
                          const el = document.getElementById('step-3-equipment');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      variant="primary"
                      className="px-6 py-2"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Ability Scores & Continue
                    </Button>
                  </div>
                )}

                {/* Locked Confirmation */}
                {abilityScoresLocked && (
                  <div className="mt-6 bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-300">Ability Scores Locked</p>
                        <p className="text-xs text-green-400/80 mt-1">You can now proceed to equipment selection.</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAbilityScoresLocked(false);
                        setEquipmentLocked(false);
                        // Re-expand Step 2
                        const newExpanded = new Set(expandedSections);
                        newExpanded.add('ability-scores');
                        newExpanded.delete('equipment-preferences');
                        setExpandedSections(newExpanded);
                      }}
                      className="ml-4"
                    >
                      Unlock to Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Frosted Glass Lock Overlay - Embedded within Step 2 */}
          <div 
            className={`absolute inset-0 flex items-center justify-center rounded-2xl ring-1 ring-[#2A3340]/50 transition-all duration-500 ${
              !backgroundLocked 
                ? 'opacity-100 pointer-events-auto z-10' 
                : 'opacity-0 pointer-events-none'
            }`}
            style={{
              background: 'rgba(21, 20, 32, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-center max-w-[360px] px-8 py-6">
              {/* Lock Icon */}
              <div className="mb-5">
                <Lock className="w-10 h-10 text-gray-300 mx-auto" />
              </div>
              
              {/* Headline */}
              <h3 className="text-base font-semibold text-white mb-4">
                Step 1 Required
              </h3>
              
              {/* Description with Step 1 Reference */}
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                Please select and lock a background in{' '}
                <span className="font-semibold text-green-300">Step 1: Choose a Background</span>
                {' '}to unlock ability score assignment.
              </p>
              
              {/* Subtle hint */}
              <div className="text-xs text-gray-400 italic">
                Locked until Step 1 is completed
              </div>
            </div>
          </div>
        </Card>

        {/* Step 3: Equipment Selection */}
        <Card id="step-3-equipment" className={`relative lg:col-span-2 bg-[#121722] border-2 rounded-2xl shadow-xl transition-all duration-300 overflow-hidden ${
          !abilityScoresLocked 
            ? 'border-[#2A3340]' 
            : 'border-[#7c63e5]/40 shadow-[#7c63e5]/10'
        } ${!abilityScoresLocked ? 'min-h-[320px]' : ''}`}>
          <Collapsible 
            open={expandedSections.has('equipment-preferences')} 
            onOpenChange={() => abilityScoresLocked && toggleSection('equipment-preferences')}
          >
            <CollapsibleTrigger asChild disabled={!abilityScoresLocked}>
              <CardHeader className={`transition-colors rounded-t-2xl ${abilityScoresLocked ? 'cursor-pointer group hover:bg-[#1A1F2E]' : 'cursor-not-allowed'}`}>
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 border-b border-gray-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                      equipmentLocked 
                        ? 'bg-green-500 border-green-500' 
                        : abilityScoresLocked
                        ? 'bg-[#1C1F2B] border-[#7c63e5]'
                        : 'bg-[#1C1F2B] border-[#2A3340]'
                    }`}>
                      {equipmentLocked ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <span className={`text-sm font-semibold ${abilityScoresLocked ? 'text-[#7c63e5]' : 'text-gray-500'}`}>3</span>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold group-hover:underline underline-offset-4">
                        Step 3: Choose Equipment
                      </div>
                      {equipmentLocked && (
                        <div className="text-sm text-gray-400 font-normal mt-0.5">
                          Equipment selected and locked
                        </div>
                      )}
                      {!abilityScoresLocked && (
                        <div className="text-sm text-gray-400 font-normal mt-0.5">
                          Complete Step 2 first
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {equipmentLocked && (
                      <Badge variant="outline" className="text-xs bg-green-900/30 text-green-300 border border-green-600/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {abilityScoresLocked && !equipmentLocked && (
                      <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-300 border border-blue-600/30">
                        Ready
                      </Badge>
                    )}
                    {expandedSections.has('equipment-preferences') ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 text-left max-w-[960px] p-6 md:p-8">
                
                {/* Success Banner */}
                {abilityScoresLocked && !equipmentLocked && (
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-300">Ability Scores Locked</p>
                      <p className="text-xs text-green-400/80 mt-1">
                        Select your starting gear based on your character's background and race. You may use the suggested loadout or customize freely.
                      </p>
                    </div>
                  </div>
                )}

                {/* Suggested Equipment */}
                <div className="bg-[#131A24] border border-[#2A3340] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Suggested Equipment</h3>
                    <Button 
                      size="sm" 
                      variant="primary"
                      onClick={applySuggestedEquipment}
                      disabled={equipmentLocked}
                    >
                      Use Suggested Loadout
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const suggested = getSuggestedEquipment();
                      return (
                        <>
                          {suggested.weapons.length > 0 && (
                            <div className="bg-[#161D28] border border-[#2A3340] rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-400 mb-2">Weapons</div>
                              <div className="text-sm text-gray-300 space-y-1">
                                {suggested.weapons.map((w, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-[#7c63e5]">•</span>
                                    <span>{w}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {suggested.armor && (
                            <div className="bg-[#161D28] border border-[#2A3340] rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-400 mb-2">Armor</div>
                              <div className="text-sm text-gray-300">{suggested.armor}</div>
                            </div>
                          )}
                          
                          {suggested.packs.length > 0 && (
                            <div className="bg-[#161D28] border border-[#2A3340] rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-400 mb-2">Packs</div>
                              <div className="text-sm text-gray-300 space-y-1">
                                {suggested.packs.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-[#7c63e5]">•</span>
                                    <span>{p}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {suggested.tools.length > 0 && (
                            <div className="bg-[#161D28] border border-[#2A3340] rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-400 mb-2">Tools</div>
                              <div className="text-sm text-gray-300 space-y-1">
                                {suggested.tools.map((t, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-[#7c63e5]">•</span>
                                    <span>{t}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {suggested.miscellaneous.length > 0 && (
                            <div className="bg-[#161D28] border border-[#2A3340] rounded-lg p-3 md:col-span-2">
                              <div className="text-xs font-medium text-gray-400 mb-2">Miscellaneous</div>
                              <div className="text-sm text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
                                {suggested.miscellaneous.map((m, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-[#7c63e5]">•</span>
                                    <span>{m}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Manual Equipment Selection */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white border-b border-[#2A3340] pb-2">Custom Equipment Selection</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weapons */}
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Weapons</Label>
                      <Textarea
                        value={selectedEquipment.weapons.join(', ')}
                        onChange={(e) => setSelectedEquipment({
                          ...selectedEquipment,
                          weapons: e.target.value.split(',').map(w => w.trim()).filter(w => w)
                        })}
                        disabled={equipmentLocked}
                        placeholder="e.g., Longsword, Shield"
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5] min-h-[60px]"
                      />
                    </div>

                    {/* Armor */}
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Armor</Label>
                      <Input
                        value={selectedEquipment.armor}
                        onChange={(e) => setSelectedEquipment({ ...selectedEquipment, armor: e.target.value })}
                        disabled={equipmentLocked}
                        placeholder="e.g., Chain Mail"
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5]"
                      />
                    </div>

                    {/* Tools */}
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Tools</Label>
                      <Textarea
                        value={selectedEquipment.tools.join(', ')}
                        onChange={(e) => setSelectedEquipment({
                          ...selectedEquipment,
                          tools: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                        })}
                        disabled={equipmentLocked}
                        placeholder="e.g., Thieves' Tools"
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5] min-h-[60px]"
                      />
                    </div>

                    {/* Packs */}
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Packs</Label>
                      <Textarea
                        value={selectedEquipment.packs.join(', ')}
                        onChange={(e) => setSelectedEquipment({
                          ...selectedEquipment,
                          packs: e.target.value.split(',').map(p => p.trim()).filter(p => p)
                        })}
                        disabled={equipmentLocked}
                        placeholder="e.g., Explorer's Pack"
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5] min-h-[60px]"
                      />
                    </div>

                    {/* Miscellaneous */}
                    <div className="md:col-span-2">
                      <Label className="text-sm text-gray-400 mb-2 block">Miscellaneous Items</Label>
                      <Textarea
                        value={selectedEquipment.miscellaneous.join(', ')}
                        onChange={(e) => setSelectedEquipment({
                          ...selectedEquipment,
                          miscellaneous: e.target.value.split(',').map(m => m.trim()).filter(m => m)
                        })}
                        disabled={equipmentLocked}
                        placeholder="e.g., Rope (50 ft.), Torch (10)"
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[#7c63e5] focus:border-[#7c63e5] min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Background Equipment Note */}
                {character.background.equipment.length > 0 && (
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-300">From Your Background</p>
                      <p className="text-xs text-blue-400/80 mt-1">
                        Your {character.background.name} background also provides: {character.background.equipment.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Story Character Equipment Preferences */}
                {character.customEquipmentPreferences && character.customEquipmentPreferences.length > 0 && (
                  <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-300 mb-2">Story Character Preferences</p>
                        <div className="text-xs text-purple-400/80 space-y-1">
                          {character.customEquipmentPreferences.map((item, index) => (
                            <div key={index}>• {item}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lock Equipment Button */}
                {!equipmentLocked && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => {
                        setEquipmentLocked(true);
                        // Collapse Step 3 after locking
                        const newExpanded = new Set(expandedSections);
                        newExpanded.delete('equipment-preferences');
                        setExpandedSections(newExpanded);
                      }}
                      variant="primary"
                      className="px-6 py-2"
                      disabled={
                        selectedEquipment.weapons.length === 0 && 
                        !selectedEquipment.armor && 
                        selectedEquipment.packs.length === 0
                      }
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Equipment & Finalize
                    </Button>
                  </div>
                )}

                {/* Locked Confirmation */}
                {equipmentLocked && (
                  <div className="mt-6 bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-300">Equipment Locked</p>
                        <p className="text-xs text-green-400/80 mt-1">Your character sheet is now complete!</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEquipmentLocked(false);
                        // Re-expand Step 3
                        const newExpanded = new Set(expandedSections);
                        newExpanded.add('equipment-preferences');
                        setExpandedSections(newExpanded);
                      }}
                      className="ml-4"
                    >
                      Unlock to Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>

          {/* Frosted Glass Lock Overlay - Embedded within Step 3 */}
          <div 
            className={`absolute inset-0 flex items-center justify-center rounded-2xl ring-1 ring-[#2A3340]/50 transition-all duration-500 ${
              !abilityScoresLocked 
                ? 'opacity-100 pointer-events-auto z-10' 
                : 'opacity-0 pointer-events-none'
            }`}
            style={{
              background: 'rgba(21, 20, 32, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-center max-w-[360px] px-8 py-6">
              {/* Lock Icon */}
              <div className="mb-5">
                <Lock className="w-10 h-10 text-gray-300 mx-auto" />
              </div>
              
              {/* Headline */}
              <h3 className="text-base font-semibold text-white mb-4">
                Step 2 Required
              </h3>
              
              {/* Description */}
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                Please assign and lock ability scores in{' '}
                <span className="font-semibold text-green-300">Step 2: Assign Ability Scores</span>
                {' '}to unlock equipment selection.
              </p>
              
              {/* Subtle hint */}
              <div className="text-xs text-gray-400 italic">
                Locked until Step 2 is completed
              </div>
            </div>
          </div>
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
