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
        secondary: "bg-[#2A3340] text-[#EDEDED] border border-[#2A3340] hover:bg-[#374151] hover:border-[#374151] focus-visible:ring-[rgba(42,51,64,0.3)]",
        destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[rgba(220,38,38,0.3)] shadow-sm",
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
