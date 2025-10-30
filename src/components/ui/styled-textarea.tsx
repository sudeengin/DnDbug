/**
 * Pre-styled Textarea Component
 * 
 * Use this instead of raw Textarea for consistent dark theme styling.
 * Prevents accidental loss of theme styling during refactors.
 */

import { Textarea, type TextareaProps } from './textarea';
import { themeClasses } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function StyledTextarea({ className, ...props }: TextareaProps) {
  return (
    <Textarea
      className={cn(themeClasses.textarea, className)}
      {...props}
    />
  );
}

