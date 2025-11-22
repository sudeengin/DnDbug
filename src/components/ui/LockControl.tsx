import * as React from "react";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { theme } from "../../lib/theme";

export interface LockControlProps {
  /** Whether the item is currently locked */
  isLocked: boolean;
  /** Callback when lock state is toggled */
  onToggle: () => void;
  /** Whether the toggle operation is in progress */
  loading?: boolean;
  /** Optional label to display (e.g., "Characters", "Background", "Scene") */
  label?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Optional className for additional styling */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

/**
 * Standardized LockControl component for consistent lock/unlock functionality
 * across all pages. Appears in the top-right of page headers.
 * 
 * Design:
 * - Locked: Green badge/button with Lock icon + "Locked" text
 * - Unlocked: Yellow badge/button with Unlock icon + "Unlocked" text
 * - Loading: Disabled state with spinner
 * - Consistent sizing and positioning across all pages
 */
export function LockControl({
  isLocked,
  onToggle,
  loading = false,
  label,
  disabled = false,
  className,
  size = "default",
}: LockControlProps) {
  const Icon = isLocked ? Lock : Unlock;
  const statusText = isLocked ? "Locked" : "Unlocked";
  const displayText = label ? `${statusText} ${label}` : statusText;

  // Size classes
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs min-h-[32px]",
    default: "px-3 py-1.5 text-sm min-h-[36px]",
    lg: "px-4 py-2 text-base min-h-[40px]",
  };

  // Icon size classes
  const iconSizeClasses = {
    sm: "w-3 h-3",
    default: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <Button
      onClick={onToggle}
      disabled={disabled || loading}
      variant="secondary"
      size={size}
      className={cn(
        "inline-flex items-center gap-2 font-medium transition-all border",
        // Locked state: Green styling
        isLocked && !loading && "bg-green-900/20 text-green-300 border-green-700/40 hover:bg-green-900/30 hover:text-green-200 hover:border-green-700/60",
        // Unlocked state: Yellow styling
        !isLocked && !loading && "bg-yellow-900/20 text-yellow-300 border-yellow-700/40 hover:bg-yellow-900/30 hover:text-yellow-200 hover:border-yellow-700/60",
        // Loading state: Muted styling
        loading && "opacity-60 cursor-not-allowed",
        sizeClasses[size],
        className
      )}
      aria-label={`${isLocked ? "Unlock" : "Lock"} ${label || "item"}`}
      title={loading ? "Processing..." : `${isLocked ? "Unlock" : "Lock"} ${label || "item"}`}
    >
      {loading ? (
        <>
          <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
          <span>{isLocked ? "Locking..." : "Unlocking..."}</span>
        </>
      ) : (
        <>
          <Icon className={iconSizeClasses[size]} />
          <span>{displayText}</span>
        </>
      )}
    </Button>
  );
}

