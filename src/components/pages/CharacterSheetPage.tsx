import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, ChevronRight, Save, Download, AlertCircle, Users, Plus } from 'lucide-react';
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
  };

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
      ruleset: 'SRD2014',
      abilityScores: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8
      },
      abilityScoreMethod: 'standard',
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Characters Available</h2>
          <p className="text-gray-600 mb-6">
            Create and lock characters in the Characters tab first, then return here to create their SRD 2014 character sheets.
          </p>
          <div className="flex justify-center">
            <Button 
              onClick={() => window.location.hash = '#characters'} 
              className="bg-blue-600 hover:bg-blue-700"
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
            <h1 className="text-3xl font-bold text-gray-900">Character Sheet</h1>
            <p className="text-gray-600 mt-2">
              Create SRD 2014 character sheets from your story characters or load existing saved sheets.
            </p>
          </div>
        </div>

        {/* Saved SRD Characters Section */}
        {savedSRDCharacters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Saved Character Sheets ({savedSRDCharacters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedSRDCharacters.map((srdChar) => (
                  <div key={srdChar.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{srdChar.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        Level {srdChar.level}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Race:</span> {srdChar.race.name}</div>
                      <div><span className="font-medium">Background:</span> {srdChar.background.name}</div>
                      {srdChar.subrace && (
                        <div><span className="font-medium">Subrace:</span> {srdChar.subrace.name}</div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setCharacter(srdChar);
                          validateCharacterData(srdChar);
                        }}
                        className="flex-1"
                      >
                        Load Sheet
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                    <Card key={storyChar.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{storyChar.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{storyChar.race}</Badge>
                          <Badge variant="outline" className="text-xs">{storyChar.class}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Role</Label>
                          <p className="text-sm text-gray-600">{storyChar.role}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Personality</Label>
                          <p className="text-sm text-gray-600 line-clamp-2">{storyChar.personality}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Motivation</Label>
                          <p className="text-sm text-gray-600 line-clamp-2">{storyChar.motivation}</p>
                        </div>
                        
                        {/* Suggested SRD Choices */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <Label className="text-sm font-medium text-blue-800">Suggested SRD Choices</Label>
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-blue-700">
                              <span className="font-medium">Race:</span> {suggestedRace.name}
                            </div>
                            <div className="text-xs text-blue-700">
                              <span className="font-medium">Background:</span> {suggestedBackground.name}
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            console.log('Button clicked for character:', storyChar.name);
                            handleCreateFromStoryCharacter(storyChar);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
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
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Users className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Character Sheet Creation</h3>
              <div className="mt-2 text-sm text-blue-700">
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
          <h2 className="text-2xl font-bold text-gray-900">Character Sheet</h2>
          <p className="text-gray-600 mt-1">
            View and edit your SRD 2014 character details
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-xs">
            {character.ruleset}
          </Badge>
          <Badge variant="outline" className="text-xs">
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              <div className="mt-2 text-sm text-red-700">
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
      <div className="flex space-x-4">
        <Button
          onClick={() => {
            setCharacter(null);
            setSelectedStoryCharacterId(null);
            setIsEditing(false);
          }}
          variant="outline"
        >
          Back to Selection
        </Button>
        
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          className={isEditing ? "" : "bg-green-600 hover:bg-green-700"}
        >
          {isEditing ? 'View Mode' : 'Edit Mode'}
        </Button>
        
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={loading || validationErrors.length > 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Character'}
          </Button>
        )}
        
        <Button
          onClick={handleExport}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      {/* Character Sheet Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Story Character Reference */}
        {selectedStoryCharacterId && (
          <Card className="lg:col-span-2">
            <Collapsible 
              open={expandedSections.has('story-reference')} 
              onOpenChange={() => toggleSection('story-reference')}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
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
                <CardContent className="space-y-4">
                  {(() => {
                    const storyChar = storyCharacters.find(c => c.id === selectedStoryCharacterId);
                    if (!storyChar) return null;
                    
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Original Role</Label>
                            <p className="text-sm text-gray-600">{storyChar.role}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Class</Label>
                            <p className="text-sm text-gray-600">{storyChar.class}</p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Personality</Label>
                          <p className="text-sm text-gray-600">{storyChar.personality}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Motivation</Label>
                          <p className="text-sm text-gray-600">{storyChar.motivation}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Connection to Story</Label>
                          <p className="text-sm text-gray-600">{storyChar.connectionToStory}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Background History</Label>
                          <p className="text-sm text-gray-600">{storyChar.backgroundHistory}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Flaw or Weakness</Label>
                          <p className="text-sm text-gray-600">{storyChar.flawOrWeakness}</p>
                        </div>
                        
                        {storyChar.keyRelationships.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Key Relationships</Label>
                            <div className="text-sm text-gray-600">
                              {storyChar.keyRelationships.map((rel, index) => (
                                <div key={index}>• {rel}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Additional SRD Fields */}
                        {storyChar.languages && storyChar.languages.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Languages</Label>
                            <div className="text-sm text-gray-600">
                              {storyChar.languages.join(', ')}
                            </div>
                          </div>
                        )}
                        
                        {storyChar.alignment && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Alignment</Label>
                            <p className="text-sm text-gray-600">{storyChar.alignment}</p>
                          </div>
                        )}
                        
                        {storyChar.deity && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Deity</Label>
                            <p className="text-sm text-gray-600">{storyChar.deity}</p>
                          </div>
                        )}
                        
                        {storyChar.physicalDescription && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Physical Description</Label>
                            <p className="text-sm text-gray-600">{storyChar.physicalDescription}</p>
                          </div>
                        )}
                        
                        {storyChar.equipmentPreferences && storyChar.equipmentPreferences.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Equipment Preferences</Label>
                            <div className="text-sm text-gray-600">
                              {storyChar.equipmentPreferences.map((item, index) => (
                                <div key={index}>• {item}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {storyChar.subrace && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Subrace</Label>
                            <p className="text-sm text-gray-600">{storyChar.subrace}</p>
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
        <Card>
          <Collapsible 
            open={expandedSections.has('core-info')} 
            onOpenChange={() => toggleSection('core-info')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <span>Core Information</span>
                  {expandedSections.has('core-info') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Character Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={character.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">{character.name}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="level">Level</Label>
                    {isEditing ? (
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        max="20"
                        value={character.level}
                        onChange={(e) => handleFieldChange('level', parseInt(e.target.value) || 1)}
                      />
                    ) : (
                      <div className="text-lg font-semibold text-gray-900">{character.level}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="ruleset">Ruleset</Label>
                    <div className="text-lg font-semibold text-gray-900">{character.ruleset}</div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="race">Race</Label>
                  {isEditing ? (
                    <Select value={character.race.name} onValueChange={handleRaceChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SRD_RACES.map(race => (
                          <SelectItem key={race.name} value={race.name}>{race.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">{character.race.name}</div>
                  )}
                </div>

                {character.subrace && (
                  <div>
                    <Label htmlFor="subrace">Subrace</Label>
                    {isEditing ? (
                      <Select value={character.subrace.name} onValueChange={handleSubraceChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {character.race.subraces?.map(subrace => (
                            <SelectItem key={subrace.name} value={subrace.name}>{subrace.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-lg font-semibold text-gray-900">{character.subrace.name}</div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="background">Background</Label>
                  {isEditing ? (
                    <Select value={character.background.name} onValueChange={handleBackgroundChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SRD_BACKGROUNDS.map(background => (
                          <SelectItem key={background.name} value={background.name}>{background.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">{character.background.name}</div>
                  )}
                </div>

                {/* Custom Fields from Story Character */}
                {(character.customAge || character.customHeight || character.customPhysicalDescription) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Story Character Details</h4>
                    
                    {character.customAge && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-600">Age</Label>
                        <div className="text-sm text-gray-900">{character.customAge} years</div>
                      </div>
                    )}
                    
                    {character.customHeight && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-600">Height</Label>
                        <div className="text-sm text-gray-900">{character.customHeight}</div>
                      </div>
                    )}
                    
                    {character.customPhysicalDescription && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-600">Physical Description</Label>
                        <div className="text-sm text-gray-900">{character.customPhysicalDescription}</div>
                      </div>
                    )}
                    
                    {character.customEquipmentPreferences && character.customEquipmentPreferences.length > 0 && (
                      <div className="mb-2">
                        <Label className="text-sm font-medium text-gray-600">Equipment Preferences</Label>
                        <div className="text-sm text-gray-900">
                          {character.customEquipmentPreferences.map((item, index) => (
                            <div key={index}>• {item}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Ability Scores Section */}
        <Card>
          <Collapsible 
            open={expandedSections.has('ability-scores')} 
            onOpenChange={() => toggleSection('ability-scores')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <span>Ability Scores</span>
                  {expandedSections.has('ability-scores') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Method: {character.abilityScoreMethod === 'standard' ? 'Standard Array' : 'Point Buy'}</Label>
                  {character.abilityScoreMethod === 'point-buy' && character.pointBuyTotal && (
                    <Badge variant="outline">
                      {character.pointBuyTotal}/27 points
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {ABILITY_SCORE_NAMES.map(ability => (
                    <div key={ability} className="space-y-2">
                      <Label htmlFor={ability} className="capitalize">{ability}</Label>
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <Input
                            id={ability}
                            type="number"
                            min="8"
                            max="15"
                            value={character.abilityScores[ability]}
                            onChange={(e) => handleAbilityScoreChange(ability, e.target.value)}
                            className="w-16"
                          />
                        ) : (
                          <div className="w-16 text-center text-lg font-semibold text-gray-900">
                            {character.abilityScores[ability]}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          ({character.abilityModifiers[ability] >= 0 ? '+' : ''}{character.abilityModifiers[ability]})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Race Details Section */}
        <Card>
          <Collapsible 
            open={expandedSections.has('race-details')} 
            onOpenChange={() => toggleSection('race-details')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <span>Race Details</span>
                  {expandedSections.has('race-details') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ability Score Increases</Label>
                  <div className="text-sm text-gray-600">
                    {Object.entries(character.race.abilityScoreIncrease).map(([ability, bonus]) => (
                      <div key={ability} className="capitalize">
                        {ability}: +{bonus}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Traits</Label>
                  <div className="space-y-2">
                    {character.race.traits.map((trait, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-gray-900">{trait.name}</div>
                        <div className="text-gray-600">{trait.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Languages</Label>
                  <div className="text-sm text-gray-600">
                    {character.race.languages.join(', ')}
                  </div>
                </div>
                
                {/* Custom Languages from Story Character */}
                {character.customLanguages && character.customLanguages.length > 0 && (
                  <div>
                    <Label>Story Languages</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.customLanguages.map((language, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Speed</Label>
                    <div className="text-gray-600">{character.race.speed} ft.</div>
                  </div>
                  <div>
                    <Label>Size</Label>
                    <div className="text-gray-600">{character.race.size}</div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Background Details Section */}
        <Card>
          <Collapsible 
            open={expandedSections.has('background-details')} 
            onOpenChange={() => toggleSection('background-details')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <span>Background Details</span>
                  {expandedSections.has('background-details') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <Label>Skill Proficiencies</Label>
                  <div className="text-sm text-gray-600">
                    {character.background.skillProficiencies.join(', ')}
                  </div>
                </div>
                
                {character.background.toolProficiencies.length > 0 && (
                  <div>
                    <Label>Tool Proficiencies</Label>
                    <div className="text-sm text-gray-600">
                      {character.background.toolProficiencies.join(', ')}
                    </div>
                  </div>
                )}
                
                {character.background.languages.length > 0 && (
                  <div>
                    <Label>Languages</Label>
                    <div className="text-sm text-gray-600">
                      {character.background.languages.join(', ')}
                    </div>
                  </div>
                )}
                
                {/* Custom Proficiencies from Story Character */}
                {character.customProficiencies && character.customProficiencies.length > 0 && (
                  <div>
                    <Label>Story Proficiencies</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.customProficiencies.map((proficiency, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {proficiency}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label>Equipment</Label>
                  <div className="text-sm text-gray-600 space-y-1">
                    {character.background.equipment.map((item, index) => (
                      <div key={index}>• {item}</div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Feature: {character.background.feature.name}</Label>
                  <div className="text-sm text-gray-600">
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
