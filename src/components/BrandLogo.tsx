import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/copy";
import { typography } from "@/lib/typography";

type BrandLogoProps = {
  className?: string;
};

/**
 * হিসাব নিকাশ mark — a khata (ledger) page with ruled lines.
 *
 * Inline SVG, not an image file: the previous mark was a raster asset on a
 * Lovable-hosted `/__l5e/...` URL that does not exist on this deployment, so
 * the SPA rewrite answered it with index.html and the logo rendered broken.
 * Inline markup also costs no request and still draws with the network down.
 *
 * Kept deliberately geometric — no text inside the SVG — so it does not
 * depend on a webfont having loaded, and stays legible down to 16px. The
 * fill uses the design tokens, so it tracks light and dark automatically.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={APP_NAME}
      className={cn("h-5 w-5 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hn-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary-glow))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>

      {/* Rounded tile */}
      <rect x="0" y="0" width="32" height="32" rx="8" fill="url(#hn-mark)" />

      {/* Ledger lines, shortening down the page */}
      <rect x="8" y="10" width="16" height="2.6" rx="1.3" fill="#fff" opacity="0.95" />
      <rect x="8" y="15.2" width="12" height="2.6" rx="1.3" fill="#fff" opacity="0.75" />
      <rect x="8" y="20.4" width="7" height="2.6" rx="1.3" fill="#fff" opacity="0.55" />
    </svg>
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
