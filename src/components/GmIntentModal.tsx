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
  hasRoleChanged?: boolean;
  newClass?: string;
  newRace?: string;
  newRole?: string;
  defaultIntent?: string;
  isBulk?: boolean;
  bulkCount?: number;
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
  hasRoleChanged = false,
  newClass,
  newRace,
  newRole,
  defaultIntent = '',
  isBulk = false,
  bulkCount = 0
}: GmIntentModalProps) {
  const [intent, setIntent] = useState(defaultIntent);
  const log = logger.ui;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    log.info('GM Intent Modal submit', { characterName, fieldName, hasIntent: intent.trim().length > 0 });
    debug.info('GmIntentModal', 'Submit', { characterName, fieldName, hasIntent: intent.trim().length > 0 });
    onConfirm(intent.trim());
    setIntent('');
  };

  useEffect(() => {
    if (isOpen) {
      setIntent(defaultIntent);
    }
  }, [isOpen, defaultIntent]);

  const fieldDisplayName = isBulk
    ? 'Affected Sections'
    : fieldDisplayNames[fieldName as keyof typeof fieldDisplayNames] || fieldName;

  // Determine context-aware title and message
  const changedAttributes = [
    hasClassChanged ? { label: 'Class', value: newClass } : null,
    hasRaceChanged ? { label: 'Race', value: newRace } : null,
    hasRoleChanged ? { label: 'Role', value: newRole } : null,
  ].filter(Boolean) as Array<{ label: string; value?: string }>;

  const formatList = (items: string[]) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  };

  const getModalTitle = () => {
    if (isBulk) {
      return "Regenerate All Affected Sections";
    }
    if (!changedAttributes.length) {
      return "Regenerate Section";
    }
    const labels = changedAttributes.map(attr => attr.label);
    return `Regenerate Section Based on New ${formatList(labels)}`;
  };
  
  const getBodyText = () => {
    if (isBulk) {
      if (!changedAttributes.length) {
        return {
          main: `Would you like to regenerate every affected section with fresh suggestions?`,
          recommendation: `This ensures the ${fieldDisplayName.toLowerCase()} reflect your latest updates.`
        };
      }
      return {
        main: `The ${formatList(changedAttributes.map(attr => attr.value ? `${attr.label.toLowerCase()} has changed to ${attr.value}` : `${attr.label.toLowerCase()} has been updated`))}. Regenerate all impacted sections (${bulkCount || 'multiple'}) to keep them aligned?`,
        recommendation: `This is recommended so the character’s ${fieldDisplayName.toLowerCase()} match the updated inputs.`
      };
    }
    if (!changedAttributes.length) {
      return {
        main: `Would you like to regenerate this section with fresh suggestions?`,
        recommendation: `This will generate new options while maintaining consistency with the character's existing background and story.`
      };
    }

    const changePhrases = changedAttributes
      .map(attr => {
        if (attr.value) {
          return `the ${attr.label.toLowerCase()} has changed to ${attr.value}`;
        }
        return `the ${attr.label.toLowerCase()} has been updated`;
      });

    return {
      main: `The ${formatList(changePhrases)}. Would you like to regenerate this section to reflect these changes?`,
      recommendation: `This is recommended to ensure the character's ${fieldDisplayName.toLowerCase()} matches their updated ${formatList(changedAttributes.map(attr => attr.label.toLowerCase()))}.`
    };
  };
  
  const getIntentPlaceholder = () => {
    if (isBulk) {
      if (!changedAttributes.length) {
        return "Leave blank to use the existing character context.";
      }
      const details = changedAttributes
        .map(attr => attr.value ? `${attr.label.toLowerCase()} (${attr.value})` : attr.label.toLowerCase());
      return `Leave blank to use the default ${formatList(details)} context for all sections.`;
    }
    if (!changedAttributes.length) {
      return "Leave blank to use existing character context.";
    }
    const details = changedAttributes
      .map(attr => attr.value ? `${attr.label.toLowerCase()} (${attr.value})` : attr.label.toLowerCase());
    return `Leave blank to use the default ${formatList(details)} context.`;
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
