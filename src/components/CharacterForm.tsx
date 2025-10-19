import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Character } from '../types/macro-chain';

interface CharacterFormProps {
  character: Character;
  onSave: (character: Character) => void;
  onClose: () => void;
  isLocked: boolean;
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
  'Triton',
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

export default function CharacterForm({ character, onSave, onClose, isLocked }: CharacterFormProps) {
  const [formData, setFormData] = useState<Character>(character);

  useEffect(() => {
    setFormData(character);
  }, [character]);

  const handleChange = (field: keyof Character, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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
          </div>

          {/* Character Details */}
          <div>
            <Label htmlFor="personality">Personality *</Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              placeholder="2-3 sentences describing their personality traits and behavior"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="motivation">Motivation *</Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => handleChange('motivation', e.target.value)}
              placeholder="What drives them in this specific story?"
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="connectionToStory">Connection to Story *</Label>
            <Textarea
              id="connectionToStory"
              value={formData.connectionToStory}
              onChange={(e) => handleChange('connectionToStory', e.target.value)}
              placeholder="Direct link to the background context or story premise"
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="voiceTone">Voice Tone *</Label>
            <Input
              id="voiceTone"
              value={formData.voiceTone}
              onChange={(e) => handleChange('voiceTone', e.target.value)}
              placeholder="e.g., Soft and deliberate, Gruff and direct"
              required
            />
          </div>

          <div>
            <Label htmlFor="inventoryHint">Inventory Hint *</Label>
            <Input
              id="inventoryHint"
              value={formData.inventoryHint}
              onChange={(e) => handleChange('inventoryHint', e.target.value)}
              placeholder="e.g., An aged journal, A rusted locket"
              required
            />
          </div>

          <div>
            <Label htmlFor="backgroundHistory">Background History *</Label>
            <Textarea
              id="backgroundHistory"
              value={formData.backgroundHistory}
              onChange={(e) => handleChange('backgroundHistory', e.target.value)}
              placeholder="1-2 paragraphs of their full backstory including upbringing and defining events"
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="flawOrWeakness">Flaw or Weakness *</Label>
            <Textarea
              id="flawOrWeakness"
              value={formData.flawOrWeakness}
              onChange={(e) => handleChange('flawOrWeakness', e.target.value)}
              placeholder="Defining flaw, vice, or vulnerability that makes them human"
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="gmSecret">GM Secret *</Label>
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
          </div>

          <div>
            <Label htmlFor="potentialConflict">Potential Conflict *</Label>
            <Textarea
              id="potentialConflict"
              value={formData.potentialConflict}
              onChange={(e) => handleChange('potentialConflict', e.target.value)}
              placeholder="Internal or external tension that could cause problems"
              rows={2}
              required
            />
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
      </div>
    </div>
  );
}
