import { cn } from '../../lib/utils';

interface AlertProps {
  variant?: 'default' | 'warning' | 'secondary' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

export function Alert({ variant = 'default', className, children }: AlertProps) {
  const baseClasses = 'rounded-lg border p-4';
  
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    secondary: 'bg-gray-50 border-gray-200 text-gray-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  );
}

interface AlertIconProps {
  variant?: 'default' | 'warning' | 'secondary' | 'destructive';
}

export function AlertIcon({ variant = 'default' }: AlertIconProps) {
  const iconClasses = {
    default: 'text-blue-400',
    warning: 'text-yellow-400',
    secondary: 'text-gray-400',
    destructive: 'text-red-400',
  };

  if (variant === 'warning') {
    return (
      <svg className={cn('h-5 w-5', iconClasses[variant])} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }

  if (variant === 'secondary') {
    return (
      <svg className={cn('h-5 w-5', iconClasses[variant])} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    );
  }

  if (variant === 'destructive') {
    return (
      <svg className={cn('h-5 w-5', iconClasses[variant])} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  }

  // Default variant
  return (
    <svg className={cn('h-5 w-5', iconClasses[variant])} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}
