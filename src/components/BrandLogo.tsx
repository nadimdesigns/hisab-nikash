import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/copy";
import { typography } from "@/lib/typography";

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
      src="/logo.png"
      alt={APP_NAME}
      className={cn("h-5 w-5 shrink-0 object-contain", className)}
    />
  );
}

type BrandLockupProps = {
  className?: string;
  /** Icon size; the wordmark scales with the surrounding type scale. */
  iconClassName?: string;
  /** Show the tagline under the name. */
  withTagline?: boolean;
};

/**
 * Icon + wordmark lockup, for the login screen and any other place the
 * product needs to name itself. Keeps the mark and the name from drifting
 * apart across screens.
 */
export function BrandLockup({
  className,
  iconClassName = "h-10 w-10",
  withTagline = false,
}: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandLogo className={iconClassName} />
      <div className="flex flex-col leading-tight text-left">
        <span className={typography("h4", "leading-tight")}>{APP_NAME}</span>
        {withTagline && (
          <span className={typography("muted", "leading-tight")}>{APP_TAGLINE}</span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
