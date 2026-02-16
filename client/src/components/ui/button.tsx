import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary shadow-elevation-2 hover:shadow-elevation-4 hover:-translate-y-0.5 active:shadow-elevation-1 active:translate-y-0",
        destructive:
          "bg-error text-on-error shadow-elevation-2 hover:shadow-elevation-4 hover:-translate-y-0.5 active:shadow-elevation-1",
        outline:
          "border-2 border-outline-variant bg-surface text-on-surface hover:bg-surface-variant active:bg-surface transition-all duration-200",
        secondary:
          "bg-secondary-container text-on-secondary-container shadow-elevation-1 hover:shadow-elevation-2 hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "text-on-surface hover:bg-surface-variant/50 active:bg-surface-variant rounded-full",
        link:
          "text-primary underline-offset-4 hover:opacity-80 active:opacity-70 no-underline",
      },
      size: {
        default: "h-10 px-6 py-2 text-sm font-medium",
        sm: "h-8 px-4 text-xs font-medium",
        lg: "h-12 px-8 text-base font-medium",
        xl: "h-14 px-10 text-lg font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
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
