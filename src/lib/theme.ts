/**
 * Centralized Theme Configuration
 * 
 * This file contains all theme colors, spacing, and styling constants used throughout the application.
 * IMPORTANT: If you modify component styling, update this file and reference these constants.
 * This prevents accidental loss of styling during refactors or merges.
 * 
 * Usage:
 *   import { theme } from '@/lib/theme';
 *   className={theme.input.base}
 */

export const theme = {
  // Background Colors
  background: {
    primary: 'bg-[#151A22]',
    secondary: 'bg-[#0f141b]',
    overlay: 'bg-black/60',
    card: 'bg-[#151A22]',
  },

  // Border Colors
  border: {
    primary: 'border-[#2A3340]',
    default: 'border-[#2A3340]',
  },

  // Text Colors
  text: {
    primary: 'text-gray-200',
    secondary: 'text-gray-300',
    muted: 'text-gray-400',
    placeholder: 'text-gray-500',
    input: 'text-[#E0E0E0]',
  },

  // Input/Form Styling
  input: {
    base: 'rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500',
    padding: 'px-4 py-2',
    full: 'rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500 px-4 py-2',
  },

  // Modal Styling
  modal: {
    overlay: 'fixed inset-0 bg-black/60 flex items-center justify-center z-50',
    container: 'bg-[#151A22] border border-[#2A3340] rounded-[12px] shadow-xl',
    containerLarge: 'bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl',
    containerMedium: 'bg-[#151A22] border border-[#2A3340] rounded-[12px] p-6 max-w-md w-full mx-4 shadow-xl',
  },

  // Select/Dropdown Styling
  select: {
    trigger: 'rounded-[12px] border-[#2A3340] bg-[#0f141b] text-[#E0E0E0]',
    content: 'bg-[#151A22] border-[#2A3340] text-[#E0E0E0]',
  },

  // Textarea Styling
  textarea: {
    base: 'rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0] placeholder:text-gray-500',
  },

  // Card Styling
  card: {
    base: 'bg-[#151A22] border-[#2A3340]',
    rounded: 'bg-[#151A22] border-[#2A3340] rounded-[12px]',
  },

  // Divider/Border Styling
  divider: {
    default: 'border-[#2A3340]',
  },

  // Warning/Alert Colors (Dark Theme)
  warning: {
    background: 'bg-amber-900/20',
    border: 'border-amber-700/40',
    text: 'text-amber-200',
    textSecondary: 'text-amber-300',
    icon: 'text-amber-400',
    container: 'bg-amber-900/20 border-amber-700/40 text-amber-200',
  },
} as const;

/**
 * Utility function to combine theme classes
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Pre-styled class combinations for common patterns
 */
export const themeClasses = {
  // Form Labels
  label: theme.text.secondary,
  labelPrimary: theme.text.primary,

  // Form Inputs
  inputText: theme.input.full,
  inputBase: theme.input.base,

  // Form Textareas
  textarea: theme.textarea.base,

  // Form Selects
  selectTrigger: theme.select.trigger,
  selectContent: theme.select.content,

  // Modal Patterns
  modalOverlay: theme.modal.overlay,
  modalContainer: theme.modal.container,
  modalContainerLarge: theme.modal.containerLarge,
  modalContainerMedium: theme.modal.containerMedium,

  // Common Borders
  borderDivider: theme.divider.default,

  // Warning Patterns
  warningContainer: 'rounded-[12px] bg-amber-900/20 border border-amber-700/40 text-amber-200 px-3 py-2',
  warningBanner: 'rounded-[12px] bg-amber-900/20 border border-amber-700/40 text-amber-200 p-4',
} as const;

