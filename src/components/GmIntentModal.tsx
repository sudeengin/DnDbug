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
  physicalDescription: 'Physical Description'
};

export default function GmIntentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  fieldName, 
  characterName,
  isLoading = false
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

  const handleSkip = () => {
    log.info('GM Intent Modal skip', { characterName, fieldName });
    debug.info('GmIntentModal', 'Skip', { characterName, fieldName });
    onConfirm('');
    setIntent('');
  };

  const fieldDisplayName = fieldDisplayNames[fieldName as keyof typeof fieldDisplayNames] || fieldName;

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-200">
            Regenerate {fieldDisplayName}
          </h3>
          <Button variant="tertiary" onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-2">
            Regenerating <strong>{fieldDisplayName}</strong> for <strong>{characterName}</strong>
          </p>
          <p className="text-sm text-gray-400">
            Optionally provide your intent or specific direction for the regeneration. 
            Leave blank to regenerate with existing context.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="intent" className="text-gray-300">GM Intent (Optional)</Label>
            <Textarea
              id="intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Make them more mysterious, Focus on their tragic past, Emphasize their connection to the main villain..."
              rows={3}
              className="mt-1 rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500 px-4 py-2"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleSkip} disabled={isLoading}>
              Skip Intent
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
                'Regenerate'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
