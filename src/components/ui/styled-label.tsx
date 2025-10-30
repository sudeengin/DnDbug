/**
 * Pre-styled Label Component
 * 
 * Use this instead of raw Label for consistent dark theme styling.
 * Prevents accidental loss of theme styling during refactors.
 */

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Label } from './label';
import { themeClasses } from '@/lib/theme';
import { cn } from '@/lib/utils';

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>;

export function StyledLabel({ className, ...props }: LabelProps) {
  return (
    <Label
      className={cn(themeClasses.label, className)}
      {...props}
    />
  );
}

