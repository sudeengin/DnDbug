import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import logger from '@/utils/logger';
import debug from '../lib/simpleDebug';

interface GmIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (intent: string) => void;
  fieldName: string;
  characterName: string;
  isLoading?: boolean;
  hasClassChanged?: boolean;
  hasRaceChanged?: boolean;
  newClass?: string;
  newRace?: string;
}

const fieldDisplayNames = {
  personality: 'Personality',
  motivation: 'Motivation',
  connectionToStory: 'Connection to Story',
  gmSecret: 'GM Secret',
  potentialConflict: 'Potential Conflict',
  voiceTone: 'Voice Tone',
  inventoryHint: 'Inventory Hint',
  backgroundHistory: 'Background History',
  flawOrWeakness: 'Flaw or Weakness',
  physicalDescription: 'Physical Description',
  languages: 'Languages',
  proficiencies: 'Proficiencies',
  equipmentPreferences: 'Equipment Preferences',
  motifAlignment: 'Motif Alignments'
};

export default function GmIntentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  fieldName, 
  characterName,
  isLoading = false,
  hasClassChanged = false,
  hasRaceChanged = false,
  newClass,
  newRace
}: GmIntentModalProps) {
  const [intent, setIntent] = useState('');
  const log = logger.ui;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    log.info('GM Intent Modal submit', { characterName, fieldName, hasIntent: intent.trim().length > 0 });
    debug.info('GmIntentModal', 'Submit', { characterName, fieldName, hasIntent: intent.trim().length > 0 });
    onConfirm(intent.trim());
    setIntent('');
  };

  const fieldDisplayName = fieldDisplayNames[fieldName as keyof typeof fieldDisplayNames] || fieldName;

  // Determine context-aware title and message
  const hasChanges = hasClassChanged || hasRaceChanged;
  
  const getModalTitle = () => {
    if (hasClassChanged && hasRaceChanged) {
      return "Regenerate Section Based on New Class and Race";
    } else if (hasClassChanged) {
      return "Regenerate Section Based on New Class";
    } else if (hasRaceChanged) {
      return "Regenerate Section Based on New Race";
    }
    return "Regenerate Section";
  };
  
  const getBodyText = () => {
    if (hasClassChanged && hasRaceChanged) {
      return {
        main: `The selected class has changed to ${newClass} and race has changed to ${newRace}. Would you like to regenerate this section to reflect these changes?`,
        recommendation: `This is recommended to ensure the character's ${fieldDisplayName.toLowerCase()} match their updated class and race.`
      };
    } else if (hasClassChanged) {
      return {
        main: `The selected class has changed to ${newClass}. Would you like to regenerate this section to reflect the new class?`,
        recommendation: `This is recommended to ensure the character's ${fieldDisplayName.toLowerCase()} match their updated class.`
      };
    } else if (hasRaceChanged) {
      return {
        main: `The selected race has changed to ${newRace}. Would you like to regenerate this section to reflect the new race?`,
        recommendation: `This is recommended to ensure the character's ${fieldDisplayName.toLowerCase()} match their updated race.`
      };
    }
    return {
      main: `Would you like to regenerate this section with fresh suggestions?`,
      recommendation: `This will generate new options while maintaining consistency with the character's existing background and story.`
    };
  };

  const getIntentPlaceholder = () => {
    if (hasClassChanged && !hasRaceChanged && newClass) {
      return `Leave blank to use the default ${newClass} context.`;
    } else if (hasRaceChanged && !hasClassChanged && newRace) {
      return `Leave blank to use the default ${newRace} context.`;
    } else if (hasClassChanged && hasRaceChanged && newClass && newRace) {
      return `Leave blank to use the default ${newClass} and ${newRace} context.`;
    }
    return "Leave blank to use existing character context.";
  };

  useEffect(() => {
    if (isOpen) {
      log.info('GM Intent Modal open', { characterName, fieldName });
      debug.info('GmIntentModal', 'Open', { characterName, fieldName });
    }
    return () => {
      if (isOpen) {
        log.warn('GM Intent Modal closed', { characterName, fieldName });
        debug.warn('GmIntentModal', 'Closed', { characterName, fieldName });
      }
    };
  }, [isOpen, characterName, fieldName]);

  if (!isOpen) return null;

  const bodyText = getBodyText();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-200">
            {getModalTitle()}
          </h3>
          <Button variant="tertiary" onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Body */}
        <div className="mb-6 space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            {bodyText.main}
          </p>
          
          <p className="text-sm text-gray-400 leading-relaxed">
            {bodyText.recommendation}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Optional Intent Field */}
          <div>
            <Label htmlFor="intent" className="text-gray-300 text-sm mb-2 block">
              GM Intent (Optional)
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              You can add a short instruction to guide the regeneration.
            </p>
            <Textarea
              id="intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder={getIntentPlaceholder()}
              rows={3}
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500 px-4 py-2"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0a12 12 0 100 24v-4a8 8 0 01-8-8z" />
                  </svg>
                  Regenerating...
                </span>
              ) : (
                'Regenerate Section'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
