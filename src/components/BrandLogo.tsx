import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

/**
 * হিসাব নিকাশ brand mark — a shop front with an awning.
 *
 * Deliberately an inline SVG rather than an image file. The previous mark
 * was a raster asset served from a Lovable-hosted `/__l5e/...` URL, which
 * does not exist on this deployment — the SPA rewrite answered it with
 * index.html, so the logo rendered broken everywhere it appeared. Inline
 * markup also costs no request and still draws with the network down.
 *
 * Colours come from the design tokens (`--primary`, `--primary-glow`) so
 * the mark tracks the theme in both light and dark without extra work.
 * Sizes come from the passed className (e.g. `h-6 w-6`).
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="হিসাব নিকাশ"
      className={cn("h-5 w-5 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hn-awning" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary-glow))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>

      {/* Shop body */}
      <rect x="5" y="13" width="22" height="15" rx="2.5" fill="hsl(var(--primary))" opacity="0.16" />

      {/* Awning */}
      <path d="M3.5 9.2A2 2 0 0 1 5.5 7.5h21a2 2 0 0 1 2 1.7l.6 3.3H2.9l.6-3.3Z" fill="url(#hn-awning)" />

      {/* Awning scallops, drawn as notches in the lower edge */}
      <path
        d="M2.9 12.5h26.2v.6a1.6 1.6 0 0 1-3.2 0 1.6 1.6 0 0 1-3.3 0 1.6 1.6 0 0 1-3.2 0 1.6 1.6 0 0 1-3.3 0 1.6 1.6 0 0 1-3.2 0 1.6 1.6 0 0 1-3.3 0 1.6 1.6 0 0 1-3.2 0 1.6 1.6 0 0 1-3.5 0v-.6Z"
        fill="hsl(var(--primary))"
      />

      {/* Doorway — reads as a ledger page at small sizes */}
      <rect x="13" y="18" width="6" height="10" rx="1" fill="hsl(var(--primary))" />
    </svg>
  );
}

export default BrandLogo;
