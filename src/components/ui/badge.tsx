import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary/14 text-primary",
        secondary:   "border border-border text-muted-foreground",
        destructive: "border-transparent bg-destructive/14 text-destructive",
        outline:     "border border-border text-foreground",
        /* Nous semantic */
        long:  "border-transparent text-[#089981]  bg-[rgba(8,153,129,0.14)]",
        short: "border-transparent text-[#F23645]  bg-[rgba(242,54,69,0.14)]",
        win:   "border-transparent text-[#089981]  bg-[rgba(8,153,129,0.14)]",
        loss:  "border-transparent text-[#F23645]  bg-[rgba(242,54,69,0.14)]",
        info:  "border-transparent text-[#2962FF]  bg-[rgba(41,98,255,0.14)]",
        warn:  "border-transparent text-[#FF9800]  bg-[rgba(255,152,0,0.14)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
