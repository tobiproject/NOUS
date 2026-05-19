import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-[rgba(0,196,255,0.06)] border border-[rgba(0,196,255,0.45)] text-[#00C4FF] backdrop-blur-md hover:bg-[rgba(0,196,255,0.12)] hover:border-[#00C4FF] active:scale-[0.98]",
        destructive: "bg-[rgba(242,54,69,0.07)] border border-[rgba(242,54,69,0.45)] text-destructive backdrop-blur-md hover:bg-[rgba(242,54,69,0.12)] hover:border-destructive",
        outline:     "border border-[rgba(255,255,255,0.12)] bg-transparent text-foreground backdrop-blur-md hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.20)]",
        secondary:   "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-muted-foreground backdrop-blur-md hover:bg-[rgba(255,255,255,0.08)] hover:text-foreground",
        ghost:       "text-muted-foreground hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground",
        link:        "text-primary underline-offset-4 hover:underline px-0",
        ai:          "bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.45)] text-[#8B5CF6] backdrop-blur-md hover:bg-[rgba(139,92,246,0.15)] hover:border-[#8B5CF6] active:scale-[0.98]",
      },
      size: {
        default: "h-8 px-3 py-1.5 text-[13px]",
        sm:      "h-7 px-2.5 py-1 text-xs",
        lg:      "h-9 px-4 py-2 text-sm",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
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
