import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 min-h-[40px]",
  {
      variants: {
        variant: {
          primary: "bg-[#000000] text-[#ef6646] hover:bg-[#1a1a1a] hover:text-[#ef6646] focus-visible:ring-[rgba(239,102,70,0.3)] shadow-sm",
          // Secondary actions with brand orange accent
          secondary: "bg-[#1C1F2B] text-[#ef6646] border border-[#2A3340] hover:bg-[#2A3340] hover:text-[#ef6646] focus-visible:ring-[rgba(239,102,70,0.3)]",
          // Transparent/ghost for icon-only or tertiary actions with brand orange
          tertiary: "bg-transparent text-[#ef6646] hover:bg-[#1a1a1a] hover:text-[#ff7a5c] focus-visible:ring-[rgba(239,102,70,0.3)]",
          // Warning/amber theme for warning banners and alerts - bright yellow background to stand out
          warning: "bg-[#ffb703] text-[#311903] border-2 border-[#ffb703] hover:bg-[#ffc733] hover:text-[#311903] hover:border-[#ffc733] focus-visible:ring-[rgba(255,183,3,0.4)] shadow-md shadow-amber-900/20",
          // Softer destructive - keep red for danger actions
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
