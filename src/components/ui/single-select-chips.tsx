import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { theme } from '@/lib/theme';
import { Input } from './input';

export interface SingleSelectOption {
  value: string;
  label: string;
  description?: string;
  metadata?: string; // For showing AC, cost, etc.
}

interface SingleSelectChipsProps {
  label?: string;
  value: string;
  options: SingleSelectOption[];
  onChange: (selected: string) => void;
  placeholder?: string;
  backgroundItems?: Set<string> | string[];
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export function SingleSelectChips({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select item...',
  backgroundItems = new Set(),
  disabled = false,
  searchable = true,
  className,
}: SingleSelectChipsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert backgroundItems to Set if it's an array
  const backgroundSet = Array.isArray(backgroundItems)
    ? new Set(backgroundItems)
    : backgroundItems;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Select item
  const selectItem = (itemValue: string) => {
    if (disabled) return;
    
    if (value === itemValue) {
      // Deselect if clicking the same item
      onChange('');
    } else {
      onChange(itemValue);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  // Remove selected item
  const removeItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange('');
  };

  // Get option by value
  const getOption = (val: string) => {
    return options.find(opt => opt.value === val);
  };

  const selectedOption = value ? getOption(value) : null;
  const isFromBackground = selectedOption && backgroundSet.has(value);

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className={`block text-sm font-medium ${theme.text.secondary} mb-2`}>
          {label}
        </label>
      )}
      
      {/* Trigger/Input Field with Chip */}
      <div
        ref={containerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex flex-wrap gap-1.5 items-center min-h-[44px] px-3 py-2',
          'border rounded-md cursor-text',
          theme.background.card,
          theme.border.primary,
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500',
          'focus-within:ring-2 focus-within:ring-[rgba(239,102,70,0.3)] focus-within:border-[#ef6646]',
          'transition-colors'
        )}
      >
        {/* Chip for selected item */}
        {selectedOption ? (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
              'bg-[#1C1F2B] border border-[#2A3340]',
              'text-xs',
              disabled && 'opacity-50'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={theme.text.primary}>{selectedOption.label}</span>
            {isFromBackground && (
              <span className="text-[10px] text-gray-500">(bg)</span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={removeItem}
                className={cn(
                  'ml-1 text-gray-400 hover:text-gray-300',
                  'transition-colors flex-shrink-0'
                )}
                aria-label={`Remove ${selectedOption.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <span className={`text-sm ${theme.text.placeholder}`}>{placeholder}</span>
        )}
        
        {/* Chevron Icon */}
        <div className="ml-auto flex-shrink-0">
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              theme.text.muted,
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-1',
            'border rounded-md shadow-lg',
            theme.background.card,
            theme.border.primary,
            'max-h-64 overflow-hidden flex flex-col'
          )}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-[#2A3340]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'pl-8 bg-[#0f141b] text-white border-[#2A3340]',
                    'focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646]'
                  )}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className={`p-3 text-sm text-center ${theme.text.muted}`}>
                No items found
              </div>
            ) : (
              <div className="p-1">
                {/* None option */}
                <div
                  onClick={() => selectItem('')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer',
                    'hover:bg-[#1a2330] transition-colors',
                    !value && 'bg-[#1a2330]/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                      !value
                        ? 'bg-[#ef6646] border-[#ef6646]'
                        : 'border-[#2A3340] bg-transparent'
                    )}
                  >
                    {!value && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm',
                        !value ? theme.text.primary : theme.text.secondary
                      )}
                    >
                      None
                    </span>
                  </div>
                </div>

                {/* Other options */}
                {filteredOptions.map((option) => {
                  const isSelected = value === option.value;
                  const isFromBg = backgroundSet.has(option.value);
                  
                  return (
                    <div
                      key={option.value}
                      onClick={() => selectItem(option.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer',
                        'hover:bg-[#1a2330] transition-colors',
                        isSelected && 'bg-[#1a2330]/50'
                      )}
                    >
                      {/* Radio/Checkmark */}
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-[#ef6646] border-[#ef6646]'
                            : 'border-[#2A3340] bg-transparent'
                        )}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>

                      {/* Option Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm',
                              isSelected ? theme.text.primary : theme.text.secondary
                            )}
                          >
                            {option.label}
                          </span>
                          {isFromBg && (
                            <span className="text-[10px] text-gray-500">(bg)</span>
                          )}
                        </div>
                        {option.metadata && (
                          <div className={`text-xs ${theme.text.muted} mt-0.5`}>
                            {option.metadata}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

