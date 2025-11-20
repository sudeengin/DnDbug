import { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert } from './ui/alert';
import GmIntentModal from './GmIntentModal';
import type { Character } from '../types/macro-chain';
import logger from '@/utils/logger';
import debug from '@/lib/simpleDebug';
import { cn } from '@/lib/utils';

const AFFECTED_FIELDS: (keyof Character)[] = [
  'personality',
  'motivation',
  'connectionToStory',
  'backgroundHistory',
  'voiceTone',
  'equipmentPreferences',
  'proficiencies',
  'languages',
  'motifAlignment'
] as const;

interface CharacterFormProps {
  character: Character;
  onSave: (character: Character) => void;
  onClose: () => void;
  isLocked: boolean;
  sessionId?: string;
}

const BULK_REGENERATE_ID = '__bulk_regenerate__';

// Tooltip component with overflow protection
const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isVisible || !tooltipRef.current || !triggerRef.current) return;
    
    const tooltip = tooltipRef.current;
    const trigger = triggerRef.current;
    
    // Find the modal container
    const modal = trigger.closest('.fixed.inset-0')?.querySelector('.max-w-2xl, .max-w-md, [class*="max-w"]');
    if (!modal) return;
    
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const modalRect = (modal as HTMLElement).getBoundingClientRect();
    
    // Check available space
    const spaceRight = modalRect.right - triggerRect.right;
    const spaceLeft = triggerRect.left - modalRect.left;
    
    // Position to right if space available, otherwise to left
    if (spaceRight >= tooltipRect.width + 16) {
      tooltip.style.left = '100%';
      tooltip.style.right = 'auto';
      tooltip.style.marginLeft = '8px';
      tooltip.style.marginRight = '0';
    } else if (spaceLeft >= tooltipRect.width + 16) {
      tooltip.style.right = '100%';
      tooltip.style.left = 'auto';
      tooltip.style.marginRight = '8px';
      tooltip.style.marginLeft = '0';
    } else {
      // Not enough space on either side, position above
      tooltip.style.left = '50%';
      tooltip.style.right = 'auto';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.bottom = '100%';
      tooltip.style.top = 'auto';
      tooltip.style.marginBottom = '8px';
      tooltip.style.marginTop = '0';
    }
  }, [isVisible]);
  
  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="absolute top-1/2 -translate-y-1/2 z-50 w-56 rounded-md bg-gray-800 text-white text-sm p-3 shadow-lg pointer-events-none"
          style={{ maxWidth: 'calc(100vw - 4rem)' }}
        >
          {content}
          <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-gray-800"></div>
        </div>
      )}
    </div>
  );
};

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
  const [regenerationStatus, setRegenerationStatus] = useState<Record<string, boolean>>({});
  const [isBulkRegenerating, setIsBulkRegenerating] = useState(false);
  const [bulkRegenerationProgress, setBulkRegenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [outdatedFields, setOutdatedFields] = useState<Record<string, boolean>>({});
  const [gmIntentPreset, setGmIntentPreset] = useState('');
  const [bulkRegenerationQueue, setBulkRegenerationQueue] = useState<(keyof Character)[]>([]);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStickyActions, setShowStickyActions] = useState(false);
  
  // Track original class and race to detect changes
  const [originalClass] = useState(character.class);
  const [originalRace] = useState(character.race);
  const [originalRole] = useState(character.role);
  const identitySignature = `${formData.class || ''}|${formData.race || ''}|${formData.role || ''}`;
  const originalIdentitySignature = `${originalClass || ''}|${originalRace || ''}|${originalRole || ''}`;
  const previousIdentitySignature = useRef(identitySignature);

  const hasClassChanged = formData.class !== originalClass;
  const hasRaceChanged = formData.race !== originalRace;
  const hasRoleChanged = formData.role !== originalRole;
  const hasIdentityChanged = hasClassChanged || hasRaceChanged || hasRoleChanged;

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Track scroll position to show/hide sticky action bar
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || isBulkRegenerating) {
      setShowStickyActions(false);
      return;
    }

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      // Show buttons when scrolled down more than 50px
      setShowStickyActions(scrollTop > 50);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isBulkRegenerating]);

  useEffect(() => {
    setFormData(character);
    setHasUnsavedChanges(false); // Reset when character changes
  }, [character]);

  // Track form changes for unsaved changes detection
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(character);
    setHasUnsavedChanges(hasChanges);
  }, [formData, character]);

  useEffect(() => {
    const revertedToOriginal = identitySignature === originalIdentitySignature;

    if (revertedToOriginal) {
      setOutdatedFields({});
      previousIdentitySignature.current = identitySignature;
      return;
    }

    if (identitySignature !== previousIdentitySignature.current) {
      previousIdentitySignature.current = identitySignature;
      setOutdatedFields(prev => {
        const next = { ...prev };
        AFFECTED_FIELDS.forEach(field => {
          next[field] = true;
        });
        return next;
      });
    }
  }, [identitySignature, originalIdentitySignature]);

  const handleChange = (field: keyof Character, value: string | string[] | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 3000);
  };

  const ensureStringArray = (value: Character[keyof Character]): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    return [];
  };

  const isFieldRegenerating = (fieldName: keyof Character | string) => Boolean(regenerationStatus[fieldName]);
  const pendingOutdatedFields = useMemo(
    () => AFFECTED_FIELDS.filter(field => outdatedFields[field]),
    [outdatedFields]
  );
  const hasOutdatedFields = pendingOutdatedFields.length > 0;

  const setFieldRegenerationStatus = (fieldName: string, isActive: boolean) => {
    setRegenerationStatus(prev => {
      if (isActive) {
        if (prev[fieldName]) return prev;
        return { ...prev, [fieldName]: true };
      }
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
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
    const value = ensureStringArray(formData[fieldName]);
    const stringValue = value.join(', ');
    
    const handleArrayChange = (inputValue: string) => {
      const array = inputValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
      handleChange(fieldName, array);
    };
    
    return (
      <div>
        <Label htmlFor={fieldName} className="text-gray-300">{label}</Label>
        <Input
          id={fieldName}
          value={stringValue}
          onChange={(e) => handleArrayChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple items with commas
        </p>
      </div>
    );
  };

  // Helper component for array fields with regenerate button
  const ArrayFieldWithRegenerate = ({ 
    fieldName, 
    label, 
    placeholder = "Enter items separated by commas",
    isOutdated = false
  }: { 
    fieldName: keyof Character; 
    label: string; 
    placeholder?: string;
    isOutdated?: boolean;
  }) => {
    const value = ensureStringArray(formData[fieldName]);
    const stringValue = value.join(', ');
    const canRegenerate = sessionId && !isLocked;
    
    const handleArrayChange = (inputValue: string) => {
      const array = inputValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
      handleChange(fieldName, array);
    };

    // Determine tooltip text
    const tooltipText = hasIdentityChanged 
      ? "Regenerate with updated identity" 
      : "Get a fresh version";
    
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor={fieldName} className="text-gray-300">{label}</Label>
          {canRegenerate && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleRegenerateField(fieldName)}
              disabled={isFieldRegenerating(fieldName) || isBulkRegenerating}
              className="text-xs min-h-[32px]"
              title={tooltipText}
            >
              {isFieldRegenerating(fieldName) ? (
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
        {isOutdated && (
          <div className="mb-2 flex items-start gap-2 rounded-[12px] bg-amber-900/20 border border-amber-700/40 px-3 py-2 text-sm text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-300/90">
              This section may be outdated due to recent changes in Race, Class, or Role. Regenerate it to keep everything consistent.
            </p>
          </div>
        )}
        <Input
          id={fieldName}
          value={stringValue}
          onChange={(e) => handleArrayChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
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
    setHasUnsavedChanges(false); // Clear flag after save
  };

  const handleRegenerateField = (fieldName: keyof Character) => {
    if (!sessionId) {
      alert('Session ID is required for regeneration');
      return;
    }
    
    // Log class/race change detection for debugging
    console.log('Regenerate field - class/race/role check:', {
      fieldName,
      originalClass,
      currentClass: formData.class,
      originalRace,
      currentRace: formData.race,
      originalRole,
      currentRole: formData.role,
      hasClassChanged,
      hasRaceChanged,
      hasRoleChanged
    });
    
    const intentPieces: string[] = [];
    if (hasClassChanged && formData.class) {
      intentPieces.push(`Now a ${formData.class}`);
    }
    if (hasRaceChanged && formData.race) {
      intentPieces.push(`Race changed to ${formData.race}`);
    }
    if (hasRoleChanged && formData.role) {
      intentPieces.push(`Role updated to ${formData.role}`);
    }

    setGmIntentPreset(intentPieces.join('. '));
    setBulkRegenerationQueue([]);
    setRegeneratingField(fieldName);
    setShowGmIntentModal(true);
  };

  const performRegeneration = async (
    fieldName: keyof Character,
    intent?: string,
    options?: { silent?: boolean }
  ) => {
    if (!sessionId) {
      throw new Error('Session ID is required for regeneration');
    }

    setFieldRegenerationStatus(fieldName, true);

    try {
      debug.info('CharacterForm', 'Regenerate field request', {
        characterId: formData.id,
        characterName: formData.name,
        fieldName,
        currentClass: formData.class,
        currentRace: formData.race,
        originalClass,
        originalRace,
        hasClassChanged,
        hasRaceChanged,
        hasRoleChanged,
        hasGmIntent: !!intent,
        sessionId,
        isBulk: options?.silent || false
      });

      const response = await fetch('/api/characters/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          characterId: formData.id,
          fieldName,
          gmIntent: intent || undefined,
          characterData: formData
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        debug.error('CharacterForm', 'Regenerate field failed', {
          url: '/api/characters/regenerate',
          status: response.status,
          statusText: response.statusText,
          characterId: formData.id,
          characterName: formData.name,
          fieldName,
          errorMessage: error.error,
          errorResponse: error,
          requestBody: {
            sessionId,
            characterId: formData.id,
            fieldName,
            hasGmIntent: !!intent
          }
        });
        throw new Error(error.error || 'Failed to regenerate field');
      }

      const result = await response.json();
      const arrayFields = ['languages', 'proficiencies', 'equipmentPreferences', 'motifAlignment'];
      const isArrayField = arrayFields.includes(fieldName);
      const oldValue = formData[fieldName as keyof Character];
      const fieldValue = isArrayField 
        ? result.regeneratedField.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0)
        : result.regeneratedField;

      debug.info('CharacterForm', 'Regenerate field success', {
        characterId: formData.id,
        characterName: formData.name,
        fieldName,
        oldValue,
        newValue: fieldValue,
        changed: JSON.stringify(oldValue) !== JSON.stringify(fieldValue)
      });

      setFormData(prev => ({
        ...prev,
        [fieldName]: fieldValue
      }));

      setOutdatedFields(prev => {
        if (prev[fieldName]) {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        }
        return prev;
      });

      if (!options?.silent) {
        showToast('Section updated successfully');
      }
    } finally {
      setFieldRegenerationStatus(fieldName, false);
    }
  };

  const handleGmIntentConfirm = async (intent: string) => {
    if (!regeneratingField) return;

    setShowGmIntentModal(false);

    if (regeneratingField === BULK_REGENERATE_ID) {
      if (!bulkRegenerationQueue.length) {
        setRegeneratingField(null);
        setGmIntentPreset('');
        return;
      }

      setIsBulkRegenerating(true);
      setBulkRegenerationProgress({ current: 0, total: bulkRegenerationQueue.length });
      try {
        for (let i = 0; i < bulkRegenerationQueue.length; i++) {
          const field = bulkRegenerationQueue[i];
          await performRegeneration(field, intent || undefined, { silent: true });
          setBulkRegenerationProgress({ current: i + 1, total: bulkRegenerationQueue.length });
        }
        showToast('All affected sections regenerated successfully');
        setBulkRegenerationQueue([]);
      } catch (error) {
        const errorMessage = (error as any).message || 'Unknown error';
        console.error('Error regenerating fields:', error);
        alert(`Error regenerating fields: ${errorMessage}`);
      } finally {
        setIsBulkRegenerating(false);
        setBulkRegenerationProgress(null);
        setRegeneratingField(null);
        setGmIntentPreset('');
      }
      return;
    }

    try {
      await performRegeneration(regeneratingField as keyof Character, intent || undefined);
    } catch (error) {
      const errorMessage = (error as any).message || 'Unknown error';
      console.error('Error regenerating field:', error);
      alert(`Error regenerating field: ${errorMessage}`);
    } finally {
      setRegeneratingField(null);
      setGmIntentPreset('');
    }
  };

  const handleGmIntentCancel = () => {
    setShowGmIntentModal(false);
    setRegeneratingField(null);
    setGmIntentPreset('');
    setBulkRegenerationProgress(null);
    if (bulkRegenerationQueue.length) {
      setBulkRegenerationQueue([]);
    }
  };

  // Helper component for fields with regenerate buttons
  const FieldWithRegenerate = ({ 
    fieldName, 
    label, 
    children, 
    isTextarea = false,
    isOutdated = false
  }: { 
    fieldName: keyof Character; 
    label: string; 
    children: React.ReactNode; 
    isTextarea?: boolean;
    isOutdated?: boolean;
  }) => {
    const canRegenerate = sessionId && !isLocked;
    
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor={fieldName} className="text-gray-300">{label}</Label>
          {canRegenerate && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleRegenerateField(fieldName)}
              disabled={isFieldRegenerating(fieldName) || isBulkRegenerating}
              className="text-xs min-h-[32px]"
            >
              {isFieldRegenerating(fieldName) ? (
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
        {isOutdated && (
          <div className="mb-2 flex items-start gap-2 rounded-[12px] bg-amber-900/20 border border-amber-700/40 px-3 py-2 text-sm text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-300/90">
              This section may be outdated due to recent changes in Race, Class, or Role. Regenerate it to keep everything consistent.
            </p>
          </div>
        )}
        {children}
      </div>
    );
  };

  const isFieldOutdated = (fieldName: keyof Character) => Boolean(outdatedFields[fieldName]);

  const handleRegenerateAllClick = () => {
    if (!sessionId) {
      alert('Session ID is required for regeneration');
      return;
    }

    const fieldsToRegenerate = pendingOutdatedFields;
    if (!fieldsToRegenerate.length) return;

    const intentPieces: string[] = [];
    if (hasClassChanged && formData.class) {
      intentPieces.push(`Now a ${formData.class}`);
    }
    if (hasRaceChanged && formData.race) {
      intentPieces.push(`Race changed to ${formData.race}`);
    }
    if (hasRoleChanged && formData.role) {
      intentPieces.push(`Role updated to ${formData.role}`);
    }

    setGmIntentPreset(intentPieces.join('. '));
    setBulkRegenerationQueue(fieldsToRegenerate);
    setRegeneratingField(BULK_REGENERATE_ID);
    setShowGmIntentModal(true);
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900/20 mb-4">
              <svg className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">Characters Locked</h3>
            <p className="text-sm text-gray-400 mb-4">
              Characters are locked and cannot be edited. Unlock them first to make changes.
            </p>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div 
        ref={scrollContainerRef}
        className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-200">Edit Character</h2>
          <Button 
            variant="tertiary" 
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowCancelConfirm(true);
              } else {
                onClose();
              }
            }} 
            className="text-gray-400 hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Sticky Save/Cancel Action Bar - Only shows on scroll */}
        {!isBulkRegenerating && showStickyActions && (
          <div 
            className="sticky top-[-24px] z-10 bg-black/30 backdrop-blur-md border-b-2 border-[#2A3340] -mx-6 px-6 py-6 mb-6 flex items-center justify-end space-x-3 shadow-lg transition-all duration-300 ease-out rounded-t-none min-h-[64px]"
          >
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowCancelConfirm(true);
                } else {
                  onClose();
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
            >
              Save Character
            </Button>
          </div>
        )}

        {hasIdentityChanged && hasOutdatedFields && (
          <div 
            className={cn(
              "mb-4 rounded-[12px] bg-amber-900/20 border border-amber-700/40 p-4 animate-in fade-in-300 transition-all duration-200",
              isBulkRegenerating && "sticky top-[-24px] z-10 bg-[#151A22]/95 backdrop-blur-sm shadow-lg -mx-6 px-6 pt-6 rounded-t-none mb-0"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2 flex-1">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-amber-200 mb-1">
                    Some sections may be outdated.
                  </p>
                  <p className="text-sm text-amber-300/90">
                    Regenerate them individually or update every affected section at once to reflect the new Race, Class, or Role.
                  </p>
                </div>
              </div>
              <Button 
                type="button" 
                variant="warning" 
                size="sm"
                className="h-8 px-4 text-sm shrink-0"
                disabled={isBulkRegenerating || !pendingOutdatedFields.length || !sessionId || isLocked}
                onClick={handleRegenerateAllClick}
              >
                {isBulkRegenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0a12 12 0 100 24v-4a8 8 0 01-8-8z" />
                    </svg>
                    {bulkRegenerationProgress 
                      ? `Regenerating... (${bulkRegenerationProgress.current} of ${bulkRegenerationProgress.total})`
                      : 'Regenerating...'
                    }
                  </span>
                ) : (
                  'Regenerate All'
                )}
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Character Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter character name"
                required
                className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="role" className="text-gray-300">Role *</Label>
                <Tooltip content="Role stays free-form so you can write archetypes like &quot;spy&quot;, &quot;beast hunter&quot;, or &quot;deserter general&quot;. It guides narration even though it isn't bound to mechanics.">
                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-300 cursor-help" />
                </Tooltip>
              </div>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                placeholder="e.g., Wandering Scholar, Mercenary Captain"
                required
                className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="race" className="text-gray-300">Race *</Label>
              <Select value={formData.race || ''} onValueChange={(value) => handleChange('race', value)}>
                <SelectTrigger className="rounded-[12px] border-[#2A3340] bg-[#0f141b] text-[#E0E0E0]">
                  <SelectValue placeholder="Select race" />
                </SelectTrigger>
                <SelectContent className="bg-[#151A22] border-[#2A3340] text-[#E0E0E0]">
                  {RACES.map(race => (
                    <SelectItem key={race} value={race}>{race}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="class" className="text-gray-300">Class *</Label>
              <Select value={formData.class || ''} onValueChange={(value) => handleChange('class', value)}>
                <SelectTrigger className="rounded-[12px] border-[#2A3340] bg-[#0f141b] text-[#E0E0E0]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-[#151A22] border-[#2A3340] text-[#E0E0E0]">
                  {CLASSES.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subrace" className="text-gray-300">Subrace</Label>
              <Input
                id="subrace"
                value={formData.subrace || ''}
                onChange={(e) => handleChange('subrace', e.target.value)}
                placeholder="e.g., High Elf, Wood Elf, Mountain Dwarf"
                className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="alignment" className="text-gray-300">Alignment</Label>
              <Select value={formData.alignment || ''} onValueChange={(value) => handleChange('alignment', value)}>
                <SelectTrigger className="rounded-[12px] border-[#2A3340] bg-[#0f141b] text-[#E0E0E0]">
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent className="bg-[#151A22] border-[#2A3340] text-[#E0E0E0]">
                  {ALIGNMENTS.map(alignment => (
                    <SelectItem key={alignment} value={alignment}>{alignment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age" className="text-gray-300">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                placeholder="Character's age in years"
                min="1"
                max="1000"
                className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-gray-300">Height</Label>
              <Input
                id="height"
                value={formData.height || ''}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="e.g., 5'7&quot;, 6'2&quot;"
                className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="deity" className="text-gray-300">Deity</Label>
              <Input
                id="deity"
                value={formData.deity || ''}
                onChange={(e) => handleChange('deity', e.target.value)}
                placeholder="Religious affiliation or deity"
                className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Character Details */}
          <FieldWithRegenerate fieldName="personality" label="Personality *" isOutdated={isFieldOutdated('personality')}>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              placeholder="2-3 sentences describing their personality traits and behavior"
              rows={3}
              required
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="motivation" label="Motivation *" isOutdated={isFieldOutdated('motivation')}>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => handleChange('motivation', e.target.value)}
              placeholder="What drives them in this specific story?"
              rows={2}
              required
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="connectionToStory" label="Connection to Story *" isOutdated={isFieldOutdated('connectionToStory')}>
            <Textarea
              id="connectionToStory"
              value={formData.connectionToStory}
              onChange={(e) => handleChange('connectionToStory', e.target.value)}
              placeholder="Direct link to the background context or story premise"
              rows={2}
              required
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="voiceTone" label="Voice Tone *" isOutdated={isFieldOutdated('voiceTone')}>
            <Input
              id="voiceTone"
              value={formData.voiceTone}
              onChange={(e) => handleChange('voiceTone', e.target.value)}
              placeholder="e.g., Soft and deliberate, Gruff and direct"
              required
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="inventoryHint" label="Inventory Hint *">
            <Input
              id="inventoryHint"
              value={formData.inventoryHint}
              onChange={(e) => handleChange('inventoryHint', e.target.value)}
              placeholder="e.g., An aged journal, A rusted locket"
              required
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
            />
          </FieldWithRegenerate>

          <FieldWithRegenerate fieldName="backgroundHistory" label="Background History *" isOutdated={isFieldOutdated('backgroundHistory')}>
            <Textarea
              id="backgroundHistory"
              value={formData.backgroundHistory}
              onChange={(e) => handleChange('backgroundHistory', e.target.value)}
              placeholder="1-2 paragraphs of their full backstory including upbringing and defining events"
              rows={4}
              required
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
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
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
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
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
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
              className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
            />
          </FieldWithRegenerate>

          {/* Additional Character Sheet Fields */}
          <div className="border-t border-[#2A3340] pt-6">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Character Sheet Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ArrayFieldWithRegenerate 
                fieldName="languages" 
                label="Languages" 
                placeholder="e.g., Common, Elvish, Dwarvish, Draconic"
                isOutdated={isFieldOutdated('languages')}
              />
              <ArrayFieldWithRegenerate 
                fieldName="proficiencies" 
                label="Proficiencies" 
                placeholder="e.g., Athletics, Stealth, Thieves' Tools, Herbalism Kit"
                isOutdated={isFieldOutdated('proficiencies')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <ArrayFieldWithRegenerate 
                fieldName="equipmentPreferences" 
                label="Equipment Preferences" 
                placeholder="e.g., Quarterstaff, Spellbook, Component pouch, Ink and quill"
                isOutdated={isFieldOutdated('equipmentPreferences')}
              />
              <ArrayFieldWithRegenerate 
                fieldName="motifAlignment" 
                label="Motif Alignment" 
                placeholder="e.g., decay, secrets, family curses"
                isOutdated={isFieldOutdated('motifAlignment')}
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
                  className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500"
                />
              </FieldWithRegenerate>
            </div>
          </div>
        </form>

        {/* GM Intent Modal */}
        <GmIntentModal
          isOpen={showGmIntentModal}
          onClose={handleGmIntentCancel}
          onConfirm={handleGmIntentConfirm}
          fieldName={regeneratingField || ''}
          characterName={formData.name}
          isLoading={regeneratingField ? isFieldRegenerating(regeneratingField) : false}
          hasClassChanged={hasClassChanged}
          hasRaceChanged={hasRaceChanged}
          hasRoleChanged={hasRoleChanged}
          newClass={formData.class}
          newRace={formData.race}
          newRole={formData.role}
          defaultIntent={gmIntentPreset}
        />

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
            <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Unsaved Changes</h3>
              <p className="text-sm text-gray-300 mb-6">
                You have made changes to this character. Are you sure you want to exit without saving?
              </p>
              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Continue Editing
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setHasUnsavedChanges(false);
                    onClose();
                  }}
                >
                  Exit Without Saving
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-600/50 text-green-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 z-50">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}