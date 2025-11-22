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
    accent: 'text-[#ef6646]', // Brand orange for emphasis
    accentHover: 'hover:text-[#ff7a5c]', // Lighter orange for hover
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

  // Brand/Primary Colors
  brand: {
    primary: '#000000',
    primaryText: '#ef6646',
    primaryHover: '#1a1a1a',
    primaryFocus: 'rgba(239,102,70,0.3)',
    primaryShadow: '#ef6646/20',
    // Secondary brand colors
    secondary: '#1C1F2B',
    secondaryText: '#ef6646',
    secondaryHover: '#2A3340',
    // Accent colors
    accent: '#ef6646',
    accentHover: '#ff7a5c', // Lighter orange for hover states
    accentFocus: 'rgba(239,102,70,0.3)',
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

  // Brand colors
  brandPrimary: 'bg-[#000000] text-[#ef6646]',
  brandPrimaryHover: 'hover:bg-[#1a1a1a] hover:text-[#ef6646]',
  brandFocus: 'focus:ring-[rgba(239,102,70,0.3)] focus:border-[#ef6646] focus-visible:ring-[rgba(239,102,70,0.3)]',
  brandText: 'text-[#ef6646]',
  brandTextHover: 'hover:text-[#ff7a5c]',
  brandBorder: 'border-[#ef6646]',
  brandShadow: 'shadow-[#ef6646]/20',
  
  // Button patterns
  buttonPrimary: 'bg-[#000000] text-[#ef6646] hover:bg-[#1a1a1a] hover:text-[#ef6646] focus-visible:ring-[rgba(239,102,70,0.3)] shadow-sm',
  buttonSecondary: 'bg-[#1C1F2B] text-[#ef6646] border border-[#2A3340] hover:bg-[#2A3340] hover:text-[#ef6646] focus-visible:ring-[rgba(239,102,70,0.3)]',
  buttonTertiary: 'bg-transparent text-[#ef6646] hover:bg-[#1a1a1a] hover:text-[#ff7a5c] focus-visible:ring-[rgba(239,102,70,0.3)]',
  buttonFocus: 'focus-visible:ring-[rgba(239,102,70,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  
  // Link patterns
  link: 'text-[#ef6646] hover:text-[#ff7a5c] underline-offset-4 hover:underline',
  linkNoUnderline: 'text-[#ef6646] hover:text-[#ff7a5c]',
} as const;

