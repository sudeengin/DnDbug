import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 min-h-[40px]",
  {
    variants: {
      variant: {
        primary: "bg-[#7c63e5] text-white hover:bg-[#6b54d4] focus-visible:ring-[rgba(124,99,229,0.3)] shadow-sm",
        // Muted neutral for secondary actions
        secondary: "bg-[#1C1F2B] text-gray-300 border border-[#2A3340] hover:bg-[#2A3340] hover:text-white focus-visible:ring-[rgba(42,51,64,0.35)]",
        // Transparent/ghost for icon-only or tertiary actions
        tertiary: "bg-transparent text-[#C9D1D9] hover:bg-[#1b2230] focus-visible:ring-[rgba(27,34,48,0.35)]",
        // Softer destructive
        destructive: "bg-red-700/70 text-white hover:bg-red-600 focus-visible:ring-[rgba(220,38,38,0.3)] shadow-sm",
      },
      size: {
        default: "px-4 py-2 min-h-[40px]",
        sm: "px-3 py-1.5 min-h-[36px] text-xs",
        lg: "px-6 py-3 min-h-[48px] text-base",
        icon: "w-10 h-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
