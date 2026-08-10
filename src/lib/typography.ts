/**
 * Global typography mapping — single source of truth for every text style
 * used in the app.
 *
 * Each variant resolves to a `typo-*` Tailwind component class, which is
 * itself driven by CSS variables (see `tailwind.config.ts` + the runtime
 * overrides set by `DesignTokensProvider`). That means editing a value
 * from the Style Guide instantly updates every component that uses
 * `typography(...)`, `<Text variant="...">`, or one of the `typo-*`
 * classes directly.
 */

import { cn } from "@/lib/utils";

/** Every typography role recognized by the design system. */
export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "body-strong"
  | "body-muted"
  | "small"
  | "muted"
  | "mono"
  | "code"
  | "stat-label"
  | "stat-sub";

/** Maps a variant to the matching `typo-*` Tailwind component class. */
export const TYPOGRAPHY: Record<TypographyVariant, string> = {
  h1: "typo-h1",
  h2: "typo-h2",
  h3: "typo-h3",
  h4: "typo-h4",
  body: "typo-body",
  "body-strong": "typo-body-strong",
  "body-muted": "typo-body-muted",
  small: "typo-small",
  muted: "typo-muted",
  mono: "typo-mono",
  code: "typo-code",

  // Stat / KPI helpers — composed from `typo-small` plus utility classes
  // so they pick up the same live overrides as the rest of the scale.
  "stat-label": "typo-small font-medium tracking-wide text-muted-foreground",
  "stat-sub": "typo-small text-muted-foreground",
};

/**
 * Resolve a typography variant (optionally combined with extra classes).
 *
 * Example:
 *   <p className={typography("body-muted", "max-w-prose")}>…</p>
 */
export function typography(variant: TypographyVariant, extra?: string) {
  return cn(TYPOGRAPHY[variant], extra);
}

// ---------------------------------------------------------------------------
// Backwards-compatible exports.
//
// Older code calls these constants directly. They now point at the same
// `typo-*` classes so live overrides apply everywhere.
// ---------------------------------------------------------------------------

/** Body copy — equivalent to `typo-body`. */
export const BODY_TEXT = "typo-body";

/** Small / muted helper text — equivalent to `typo-small`. */
export const SMALL_TEXT = "typo-small";

/** Monospace / code style at body size. */
export const MONO_TEXT = "typo-mono";

/** Heading scale (h1–h4), for legacy callers. */
export const HEADING_TEXT = {
  h1: "typo-h1",
  h2: "typo-h2",
  h3: "typo-h3",
  h4: "typo-h4",
} as const;

export type HeadingLevel = keyof typeof HEADING_TEXT;
