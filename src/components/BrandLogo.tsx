import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/copy";

type BrandLogoProps = {
  className?: string;
};

/**
 * হিসাব নিকাশ mark — the khata + calculator app icon, served from
 * /logo.png (public/, so it's a static asset the SPA rewrite never
 * intercepts). It already bakes in its own rounded tile and shadow, so
 * callers only control the rendered size via className.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/logo.webp"
      alt={APP_NAME}
      className={cn("h-5 w-5 shrink-0 object-contain", className)}
    />
  );
}

export default BrandLogo;
