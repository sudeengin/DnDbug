/**
 * Pre-styled Input Component
 * 
 * Use this instead of raw Input for consistent dark theme styling.
 * Prevents accidental loss of theme styling during refactors.
 */

import { Input, type InputProps } from './input';
import { themeClasses } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function StyledInput({ className, ...props }: InputProps) {
  return (
    <Input
      className={cn(themeClasses.inputText, className)}
      {...props}
    />
  );
}

