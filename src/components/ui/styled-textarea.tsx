/**
 * Pre-styled Textarea Component
 * 
 * Use this instead of raw Textarea for consistent dark theme styling.
 * Prevents accidental loss of theme styling during refactors.
 */

import * as React from 'react';
import { Textarea, type TextareaProps } from './textarea';
import { themeClasses } from '@/lib/theme';
import { cn } from '@/lib/utils';

export const StyledTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(themeClasses.textarea, className)}
        {...props}
      />
    );
  }
);

StyledTextarea.displayName = 'StyledTextarea';

