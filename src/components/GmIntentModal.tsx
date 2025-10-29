import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface GmIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (intent: string) => void;
  fieldName: string;
  characterName: string;
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
  flawOrWeakness: 'Flaw or Weakness'
};

export default function GmIntentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  fieldName, 
  characterName 
}: GmIntentModalProps) {
  const [intent, setIntent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(intent.trim());
    setIntent('');
  };

  const handleSkip = () => {
    onConfirm('');
    setIntent('');
  };

  const fieldDisplayName = fieldDisplayNames[fieldName as keyof typeof fieldDisplayNames] || fieldName;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Regenerate {fieldDisplayName}
          </h3>
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Regenerating <strong>{fieldDisplayName}</strong> for <strong>{characterName}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Optionally provide your intent or specific direction for the regeneration. 
            Leave blank to regenerate with existing context.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="intent">GM Intent (Optional)</Label>
            <Textarea
              id="intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Make them more mysterious, Focus on their tragic past, Emphasize their connection to the main villain..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleSkip}>
              Skip Intent
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Regenerate
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
