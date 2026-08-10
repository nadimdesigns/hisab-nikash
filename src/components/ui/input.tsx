import * as React from "react";

import { cn } from "@/lib/utils";
import { BODY_TEXT } from "@/lib/typography";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, pattern, ...props }, ref) => {
    const isNumeric = type === "number";
    return (
      <input
        type={type}
        inputMode={inputMode ?? (isNumeric ? "decimal" : undefined)}
        pattern={pattern ?? (isNumeric ? "[0-9]*" : undefined)}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background dark:bg-white/5 px-3 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder-default focus:outline-none focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:h-10",
          BODY_TEXT,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

