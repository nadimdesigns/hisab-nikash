import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Secondary / outline / ghost / link / destructive buttons use a fixed
  // 15px on mobile, 16px on tablet+ desktop, weight 500. The "default"
  // (primary) variant overrides this to 17px below.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[15px] leading-[22px] md:text-base md:leading-6 font-medium capitalize ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:opacity-90 text-[15px] leading-[22px] font-medium md:text-[17px] md:leading-[22px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-white hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-foreground dark:border-input dark:hover:bg-white/10 dark:hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-white/5 dark:hover:bg-white/10",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-4 py-2 md:h-10",
        sm: "h-10 rounded-md px-3 md:h-9",
        lg: "h-12 rounded-md px-8 md:h-11",
        icon: "h-12 w-12 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
