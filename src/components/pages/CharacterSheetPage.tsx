import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import { ChevronDown, ChevronRight, Save, Download, AlertCircle, Users, Plus, Lock, CheckCircle2, AlertTriangle, Info, Trash2 } from 'lucide-react';
import type { SRD2014Character, AbilityScores, Race, Background } from '../../types/srd-2014';
import type { Character as StoryCharacter } from '../../types/macro-chain';
import { 
  calculateAbilityModifiers, 
  calculatePointBuyCost, 
  validateCharacter, 
  validateAbilityScores,
  SRD_RACES, 
  SRD_BACKGROUNDS,
  ABILITY_SCORE_NAMES,
  STANDARD_ARRAY,
  POINT_BUY_COSTS
} from '../../types/srd-2014';
import logger from '@/utils/logger';
import { debug } from '@/lib/debugCollector';
import BackgroundSelector from '../BackgroundSelector';
import { theme } from '@/lib/theme';
import { useToast } from '../ui/toast';

const log = logger.character;

// Helper to log to both console and debug collector
const logWithDebug = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  // Log to console via logger
  log[level](message, data);
  // Also log to debug collector
  debug[level]('CharacterSheetPage', message, data);
};

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
  const [activeTab, setActiveTab] = useState<'background' | 'abilities' | 'equipment'>('background');

  // Log component mount
  useEffect(() => {
    logWithDebug('info', 'CharacterSheetPage mounted', { sessionId, hasContext: !!context });
    return () => {
      logWithDebug('info', 'CharacterSheetPage unmounted');
    };
  }, []);
  const [overrideRace, setOverrideRace] = useState(false);
  const [overrideBackground, setOverrideBackground] = useState(false);
  const [backgroundExplicit, setBackgroundExplicit] = useState(false);
  const [backgroundLocked, setBackgroundLocked] = useState(false);
  const [hasEditedScores, setHasEditedScores] = useState(false);
  const [abilityScoresLocked, setAbilityScoresLocked] = useState(false);
  const [abilityScoreErrors, setAbilityScoreErrors] = useState<Record<keyof AbilityScores, string | null>>({
    strength: null,
    dexterity: null,
    constitution: null,
    intelligence: null,
    wisdom: null,
    charisma: null
  });
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
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const [appliedLoadout, setAppliedLoadout] = useState<boolean>(false);
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  
  // Toast hook for user feedback
  const { addToast } = useToast();

  // Track last edited character ID for persistence
  const getLastEditedCharacterId = (): string | null => {
    try {
      const id = localStorage.getItem(`lastEditedCharacter_${sessionId}`);
      logWithDebug('info', 'Getting last edited character ID:', { sessionId, id });
      return id;
    } catch (err) {
      logWithDebug('error', 'Error getting last edited character ID:', err);
      return null;
    }
  };

  const setLastEditedCharacterId = (characterId: string | null) => {
    try {
      if (characterId) {
        localStorage.setItem(`lastEditedCharacter_${sessionId}`, characterId);
        logWithDebug('info', 'Stored last edited character ID:', { sessionId, characterId });
      } else {
        localStorage.removeItem(`lastEditedCharacter_${sessionId}`);
        logWithDebug('info', 'Cleared last edited character ID:', { sessionId });
      }
    } catch (err) {
      logWithDebug('error', 'Error setting last edited character ID:', err);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('CharacterSheetPage state:', {
      character: character ? character.name : 'null',
      storyCharacters: storyCharacters.length,
      savedSRDCharacters: savedSRDCharacters.length,
      selectedStoryCharacterId
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
  }, [character, storyCharacters, savedSRDCharacters, selectedStoryCharacterId]);

  // Clear validation errors when ability scores are locked or method changes
  useEffect(() => {
    if (abilityScoresLocked || !character) {
      setAbilityScoreErrors({
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null
      });
    }
  }, [abilityScoresLocked, character?.abilityScoreMethod]);

  // Auto-advance tabs when steps are completed
  useEffect(() => {
    if (backgroundLocked && activeTab === 'background') {
      setActiveTab('abilities');
    }
  }, [backgroundLocked]);

  useEffect(() => {
    if (abilityScoresLocked && activeTab === 'abilities') {
      setActiveTab('equipment');
    }
  }, [abilityScoresLocked]);

  // Load story characters and existing SRD characters on mount or when sessionId changes
  useEffect(() => {
    if (sessionId) {
      logWithDebug('info', 'CharacterSheetPage: Loading characters', { sessionId, hasContext: !!context });
      setHasAttemptedRestore(false); // Reset restore flag when sessionId changes
      
      // Load characters immediately
      const loadData = async () => {
        await Promise.all([
          loadStoryCharacters(),
          loadSRDCharacters()
        ]);
        logWithDebug('info', 'CharacterSheetPage: All characters loaded', {
          sessionId,
          storyCharactersCount: storyCharacters.length,
          savedSRDCharactersCount: savedSRDCharacters.length
        });
      };
      
      loadData().catch(err => {
        logWithDebug('error', 'CharacterSheetPage: Error loading characters', { error: err, sessionId });
      });
    } else {
      logWithDebug('warn', 'CharacterSheetPage: No sessionId available', { sessionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-restore last edited character when saved characters are loaded
  useEffect(() => {
    // Only attempt restore once, if we have saved characters and no character is currently loaded
    if (savedSRDCharacters.length > 0 && !character && !hasAttemptedRestore) {
      const lastEditedId = getLastEditedCharacterId();
        logWithDebug('info', 'Auto-restore check:', {
        savedCount: savedSRDCharacters.length, 
        lastEditedId,
        selectedStoryCharacterId,
        hasAttemptedRestore,
        savedCharacterIds: savedSRDCharacters.map(c => c.id),
        savedCharacterNames: savedSRDCharacters.map(c => c.name)
      });
      
      let characterToRestore: SRD2014Character | undefined;
      
      // Priority 1: Restore by last edited ID from localStorage
      if (lastEditedId) {
        characterToRestore = savedSRDCharacters.find(c => c.id === lastEditedId);
        if (characterToRestore) {
          logWithDebug('info', 'Found character by last edited ID:', { 
            name: characterToRestore.name, 
            id: characterToRestore.id 
          });
        } else {
          // Character ID in localStorage but not found in saved list - clear it
          logWithDebug('info', 'Last edited character not found in saved list, clearing stored ID', {
            lastEditedId,
            availableIds: savedSRDCharacters.map(c => c.id)
          });
          setLastEditedCharacterId(null);
        }
      }
      
      // Priority 2: If no last edited ID match, try to match by selectedStoryCharacterId
      if (!characterToRestore && selectedStoryCharacterId) {
        characterToRestore = savedSRDCharacters.find(c => c.storyCharacterId === selectedStoryCharacterId);
        if (characterToRestore) {
          logWithDebug('info', 'Found character by story character ID:', { 
            name: characterToRestore.name, 
            id: characterToRestore.id,
            storyCharacterId: selectedStoryCharacterId
          });
          // Store this as the last edited character for future restores
          setLastEditedCharacterId(characterToRestore.id);
        }
      }
      
      // Priority 3: If only one saved character exists, auto-load it
      if (!characterToRestore && savedSRDCharacters.length === 1) {
        characterToRestore = savedSRDCharacters[0];
        logWithDebug('info', 'Auto-loading only saved character:', { 
          name: characterToRestore.name, 
          id: characterToRestore.id 
        });
        // Store this as the last edited character for future restores
        setLastEditedCharacterId(characterToRestore.id);
      }
      
      // Restore the character if found
      if (characterToRestore) {
        // Validate that the saved character has required data
        if (!characterToRestore.abilityScores) {
          logWithDebug('warn', 'Saved character missing abilityScores, this may cause validation errors', {
            characterId: characterToRestore.id,
            characterName: characterToRestore.name
          });
        }
        
        logWithDebug('info', 'Auto-restoring character:', { 
          name: characterToRestore.name, 
          id: characterToRestore.id,
          abilityScores: characterToRestore.abilityScores,
          abilityScoreMethod: characterToRestore.abilityScoreMethod,
          level: characterToRestore.level,
          race: characterToRestore.race?.name,
          background: characterToRestore.background?.name,
          hasStoryCharacterId: !!characterToRestore.storyCharacterId,
          fullCharacterData: JSON.stringify(characterToRestore, null, 2)
        });
        
        // Deep clone to ensure we're not mutating the saved character
        const restoredCharacter = JSON.parse(JSON.stringify(characterToRestore));
        
        // Verify the clone has ability scores
        if (!restoredCharacter.abilityScores) {
          logWithDebug('error', 'Restored character missing abilityScores after clone', {
            characterId: restoredCharacter.id,
            characterName: restoredCharacter.name
          });
        }
        
        setCharacter(restoredCharacter);
        validateCharacterData(restoredCharacter);
        
        // Restore selectedStoryCharacterId if available
        if (restoredCharacter.storyCharacterId) {
          setSelectedStoryCharacterId(restoredCharacter.storyCharacterId);
        }
        
        setHasAttemptedRestore(true);
        
        logWithDebug('info', 'Character restored successfully', {
          name: restoredCharacter.name,
          abilityScores: restoredCharacter.abilityScores,
          abilityScoreMethod: restoredCharacter.abilityScoreMethod
        });
      } else {
        // No character to restore, mark as attempted to prevent repeated checks
        logWithDebug('info', 'No character found to auto-restore');
        setHasAttemptedRestore(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSRDCharacters, character, hasAttemptedRestore, selectedStoryCharacterId]);

  const loadStoryCharacters = async () => {
    try {
      logWithDebug('info', 'Loading story characters', { sessionId });
      const response = await fetch(`/api/characters/list?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.ok) {
        const characters = data.list || [];
        logWithDebug('info', 'Loaded story characters', { count: characters.length, sessionId });
        setStoryCharacters(characters);
      } else {
        logWithDebug('warn', 'Failed to load story characters', { error: data.error, sessionId });
        setError(data.error || 'Failed to load story characters');
      }
    } catch (err) {
      logWithDebug('error', 'Error loading story characters', { error: err, sessionId });
      setError('Failed to load story characters');
    }
  };

  const loadSRDCharacters = async () => {
    try {
      logWithDebug('info', 'Loading saved SRD characters', { sessionId });
      const response = await fetch(`/api/characters/srd2014/list?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.ok) {
        const characters = data.characters || [];
        logWithDebug('info', 'Loaded saved SRD characters', { 
          count: characters.length,
          characterIds: characters.map((c: SRD2014Character) => c.id),
          characterNames: characters.map((c: SRD2014Character) => c.name)
        });
        setSavedSRDCharacters(characters);
      } else {
        logWithDebug('warn', 'No saved SRD characters found or error', { error: data.error });
        setSavedSRDCharacters([]);
      }
    } catch (err) {
      logWithDebug('error', 'Error loading SRD characters', { error: err, sessionId });
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
    
    // If switching to Standard Array method, reset all scores to 0 (unassigned)
    if (field === 'abilityScoreMethod' && value === 'standard') {
      const unassignedScores: AbilityScores = {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0
      };
      updatedCharacter.abilityScores = unassignedScores;
      updatedCharacter.abilityModifiers = calculateAbilityModifiers(unassignedScores);
      updatedCharacter.pointBuyTotal = undefined;
    }
    
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

  const handleAbilityScoreChange = (ability: keyof AbilityScores, value: string | number) => {
    if (!character) return;
    
    // Handle empty input (but allow 0 for clearing in Standard Array)
    if (value === '' || value === null || value === undefined) {
      return;
    }
    
    // Parse value (handles both string from input and number from select)
    let numValue: number;
    if (typeof value === 'string') {
      numValue = parseInt(value);
      if (isNaN(numValue)) {
        return; // Invalid input, don't update
      }
    } else {
      numValue = value;
    }
    
    // For Standard Array, allow 0 (clear/unassign) or values from STANDARD_ARRAY
    if (character.abilityScoreMethod === 'standard') {
      // Allow 0 for clearing/unassigning
      if (numValue === 0) {
        // Clear the assignment - set to 0
        const newScores = { ...character.abilityScores, [ability]: 0 };
        handleFieldChange('abilityScores', newScores);
        setHasEditedScores(true);
        // Clear validation errors for this ability
        setAbilityScoreErrors(prev => ({ ...prev, [ability]: null }));
        return;
      }
      // Otherwise, value must be from STANDARD_ARRAY
      if (!STANDARD_ARRAY.includes(numValue as typeof STANDARD_ARRAY[number])) {
        return; // Invalid value for standard array
      }
    } else {
      // For Point Buy, clamp to SRD 2014 valid range (8-15 before racial bonuses)
      numValue = Math.max(8, Math.min(15, numValue));
    }
    
    const newScores = { ...character.abilityScores, [ability]: numValue };
    
    // Recalculate point buy cost
    const newPointBuyTotal = calculatePointBuyCost(newScores);
    
    // Real-time validation
    const errors = validateAbilityScores(newScores, character.abilityScoreMethod);
    const errorMap: Record<keyof AbilityScores, string | null> = {
      strength: null,
      dexterity: null,
      constitution: null,
      intelligence: null,
      wisdom: null,
      charisma: null
    };
    
    // Map validation errors to specific abilities
    // For Standard Array, allow 0 (unassigned) during assignment - only show errors for invalid assignments
    errors.forEach(error => {
      const abilityMatch = error.match(/(\w+) score/);
      if (abilityMatch) {
        const abilityName = abilityMatch[1] as keyof AbilityScores;
        // Don't show "must be between 8 and 15" error for 0 values in Standard Array (they're unassigned)
        if (character.abilityScoreMethod === 'standard' && 
            newScores[abilityName] === 0 && 
            error.includes('must be between 8 and 15')) {
          // Skip this error - 0 is valid during assignment
          return;
        }
        errorMap[abilityName] = error;
      } else if (error.includes('Standard array') || error.includes('Point buy')) {
        // For Standard Array, only show "must be exactly" error if user has assigned some values incorrectly
        // Don't show it if all values are still 0 (unassigned)
        if (character.abilityScoreMethod === 'standard' && error.includes('Standard array')) {
          const hasAnyAssigned = Object.values(newScores).some(score => score > 0);
          if (!hasAnyAssigned) {
            // All unassigned - don't show error yet
            return;
          }
        }
        // General errors apply to all abilities
        Object.keys(errorMap).forEach(ab => {
          errorMap[ab as keyof AbilityScores] = error;
        });
      }
    });
    
    setAbilityScoreErrors(errorMap);
    
    // Update character with new scores
    handleFieldChange('abilityScores', newScores);
    
    // Update point buy total if using point buy
    if (character.abilityScoreMethod === 'point-buy') {
      handleFieldChange('pointBuyTotal', newPointBuyTotal);
    }
    
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
    
    // Set visual feedback
    setAppliedLoadout(true);
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
      setAppliedLoadout(false);
    }, 3000);
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
    setHasEditedScores(true);
    
    // Set visual feedback
    setAppliedPresetId(preset.id);
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
      setAppliedPresetId(null);
    }, 3000);
  };

  // Get value assignment info for Standard Array
  const getStandardArrayValueInfo = (value: number): { ability: keyof AbilityScores | null } => {
    if (!character || character.abilityScoreMethod !== 'standard') {
      return { ability: null };
    }
    
    for (const [ability, score] of Object.entries(character.abilityScores)) {
      if (score === value && score > 0 && STANDARD_ARRAY.includes(score as typeof STANDARD_ARRAY[number])) {
        return { ability: ability as keyof AbilityScores };
      }
    }
    return { ability: null };
  };

  // Get all Standard Array values with their status for a specific ability
  const getStandardArrayValuesWithStatus = (currentAbility: keyof AbilityScores): Array<{
    value: number;
    isSelected: boolean;
    isTaken: boolean;
    takenBy: keyof AbilityScores | null;
  }> => {
    if (!character || character.abilityScoreMethod !== 'standard') {
      return [];
    }
    
    const currentValue = character.abilityScores[currentAbility];
    
    return STANDARD_ARRAY.map(value => {
      const info = getStandardArrayValueInfo(value);
      const isSelected = value === currentValue && currentValue > 0;
      const isTaken = info.ability !== null && info.ability !== currentAbility;
      
      return {
        value,
        isSelected,
        isTaken,
        takenBy: isTaken ? info.ability : null
      };
    }).sort((a, b) => {
      // Sort: Selected first, then available, then taken
      if (a.isSelected) return -1;
      if (b.isSelected) return 1;
      if (a.isTaken && !b.isTaken) return 1;
      if (!a.isTaken && b.isTaken) return -1;
      return b.value - a.value; // Descending order
    });
  };

  // Get available Standard Array values for a specific ability (for backward compatibility)
  const getAvailableStandardArrayValues = (currentAbility: keyof AbilityScores): number[] => {
    if (!character || character.abilityScoreMethod !== 'standard') {
      return [];
    }
    
    const valuesWithStatus = getStandardArrayValuesWithStatus(currentAbility);
    // Return only selectable values (selected or available, not taken)
    return valuesWithStatus
      .filter(v => v.isSelected || !v.isTaken)
      .map(v => v.value);
  };

  // Get remaining unassigned Standard Array values
  const getRemainingStandardArrayValues = (): number[] => {
    if (!character || character.abilityScoreMethod !== 'standard') {
      return [];
    }
    
    const assignedValues = new Set<number>();
    Object.values(character.abilityScores).forEach(score => {
      if (score > 0 && STANDARD_ARRAY.includes(score as typeof STANDARD_ARRAY[number])) {
        assignedValues.add(score);
      }
    });
    
    return STANDARD_ARRAY.filter(value => !assignedValues.has(value)).sort((a, b) => b - a);
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
        logWithDebug('info', 'Character saved successfully', {
          characterId: character.id,
          characterName: character.name,
          abilityScores: character.abilityScores,
          abilityScoreMethod: character.abilityScoreMethod,
          level: character.level,
          race: character.race?.name,
          background: character.background?.name
        });
        setError(null);
        
        // Show success toast
        addToast({
          title: 'Character sheet saved',
          description: `${character.name || 'Character'} has been saved successfully`,
          variant: 'success'
        });
        
        // Show "Saved" state on button temporarily
        setSavedSuccessfully(true);
        setTimeout(() => setSavedSuccessfully(false), 2000);
        
        // Reload saved characters list to get the latest version
        await loadSRDCharacters();
        
        // Reload the saved character from the updated list to ensure we have the latest version
        // This ensures any server-side modifications or timestamps are reflected
        const updatedListResponse = await fetch(`/api/characters/srd2014/list?sessionId=${sessionId}`);
        const updatedListData = await updatedListResponse.json();
        
        if (updatedListData.ok && updatedListData.characters) {
          const savedCharacter = updatedListData.characters.find((c: SRD2014Character) => c.id === character.id);
          if (savedCharacter) {
            logWithDebug('info', 'Reloading saved character after save', {
              characterId: savedCharacter.id,
              characterName: savedCharacter.name,
              abilityScores: savedCharacter.abilityScores,
              abilityScoreMethod: savedCharacter.abilityScoreMethod,
              hasAbilityScores: !!savedCharacter.abilityScores,
              abilityScoreKeys: savedCharacter.abilityScores ? Object.keys(savedCharacter.abilityScores) : []
            });
            
            // Update character state with the saved version
            setCharacter(savedCharacter);
            validateCharacterData(savedCharacter);
            // Store the character ID for persistence across page navigations
            setLastEditedCharacterId(savedCharacter.id);
            logWithDebug('info', 'Character state updated with saved version', {
              name: savedCharacter.name,
              abilityScores: savedCharacter.abilityScores
            });
          } else {
            logWithDebug('warn', 'Saved character not found in reloaded list', {
              characterId: character.id,
              availableIds: updatedListData.characters.map((c: SRD2014Character) => c.id)
            });
          }
        } else {
          logWithDebug('warn', 'Failed to reload saved characters after save', {
            ok: updatedListData.ok,
            hasCharacters: !!updatedListData.characters
          });
        }
        
      } else {
        const errorMsg = data.error || 'Failed to save character';
        setError(errorMsg);
        logWithDebug('error', 'Failed to save character', { error: data.error });
        
        // Show error toast
        addToast({
          title: 'Save failed',
          description: errorMsg,
          variant: 'error'
        });
      }
    } catch (err) {
      const errorMsg = 'Failed to save character';
      setError(errorMsg);
      logWithDebug('error', 'Error saving character:', err);
      
      // Show error toast for network/exception errors
      addToast({
        title: 'Save failed',
        description: 'An error occurred while saving the character sheet',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSRDCharacter = async (characterId: string) => {
    if (!characterId) {
      logWithDebug('warn', 'handleDeleteSRDCharacter called without characterId', { characterId });
      return;
    }

    const confirmed = typeof window !== 'undefined' 
      ? window.confirm('Are you sure you want to delete this character sheet? This action cannot be undone.')
      : true;
    
    if (!confirmed) {
      logWithDebug('info', 'Character sheet deletion cancelled by user', { characterId });
      return;
    }

    setLoading(true);
    setError(null);

    logWithDebug('info', 'Starting character sheet deletion', {
      sessionId,
      characterId,
      endpoint: '/api/characters/srd2014/delete'
    });

    try {
      const response = await fetch('/api/characters/srd2014/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          characterId
        }),
      });

      // Log response details
      logWithDebug('info', 'Delete API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData: any = { status: response.status, statusText: response.statusText };

        // Try to parse error response body if available
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
              errorData = { ...errorData, ...errorJson, responseBody: errorText };
            } catch {
              errorData = { ...errorData, responseBody: errorText };
            }
          }
        } catch (parseErr) {
          logWithDebug('warn', 'Failed to parse error response body', { 
            error: parseErr, 
            status: response.status 
          });
        }

        setError(errorMessage);
        logWithDebug('error', 'Failed to delete character sheet - HTTP error', {
          sessionId,
          characterId,
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorData
        });
        
        // Show error toast for HTTP errors
        addToast({
          title: 'Delete failed',
          description: errorMessage,
          variant: 'error'
        });
        return;
      }

      // Parse successful response
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        const errorMsg = 'Failed to parse server response';
        setError(errorMsg);
        logWithDebug('error', 'Failed to parse delete response JSON', {
          sessionId,
          characterId,
          parseError: parseErr,
          status: response.status
        });
        
        // Show error toast for parse errors
        addToast({
          title: 'Delete failed',
          description: errorMsg,
          variant: 'error'
        });
        return;
      }

      if (data.ok) {
        logWithDebug('info', 'Character sheet deleted successfully', {
          sessionId,
          characterId: data.deletedCharacter.id,
          characterName: data.deletedCharacter.name
        });
        
        // Show success toast
        addToast({
          title: 'Character sheet deleted',
          description: `${data.deletedCharacter.name || 'Character'} has been deleted successfully`,
          variant: 'success'
        });
        
        // If the deleted character is currently loaded, clear it
        if (character && character.id === characterId) {
          setCharacter(null);
          setLastEditedCharacterId(null);
          logWithDebug('info', 'Cleared loaded character after deletion', { characterId });
        }
        
        // Reload saved characters list
        await loadSRDCharacters();
      } else {
        const errorMsg = data.error || 'Failed to delete character sheet';
        setError(errorMsg);
        logWithDebug('error', 'Delete API returned error response', {
          sessionId,
          characterId,
          error: data.error,
          responseData: data
        });
        
        // Show error toast
        addToast({
          title: 'Delete failed',
          description: errorMsg,
          variant: 'error'
        });
      }
    } catch (err) {
      // Network errors, JSON parse errors, etc.
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const errorMsg = 'Failed to delete character sheet';
      setError(errorMsg);
      logWithDebug('error', 'Exception while deleting character sheet', {
        sessionId,
        characterId,
        error: errorMessage,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorStack: err instanceof Error ? err.stack : undefined,
        fullError: err
      });
      
      // Show error toast for network/exception errors
      addToast({
        title: 'Delete failed',
        description: 'An error occurred while deleting the character sheet',
        variant: 'error'
      });
    } finally {
      setLoading(false);
      logWithDebug('info', 'Character sheet deletion attempt completed', {
        sessionId,
        characterId,
        loading: false
      });
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

    // For Standard Array method, start with unassigned scores (0) so user can assign through dropdowns
    const initialAbilityScores: AbilityScores = {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0
    };

    const converted = {
      id: `srd_${storyChar.id}`,
      name: storyChar.name, // Keep the original name
      level: 1,
      ruleset: 'SRD2014' as const,
      abilityScores: initialAbilityScores,
      abilityScoreMethod: 'standard' as const,
      race: srdRace,
      background: srdBackground,
      abilityModifiers: calculateAbilityModifiers(initialAbilityScores),
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

  const handleCreateFromStoryCharacter = async (storyChar: StoryCharacter) => {
    console.log('Creating character sheet for:', storyChar.name);
    try {
      // Fetch fresh saved characters data to check if this story character already has a saved sheet
      // This ensures we have the latest data, especially after a deletion
      let existingSavedChar: SRD2014Character | undefined;
      try {
        const response = await fetch(`/api/characters/srd2014/list?sessionId=${sessionId}`);
        const data = await response.json();
        if (data.ok && data.characters) {
          existingSavedChar = data.characters.find(
            (c: SRD2014Character) => c.storyCharacterId === storyChar.id
          );
          // Update state with fresh data
          setSavedSRDCharacters(data.characters || []);
        }
      } catch (fetchError) {
        logWithDebug('warn', 'Failed to fetch fresh saved characters, using cached state', { error: fetchError });
        // Fallback to cached state if fetch fails
        existingSavedChar = savedSRDCharacters.find(
        c => c.storyCharacterId === storyChar.id
      );
      }
      
      if (existingSavedChar) {
        // Load the existing saved character instead of creating a new one
        logWithDebug('info', 'Found existing saved character, loading:', existingSavedChar.name);
        setCharacter(existingSavedChar);
        setSelectedStoryCharacterId(storyChar.id);
        validateCharacterData(existingSavedChar);
        setLastEditedCharacterId(existingSavedChar.id);
      } else {
        // Create new character from story character
        const srdCharacter = convertStoryCharacterToSRD(storyChar);
        console.log('Converted character:', srdCharacter);
        setCharacter(srdCharacter);
        setBackgroundExplicit(false);
        setBackgroundLocked(false);
        setSelectedStoryCharacterId(storyChar.id);
        validateCharacterData(srdCharacter);
        // Don't set lastEditedCharacterId until it's saved
        console.log('Character state set, should show character sheet now');
      }
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
                          // Store the character ID for persistence
                          setLastEditedCharacterId(srdChar.id);
                          // Restore selectedStoryCharacterId if available
                          if (srdChar.storyCharacterId) {
                            setSelectedStoryCharacterId(srdChar.storyCharacterId);
                          }
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
                        title="Download Character Sheet"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteSRDCharacter(srdChar.id)}
                        className="rounded-xl"
                        title="Delete Character Sheet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Story Characters Section */}
        {(() => {
          // Filter out story characters that already have saved character sheets
          const availableStoryCharacters = storyCharacters.filter(storyChar => 
            !savedSRDCharacters.some(srdChar => srdChar.storyCharacterId === storyChar.id)
          );
          
          return availableStoryCharacters.length > 0 && (
          <Card className="bg-[#151A22] border border-[#2A3340] rounded-2xl shadow-md shadow-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-lg font-semibold">
                <Users className="w-5 h-5" />
                  Create New Character Sheet from Story Characters ({availableStoryCharacters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableStoryCharacters.map((storyChar) => {
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
          );
        })()}
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
            Build and customize your SRD 2014 character details
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
            logWithDebug('info', 'Back to Selection clicked');
            setCharacter(null);
            setSelectedStoryCharacterId(null);
            // Clear the last edited character ID when going back to selection
            setLastEditedCharacterId(null);
            // Keep hasAttemptedRestore as true to prevent immediate auto-restore
            // This allows user to actually see the selection screen
            // The flag will be reset when sessionId changes or component remounts
          }}
          variant="secondary"
        >
          Back to Selection
        </Button>
        
          <Button
            onClick={handleSave}
            disabled={loading || validationErrors.length > 0}
            variant="primary"
            className="rounded-lg px-4 py-2 text-sm"
          >
            {loading ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Saving...
              </>
            ) : savedSuccessfully ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Character
              </>
            )}
          </Button>
        
        <Button
          onClick={handleExport}
          variant="primary"
          className="rounded-lg px-4 py-2 text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>


      {/* Character Creation Tabs */}
      {character && (
        <TooltipProvider>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'background' | 'abilities' | 'equipment')} className="mb-6">
          {/* Step Progress Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">
              Character Creation Steps
            </div>
            <div className="text-xs text-gray-500">
              {(() => {
                const currentStep = activeTab === 'background' ? 1 : activeTab === 'abilities' ? 2 : 3;
                return `Step ${currentStep} of 3`;
              })()}
            </div>
          </div>
          
          <div className="mb-4">
            {/* Progress Connector Line */}
            <div className="relative mb-3">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#2A3340] -translate-y-1/2" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-green-500/60 transition-all duration-500 -translate-y-1/2"
                style={{
                  width: equipmentLocked ? '100%' : abilityScoresLocked ? '66.66%' : backgroundLocked ? '33.33%' : '0%'
                }}
              />
            </div>

            <TabsList className={`${theme.background.card} border ${theme.border.primary} rounded-lg p-1 inline-flex h-auto bg-[#151A22] w-full justify-between mb-6`}>
              {/* Step 1: Background */}
              <TabsTrigger 
                value="background" 
                className={`relative px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-[#000000] data-[state=active]:text-[#ef6646] data-[state=active]:shadow-sm flex-1 ${
                  activeTab === 'background' 
                    ? 'bg-[#000000] text-[#ef6646]' 
                  : backgroundLocked
                    ? 'text-green-400/90 hover:text-green-300 hover:bg-green-500/10' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-[#1C1F2B]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-semibold text-xs opacity-70">1</span>
                  <span>Background</span>
                  {backgroundLocked && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              </TabsTrigger>
              
              {/* Step 2: Abilities */}
              {!backgroundLocked ? (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 cursor-not-allowed">
                      <TabsTrigger 
                        value="abilities" 
                        disabled={true}
                        className={`relative px-4 py-2.5 text-sm font-medium rounded-md transition-all flex-1 w-full text-gray-500/50 opacity-60 pointer-events-none`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Lock className="w-3 h-3" />
                          <span className="font-semibold text-xs opacity-70">2</span>
                          <span>Abilities</span>
                </div>
                      </TabsTrigger>
              </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Complete Step 1: Background to unlock</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <TabsTrigger 
                  value="abilities" 
                  className={`relative px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-[#000000] data-[state=active]:text-[#ef6646] data-[state=active]:shadow-sm flex-1 ${
                    activeTab === 'abilities' 
                      ? 'bg-[#000000] text-[#ef6646]' 
                      : abilityScoresLocked 
                      ? 'text-green-400/90 hover:text-green-300 hover:bg-green-500/10' 
                      : 'text-gray-400 hover:text-gray-300 hover:bg-[#1C1F2B]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold text-xs opacity-70">2</span>
                    <span>Abilities</span>
                    {abilityScoresLocked && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
                </TabsTrigger>
              )}
              
              {/* Step 3: Equipment */}
              {!abilityScoresLocked ? (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 cursor-not-allowed">
                      <TabsTrigger 
                        value="equipment" 
                        disabled={true}
                        className={`relative px-4 py-2.5 text-sm font-medium rounded-md transition-all flex-1 w-full text-gray-500/50 opacity-60 pointer-events-none`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Lock className="w-3 h-3" />
                          <span className="font-semibold text-xs opacity-70">3</span>
                          <span>Equipment</span>
              </div>
                      </TabsTrigger>
            </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Complete Step 2: Abilities to unlock</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <TabsTrigger 
                  value="equipment" 
                  className={`relative px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-[#000000] data-[state=active]:text-[#ef6646] data-[state=active]:shadow-sm flex-1 ${
                    activeTab === 'equipment' 
                      ? 'bg-[#000000] text-[#ef6646]' 
                      : equipmentLocked 
                      ? 'text-green-400/90 hover:text-green-300 hover:bg-green-500/10' 
                      : 'text-gray-400 hover:text-gray-300 hover:bg-[#1C1F2B]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold text-xs opacity-70">3</span>
                    <span>Equipment</span>
                    {equipmentLocked && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                </TabsTrigger>
              )}
            </TabsList>
                    </div>

          <TabsContent value="background" className="mt-0">
            <Card className={`${theme.background.card} border ${theme.border.primary} rounded-xl`}>
              <CardContent className="p-6 md:p-8">
                <p className="text-sm text-gray-400 mb-6">
                  Select a background that fits your character's history and role. Each background provides skill proficiencies, tool proficiencies, and a special feature. <strong>Click the info icon</strong> on any card to see full details.
                </p>

                {/* Character Information Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
                    <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">Race</div>
                    <div className="text-sm text-gray-300">
                      <span className="text-white font-medium">{character.race.name}</span>
                    </div>
                  </div>
                  <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
                    <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">Class</div>
                    <div className="text-sm text-gray-300">
                      <span className="text-white font-medium">
                        {selectedStoryCharacterId 
                          ? (storyCharacters.find(c => c.id === selectedStoryCharacterId)?.class || '—') 
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#1C1F2B] border border-[#2A3340] rounded-xl p-4">
                    <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">Subrace</div>
                    <div className="text-sm text-gray-300">
                      <span className="text-white font-medium">
                        {character.subrace?.name || '—'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <BackgroundSelector
                  backgrounds={SRD_BACKGROUNDS}
                  selectedBackground={backgroundExplicit ? character.background.name : null}
                  suggestedBackgrounds={getSuggestedBackgroundsByClass()}
                  onSelect={handleBackgroundChange}
                  onLock={() => {
                    logWithDebug('info', 'Background lock button clicked', {
                      characterId: character?.id,
                      characterName: character?.name,
                      selectedBackground: character?.background?.name
                    });
                    setBackgroundLocked(true);
                    // Tab will auto-advance via useEffect
                  }}
                  isLocked={backgroundLocked}
                />
              </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="abilities" className="mt-0">
            {!backgroundLocked ? (
              <Card className={`${theme.background.card} border ${theme.border.primary} rounded-xl`}>
                <CardContent className="p-12 text-center">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Abilities Locked</h3>
                  <p className="text-sm text-gray-400">
                    Complete the Background step first to unlock ability score assignment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className={`${theme.background.card} border ${theme.border.primary} rounded-xl`}>
              <CardContent className="space-y-6 text-left p-6 md:p-8">
                
                {/* Context summary */}
                {(() => {
                  const storyChar = selectedStoryCharacterId ? storyCharacters.find(c => c.id === selectedStoryCharacterId) : null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                <div className="text-sm text-gray-300">
                  Based on your Race, Class, and Background, here are suggested scores. Modify below or assign manually.
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-400">Method: {character.abilityScoreMethod === 'standard' ? 'Standard Array' : 'Point Buy'}</Label>
                    {character.abilityScoreMethod === 'point-buy' && character.pointBuyTotal !== undefined && (
                      <Badge 
                        variant="outline" 
                        className={`${
                          character.pointBuyTotal > 27
                            ? 'bg-red-900/30 text-red-300 border-red-600/50'
                            : character.pointBuyTotal === 27
                            ? 'bg-green-900/30 text-green-300 border-green-600/50'
                            : character.pointBuyTotal >= 24
                            ? 'bg-amber-900/30 text-amber-300 border-amber-600/50'
                            : 'bg-[#2A3340] text-gray-300 border-0'
                        }`}
                      >
                        {character.pointBuyTotal}/27 points
                        {character.pointBuyTotal > 27 && (
                          <AlertCircle className="w-3 h-3 ml-1 inline" />
                        )}
                      </Badge>
                    )}
                  </div>
                  
                  {/* SRD 2014 Rule Guidance */}
                  {character.abilityScoreMethod === 'standard' && (
                    <>
                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                        <div className="text-xs font-semibold text-blue-300 mb-1">Standard Array Rules</div>
                        <div className="text-xs text-blue-400/80">
                          You must use exactly these values (in any order): <span className="font-mono font-semibold text-blue-300">15, 14, 13, 12, 10, 8</span>
                        </div>
                      </div>
                      
                    </>
                  )}
                  
                  {character.abilityScoreMethod === 'point-buy' && (
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-300 mb-1">Point Buy Rules</div>
                      <div className="text-xs text-blue-400/80 space-y-1">
                        <div>Total cost cannot exceed <span className="font-semibold text-blue-300">27 points</span></div>
                        <div className="text-[10px] text-blue-500/70 mt-1">
                          Point costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9
                        </div>
                        {character.pointBuyTotal !== undefined && character.pointBuyTotal > 27 && (
                          <div className="text-red-400 text-xs font-medium mt-2">
                            ⚠️ Exceeds maximum! Reduce scores to stay within 27 points.
                          </div>
                        )}
                        {character.pointBuyTotal !== undefined && character.pointBuyTotal < 27 && (
                          <div className="text-amber-400 text-xs mt-2">
                            {27 - character.pointBuyTotal} points remaining
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Validation Errors Summary */}
                  {Object.values(abilityScoreErrors).some(err => err !== null) && (
                    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                      <div className="text-xs font-semibold text-red-300 mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Validation Errors
                      </div>
                      <div className="text-xs text-red-400/80 space-y-1">
                        {Array.from(new Set(Object.values(abilityScoreErrors).filter(err => err !== null))).map((error, idx) => (
                          <div key={idx}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Class Tips and Presets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                      {classPresets.map(p => {
                        const isApplied = appliedPresetId === p.id;
                        return (
                          <div 
                            key={p.id} 
                            className={`flex items-start justify-between gap-3 bg-[#161D28] border rounded-lg p-3 transition-all duration-300 ${
                              isApplied 
                                ? 'border-green-500/50 bg-green-900/10' 
                                : 'border-[#2A3340]'
                            }`}
                          >
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
                              <Button 
                                size="sm" 
                                variant={isApplied ? "secondary" : "primary"}
                                onClick={() => applyPreset(p)}
                                className={isApplied ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                disabled={isApplied}
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                    Applied
                                  </>
                                ) : (
                                  'Apply'
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  {ABILITY_SCORE_NAMES.map(ability => {
                    const hasError = abilityScoreErrors[ability] !== null;
                    const score = character.abilityScores[ability];
                    const isStandardArray = character.abilityScoreMethod === 'standard';
                    // For Standard Array, 0 is valid (unassigned). For Point Buy, must be 8-15
                    const isValid = isStandardArray 
                      ? (score === 0 || (score >= 8 && score <= 15))
                      : (score >= 8 && score <= 15);
                    const availableValues = isStandardArray ? getAvailableStandardArrayValues(ability) : [];
                    const valuesWithStatus = isStandardArray ? getStandardArrayValuesWithStatus(ability) : [];
                    const currentValue = character.abilityScores[ability];
                    
                    // Get ability name for display
                    const getAbilityDisplayName = (ab: keyof AbilityScores): string => {
                      return ab.charAt(0).toUpperCase() + ab.slice(1, 3).toUpperCase();
                    };
                    
                    return (
                      <div key={ability} className="space-y-2">
                        <Label htmlFor={ability} className="capitalize text-sm text-gray-400 flex items-center gap-1">
                          {ability}
                          <span title={ABILITY_DEFINITIONS[ability as keyof AbilityScores]}>
                            <Info className="w-3 h-3 text-gray-500" aria-label="Ability info" />
                          </span>
                        </Label>
                        <div className="flex items-center space-x-2">
                          {!abilityScoresLocked ? (
                            <div className="flex flex-col gap-1">
                              {isStandardArray ? (
                                <Select
                                  value={currentValue > 0 && STANDARD_ARRAY.includes(currentValue as typeof STANDARD_ARRAY[number]) 
                                    ? currentValue.toString() 
                                    : currentValue === 0
                                    ? "0"
                                    : undefined}
                                  onValueChange={(value) => handleAbilityScoreChange(ability, parseInt(value))}
                                >
                                  <SelectTrigger 
                                    id={ability}
                                    className={`w-32 bg-[#1C1F2B] text-white border focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] ${
                                      hasError 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                        : isValid && currentValue > 0
                                        ? 'border-green-500/50'
                                        : 'border-[#2A3340]'
                                    }`}
                                  >
                                    <SelectValue placeholder="Select score" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {/* Clear/Unassign option - always available */}
                                    <SelectItem 
                                      value="0"
                                      className="text-gray-400 hover:text-gray-300 border-b border-[#2A3340] mb-1 pb-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">—</span>
                                        <span className="text-xs text-gray-500">Clear</span>
                                      </div>
                                    </SelectItem>
                                    
                                    {/* Standard Array values */}
                                    {valuesWithStatus.length > 0 ? (
                                      valuesWithStatus.map(({ value, isSelected, isTaken, takenBy }) => {
                                        const isSelectable = isSelected || !isTaken;
                                        return (
                                          <SelectItem 
                                            key={value} 
                                            value={value.toString()}
                                            disabled={!isSelectable}
                                            className={
                                              isSelected 
                                                ? "bg-green-900/20 font-semibold text-green-300" 
                                                : isTaken
                                                ? "text-gray-500 opacity-60 cursor-not-allowed"
                                                : "text-white hover:bg-[#1C1F2B]"
                                            }
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <span>{value}</span>
                                              <div className="flex items-center gap-2 ml-2">
                                                {isSelected && (
                                                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                )}
                                                {isTaken && takenBy && (
                                                  <span className="text-xs text-gray-500">
                                                    ({getAbilityDisplayName(takenBy)})
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })
                                    ) : (
                                      <SelectItem value="" disabled>
                                        No values available
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  id={ability}
                                  type="number"
                                  min="8"
                                  max="15"
                                  value={character.abilityScores[ability]}
                                  onChange={(e) => handleAbilityScoreChange(ability, e.target.value)}
                                  onBlur={(e) => {
                                    // Ensure value is clamped on blur
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                      const clamped = Math.max(8, Math.min(15, val));
                                      if (clamped !== val) {
                                        handleAbilityScoreChange(ability, clamped.toString());
                                      }
                                    }
                                  }}
                                  className={`w-16 bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] ${
                                    hasError 
                                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                      : isValid
                                      ? 'border-green-500/50'
                                      : 'border-[#2A3340]'
                                  }`}
                                />
                              )}
                              {hasError && (
                                <span className="text-xs text-red-400">{abilityScoreErrors[ability]}</span>
                              )}
                            </div>
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
                    );
                  })}
                </div>

                {/* Lock Ability Scores Button */}
                {(() => {
                  const shouldShow = !abilityScoresLocked && hasEditedScores;
                  if (shouldShow) {
                    logWithDebug('info', 'Lock Ability Scores button is visible', {
                      abilityScoresLocked,
                      hasEditedScores,
                      abilityScores: character?.abilityScores
                    });
                  }
                  return shouldShow;
                })() && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => {
                        logWithDebug('info', 'Lock Ability Scores button clicked', {
                          characterId: character?.id,
                          characterName: character?.name,
                          abilityScores: character?.abilityScores,
                          abilityScoreMethod: character?.abilityScoreMethod
                        });
                        setAbilityScoresLocked(true);
                        // Tab will auto-advance via useEffect
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
                        <p className="text-xs text-green-400/80">You can now proceed to equipment selection.</p>
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
              </Card>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="mt-0">
            {!abilityScoresLocked ? (
              <Card className={`${theme.background.card} border ${theme.border.primary} rounded-xl`}>
                <CardContent className="p-12 text-center">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Equipment Locked</h3>
                  <p className="text-sm text-gray-400">
                    Complete the Abilities step first to unlock equipment selection.
                  </p>
                </CardContent>
        </Card>
            ) : (
              <Card className={`${theme.background.card} border ${theme.border.primary} rounded-xl`}>
              <CardContent className="space-y-6 text-left p-6 md:p-8">
                
                {/* Success Banner */}
                {abilityScoresLocked && !equipmentLocked && (
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-green-400/80">
                        Select your starting gear based on your character's background and race. You may use the suggested loadout or customize freely.
                      </p>
                    </div>
                  </div>
                )}

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

                {/* Suggested Equipment */}
                <div className="bg-[#131A24] border border-[#2A3340] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Suggested Equipment</h3>
                    <Button 
                      size="sm" 
                      variant={appliedLoadout ? "secondary" : "primary"}
                      onClick={applySuggestedEquipment}
                      disabled={equipmentLocked || appliedLoadout}
                      className={appliedLoadout ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {appliedLoadout ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          Applied
                        </>
                      ) : (
                        'Use Suggested Loadout'
                      )}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
                                    <span className="text-[#ef6646]">•</span>
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
                                    <span className="text-[#ef6646]">•</span>
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
                                    <span className="text-[#ef6646]">•</span>
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
                                    <span className="text-[#ef6646]">•</span>
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
                <div className={`space-y-4 transition-all duration-300 ${
                  appliedLoadout 
                    ? 'border-2 border-green-500/50 bg-green-900/10 rounded-xl p-4' 
                    : ''
                }`}>
                  <h3 className="text-sm font-semibold text-white border-b border-[#2A3340] pb-2">Custom Equipment Selection</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] min-h-[60px]"
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
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646]"
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
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] min-h-[60px]"
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
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] min-h-[60px]"
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
                        className="bg-[#1C1F2B] text-white placeholder:text-gray-500 py-2 px-3 rounded-lg border border-[#2A3340] focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>


                {/* Lock Equipment Button */}
                {(() => {
                  const shouldShow = !equipmentLocked;
                  if (shouldShow) {
                    logWithDebug('info', 'Lock Equipment button is visible', {
                      equipmentLocked,
                      abilityScoresLocked,
                      selectedEquipment
                    });
                  }
                  return shouldShow;
                })() && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => {
                        logWithDebug('info', 'Lock Equipment button clicked', {
                          characterId: character?.id,
                          characterName: character?.name,
                          selectedEquipment: selectedEquipment
                        });
                        setEquipmentLocked(true);
                        logWithDebug('info', 'Equipment locked, character sheet complete', {
                          equipmentLocked: true,
                          allStepsComplete: true,
                          backgroundLocked,
                          abilityScoresLocked,
                          equipmentLocked: true
                        });
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
              </CardContent>
        </Card>
            )}
          </TabsContent>
        </Tabs>
        </TooltipProvider>
      )}

      {/* Character Sheet Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Race Details Section */}
        <Card className="bg-[#151A22] border border-[#2A3340] rounded-xl shadow-lg shadow-black/40">
          <Collapsible 
            open={expandedSections.has('race-details')} 
            onOpenChange={() => toggleSection('race-details')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer group hover:bg-[#1C1F2B] transition-colors rounded-t-xl">
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2 group-hover:text-[#ef6646]">
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
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2 group-hover:text-[#ef6646]">
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
