import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import GmIntentModal from './GmIntentModal';
import type { Character } from '../types/macro-chain';

interface CharacterFormProps {
  character: Character;
  onSave: (character: Character) => void;
  onClose: () => void;
  isLocked: boolean;
  sessionId?: string;
}

const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good', 
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil'
];

const CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard'
];

const RACES = [
  'Human',
  'Elf',
  'Dwarf',
  'Halfling',
  'Gnome',
  'Dragonborn',
  'Tiefling',
  'Aasimar',
  'Triton',
  'Goliath',
  'Tabaxi',
  'Tortle',
  'Half-Orc',
  'Half-Elf',
  'Aarakocra',
  'Genasi',
  'Gith',
  'Kenku',
  'Lizardfolk',
  'Minotaur',
  'Yuan-ti'
];

const BACKGROUNDS = [
  'Acolyte',
  'Criminal',
  'Folk Hero',
  'Noble',
  'Sage',
  'Soldier',
  'Charlatan',
  'Entertainer',
  'Guild Artisan',
  'Hermit',
  'Outlander',
  'Sailor'
];

export default function CharacterForm({ character, onSave, onClose, isLocked, sessionId }: CharacterFormProps) {
  const [formData, setFormData] = useState<Character>(character);
  const [showGmIntentModal, setShowGmIntentModal] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setFormData(character);
  }, [character]);

  const handleChange = (field: keyof Character, value: string | string[] | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper component for array fields
  const ArrayField = ({ 
    fieldName, 
    label, 
    placeholder = "Enter items separated by commas"
  }: { 
    fieldName: keyof Character; 
    label: string; 
    placeholder?: string;
  }) => {
    const value = (formData[fieldName] as string[]) || [];
    const stringValue = value.join(', ');
    
    const handleArrayChange = (inputValue: string) => {
      const array = inputValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
      handleChange(fieldName, array);
    };
    
    return (
      <div>
        <Label htmlFor={fieldName}>{label}</Label>
        <Input
          id={fieldName}
          value={stringValue}
          onChange={(e) => handleArrayChange(e.target.value)}
          placeholder={placeholder}
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple items with commas
        </p>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleRegenerateField = (fieldName: string) => {
    if (!sessionId) {
      alert('Session ID is required for regeneration');
      return;
    }
    setRegeneratingField(fieldName);
    setShowGmIntentModal(true);
  };

  const handleGmIntentConfirm = async (intent: string) => {
    if (!regeneratingField || !sessionId) return;

    setIsRegenerating(true);
    setShowGmIntentModal(false);

    try {
      const response = await fetch('/api/characters/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          characterId: formData.id,
          fieldName: regeneratingField,
          gmIntent: intent || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate field');
      }

      const result = await response.json();
      
      // Update the form data with the regenerated field
      setFormData(prev => ({
        ...prev,
        [regeneratingField]: result.regeneratedField
      }));

      // Also update the character in the parent component
      onSave({
        ...formData,
        [regeneratingField]: result.regeneratedField
      });

    } catch (error) {
      const errorMessage = (error as any).message || 'Unknown error';
      console.error('Error regenerating field:', error);
      alert(`Error regenerating field: ${errorMessage}`);
    } finally {
      setIsRegenerating(false);
      setRegeneratingField(null);
    }
  };

  const handleGmIntentCancel = () => {
    setShowGmIntentModal(false);
    setRegeneratingField(null);
  };

  // Helper component for fields with regenerate buttons
  const FieldWithRegenerate = ({ 
    fieldName, 
    label, 
    children, 
    isTextarea = false 
  }: { 
    fieldName: string; 
    label: string; 
    children: React.ReactNode; 
    isTextarea?: boolean;
  }) => {
    const canRegenerate = sessionId && !isLocked;
    
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor={fieldName}>{label}</Label>
          {canRegenerate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRegenerateField(fieldName)}
              disabled={isRegenerating}
              className="text-xs"
            >
              {isRegenerating && regeneratingField === fieldName ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Regenerating...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </>
              )}
            </Button>
          )}
        </div>
        {children}
      </div>
    );
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Characters Locked</h3>
            <p className="text-sm text-gray-600 mb-4">
              Characters are locked and cannot be edited. Unlock them first to make changes.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Edit Character</h2>
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Character Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter character name"
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                placeholder="e.g., Wandering Scholar, Mercenary Captain"
                required
              />
            </div>
            <div>
              <Label htmlFor="race">Race *</Label>
              <Select value={formData.race || ''} onValueChange={(value) => handleChange('race', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select race" />
                </SelectTrigger>
                <SelectContent>
                  {RACES.map(race => (
                    <SelectItem key={race} value={race}>{race}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="class">Class *</Label>
              <Select value={formData.class || ''} onValueChange={(value) => handleChange('class', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subrace">Subrace</Label>
              <Input
                id="subrace"
                value={formData.subrace || ''}
                onChange={(e) => handleChange('subrace', e.target.value)}
                placeholder="e.g., High Elf, Wood Elf, Mountain Dwarf"
              />
            </div>
            <div>
              <Label htmlFor="alignment">Alignment</Label>
              <Select value={formData.alignment || ''} onValueChange={(value) => handleChange('alignment', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  {ALIGNMENTS.map(alignment => (
                    <SelectItem key={alignment} value={alignment}>{alignment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                placeholder="Character's age in years"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={formData.height || ''}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="e.g., 5'7&quot;, 6'2&quot;"
              />
            </div>
            <div>
              <Label htmlFor="deity">Deity</Label>
              <Input
                id="deity"
                value={formData.deity || ''}
                onChange={(e) => handleChange('deity', e.target.value)}
                placeholder="Religious affiliation or deity"
              />
            </div>
          </div>

          {/* Character Details */}
          <FieldWithRegenerate fieldName="personality" label="Personality *">
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              placeholder="2-3 sentences describing their personality traits and behavior"
              rows={3}
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="motivation" label="Motivation *">
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => handleChange('motivation', e.target.value)}
              placeholder="What drives them in this specific story?"
              rows={2}
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="connectionToStory" label="Connection to Story *">
            <Textarea
              id="connectionToStory"
              value={formData.connectionToStory}
              onChange={(e) => handleChange('connectionToStory', e.target.value)}
              placeholder="Direct link to the background context or story premise"
              rows={2}
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="voiceTone" label="Voice Tone *">
            <Input
              id="voiceTone"
              value={formData.voiceTone}
              onChange={(e) => handleChange('voiceTone', e.target.value)}
              placeholder="e.g., Soft and deliberate, Gruff and direct"
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="inventoryHint" label="Inventory Hint *">
            <Input
              id="inventoryHint"
              value={formData.inventoryHint}
              onChange={(e) => handleChange('inventoryHint', e.target.value)}
              placeholder="e.g., An aged journal, A rusted locket"
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="backgroundHistory" label="Background History *">
            <Textarea
              id="backgroundHistory"
              value={formData.backgroundHistory}
              onChange={(e) => handleChange('backgroundHistory', e.target.value)}
              placeholder="1-2 paragraphs of their full backstory including upbringing and defining events"
              rows={4}
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="flawOrWeakness" label="Flaw or Weakness *">
            <Textarea
              id="flawOrWeakness"
              value={formData.flawOrWeakness}
              onChange={(e) => handleChange('flawOrWeakness', e.target.value)}
              placeholder="Defining flaw, vice, or vulnerability that makes them human"
              rows={2}
              required
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="gmSecret" label="GM Secret *">
            <Textarea
              id="gmSecret"
              value={formData.gmSecret}
              onChange={(e) => handleChange('gmSecret', e.target.value)}
              placeholder="Hidden truth or past connection that players don't know"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This information is only visible to the GM and will be masked in the character list.
            </p>
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="potentialConflict" label="Potential Conflict *">
            <Textarea
              id="potentialConflict"
              value={formData.potentialConflict}
              onChange={(e) => handleChange('potentialConflict', e.target.value)}
              placeholder="Internal or external tension that could cause problems"
              rows={2}
              required
            />
          </FieldWithRegenerate>

          {/* Additional Character Sheet Fields */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Character Sheet Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ArrayField 
                fieldName="languages" 
                label="Languages" 
                placeholder="e.g., Common, Elvish, Dwarvish, Draconic"
              />
              <ArrayField 
                fieldName="proficiencies" 
                label="Proficiencies" 
                placeholder="e.g., Athletics, Stealth, Thieves' Tools, Herbalism Kit"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <ArrayField 
                fieldName="equipmentPreferences" 
                label="Equipment Preferences" 
                placeholder="e.g., Quarterstaff, Spellbook, Component pouch, Ink and quill"
              />
              <ArrayField 
                fieldName="motifAlignment" 
                label="Motif Alignment" 
                placeholder="e.g., decay, secrets, family curses"
              />
            </div>

            <div className="mt-4">
              <FieldWithRegenerate fieldName="physicalDescription" label="Physical Description">
                <Textarea
                  id="physicalDescription"
                  value={formData.physicalDescription || ''}
                  onChange={(e) => handleChange('physicalDescription', e.target.value)}
                  placeholder="Detailed appearance including build, distinguishing features, clothing style"
                  rows={3}
                />
              </FieldWithRegenerate>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Save Character
            </Button>
          </div>
        </form>

        {/* GM Intent Modal */}
        <GmIntentModal
          isOpen={showGmIntentModal}
          onClose={handleGmIntentCancel}
          onConfirm={handleGmIntentConfirm}
          fieldName={regeneratingField || ''}
          characterName={formData.name}
        />
      </div>
    </div>
  );
}
