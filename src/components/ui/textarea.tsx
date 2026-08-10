import * as React from "react";

import { cn } from "@/lib/utils";
import { BODY_TEXT } from "@/lib/typography";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-white/5 px-3 py-2 placeholder:text-muted-foreground placeholder-default focus:outline-none focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
        BODY_TEXT,
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

