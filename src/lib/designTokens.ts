/**
 * Design tokens — runtime-editable typography + color overrides.
 *
 * Defaults below mirror what's compiled into the Tailwind plugin in
 * `tailwind.config.ts`. The Style Guide writes user overrides into a
 * zustand store, the provider serializes them to a single `<style>` tag
 * on `:root`, and the `typo-*` classes (which use CSS variables with
 * fallbacks) pick them up live.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TypographyVariantKey =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body-strong"
  | "body"
  | "body-muted"
  | "small"
  | "muted"
  | "mono"
  | "code";

export type BreakpointKey = "mobile" | "tablet" | "desktop";

export interface TypographySpec {
  /** Font size in integer pixels. */
  size: number;
  /** Line height in integer pixels. */
  lh: number;
  /** Font weight (100–900). */
  weight: number;
  /** Letter-spacing string (e.g. "-0.025em", "0"). */
  tracking: string;
}

export type TypographyTable = Record<
  TypographyVariantKey,
  Record<BreakpointKey, TypographySpec>
>;

const T = (size: number, lh: number, weight: number, tracking = "0"): TypographySpec => ({
  size,
  lh,
  weight,
  tracking,
});

/** Integer-pixel scale — single source of truth used by Tailwind + this store. */
export const TYPOGRAPHY_DEFAULTS: TypographyTable = {
  h1: {
    mobile: T(30, 36, 600, "-0.025em"),
    tablet: T(34, 40, 600, "-0.025em"),
    desktop: T(40, 48, 600, "-0.025em"),
  },
  h2: {
    mobile: T(24, 32, 600, "-0.025em"),
    tablet: T(28, 34, 600, "-0.025em"),
    desktop: T(32, 40, 600, "-0.025em"),
  },
  h3: {
    mobile: T(20, 28, 600, "-0.025em"),
    tablet: T(22, 30, 600, "-0.025em"),
    desktop: T(26, 34, 600, "-0.025em"),
  },
  h4: {
    mobile: T(18, 26, 600),
    tablet: T(19, 26, 600),
    desktop: T(22, 30, 600),
  },
  "body-strong": {
    mobile: T(14, 20, 500),
    tablet: T(15, 22, 500),
    desktop: T(16, 24, 500),
  },
  body: {
    mobile: T(14, 20, 400),
    tablet: T(15, 22, 400),
    desktop: T(16, 24, 400),
  },
  "body-muted": {
    mobile: T(14, 20, 400),
    tablet: T(15, 22, 400),
    desktop: T(16, 24, 400),
  },
  small: {
    mobile: T(13, 18, 400),
    tablet: T(13, 18, 400),
    desktop: T(14, 20, 400),
  },
  muted: {
    mobile: T(13, 18, 400),
    tablet: T(13, 18, 400),
    desktop: T(14, 20, 400),
  },
  mono: {
    mobile: T(14, 20, 400),
    tablet: T(15, 22, 400),
    desktop: T(16, 24, 400),
  },
  code: {
    mobile: T(12, 16, 400),
    tablet: T(13, 18, 400),
    desktop: T(14, 20, 400),
  },
};

/** Human label per variant (used in Style Guide). */
export const TYPOGRAPHY_LABELS: Record<TypographyVariantKey, string> = {
  h1: "Display / H1",
  h2: "H2",
  h3: "H3",
  h4: "H4",
  "body-strong": "Body Strong",
  body: "Body",
  "body-muted": "Body Muted",
  small: "Small",
  muted: "Muted",
  mono: "Mono",
  code: "Code",
};

// ---------------------------------------------------------------------------
// Colors — HSL triplet strings (e.g. "174 72% 36%"), matching index.css.
// ---------------------------------------------------------------------------

export type ColorTokenKey =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "destructive"
  | "destructive-foreground"
  | "border"
  | "input"
  | "ring";

export const COLOR_DEFAULTS_LIGHT: Record<ColorTokenKey, string> = {
  background: "210 40% 98%",
  foreground: "222 47% 11%",
  card: "0 0% 100%",
  "card-foreground": "222 47% 11%",
  popover: "0 0% 100%",
  "popover-foreground": "222 47% 11%",
  primary: "174 72% 36%",
  "primary-foreground": "0 0% 100%",
  secondary: "210 40% 96%",
  "secondary-foreground": "222 47% 11%",
  muted: "210 40% 96%",
  "muted-foreground": "215 16% 46%",
  accent: "174 60% 94%",
  "accent-foreground": "174 72% 22%",
  success: "142 71% 38%",
  "success-foreground": "0 0% 100%",
  warning: "38 92% 50%",
  "warning-foreground": "0 0% 100%",
  destructive: "0 84% 60%",
  "destructive-foreground": "0 0% 100%",
  border: "0 0% 90%",
  input: "0 0% 93%",
  ring: "174 72% 36%",
};

export const COLOR_DEFAULTS_DARK: Record<ColorTokenKey, string> = {
  background: "222 47% 7%",
  foreground: "210 40% 98%",
  card: "222 47% 10%",
  "card-foreground": "210 40% 98%",
  popover: "222 47% 10%",
  "popover-foreground": "210 40% 98%",
  primary: "174 72% 46%",
  "primary-foreground": "222 47% 7%",
  secondary: "217 33% 17%",
  "secondary-foreground": "210 40% 98%",
  muted: "217 33% 17%",
  "muted-foreground": "215 20% 65%",
  accent: "217 33% 17%",
  "accent-foreground": "210 40% 98%",
  success: "142 71% 38%",
  "success-foreground": "0 0% 100%",
  warning: "38 92% 50%",
  "warning-foreground": "0 0% 100%",
  destructive: "0 63% 40%",
  "destructive-foreground": "210 40% 98%",
  border: "217 33% 17%",
  input: "217 33% 17%",
  ring: "174 72% 46%",
};

export const COLOR_LABELS: Record<ColorTokenKey, string> = {
  background: "App background",
  foreground: "Primary text",
  card: "Card surface",
  "card-foreground": "Text on cards",
  popover: "Popover surface",
  "popover-foreground": "Text on popovers",
  primary: "Brand primary",
  "primary-foreground": "Text on primary",
  secondary: "Subtle surface",
  "secondary-foreground": "Text on secondary",
  muted: "Muted surface",
  "muted-foreground": "Muted text",
  accent: "Accent surface",
  "accent-foreground": "Text on accent",
  success: "Success",
  "success-foreground": "Text on success",
  warning: "Warning",
  "warning-foreground": "Text on warning",
  destructive: "Errors / destructive",
  "destructive-foreground": "Text on destructive",
  border: "Borders",
  input: "Input border",
  ring: "Focus ring",
};

// ---------------------------------------------------------------------------
// Zustand store — persisted overrides only (defaults stay in code).
// ---------------------------------------------------------------------------

type TypographyOverrides = Partial<
  Record<TypographyVariantKey, Partial<Record<BreakpointKey, Partial<TypographySpec>>>>
>;
type ColorOverrides = Partial<Record<ColorTokenKey, string>>;

interface DesignTokensState {
  typography: TypographyOverrides;
  colorsLight: ColorOverrides;
  colorsDark: ColorOverrides;
  setTypography: (
    variant: TypographyVariantKey,
    bp: BreakpointKey,
    patch: Partial<TypographySpec>,
  ) => void;
  setColor: (mode: "light" | "dark", token: ColorTokenKey, hsl: string) => void;
  resetTypography: () => void;
  resetColors: () => void;
  resetAll: () => void;
}

export const useDesignTokens = create<DesignTokensState>()(
  persist(
    (set) => ({
      typography: {},
      colorsLight: {},
      colorsDark: {},
      setTypography: (variant, bp, patch) =>
        set((s) => ({
          typography: {
            ...s.typography,
            [variant]: {
              ...(s.typography[variant] ?? {}),
              [bp]: { ...(s.typography[variant]?.[bp] ?? {}), ...patch },
            },
          },
        })),
      setColor: (mode, token, hsl) =>
        set((s) =>
          mode === "light"
            ? { colorsLight: { ...s.colorsLight, [token]: hsl } }
            : { colorsDark: { ...s.colorsDark, [token]: hsl } },
        ),
      resetTypography: () => set({ typography: {} }),
      resetColors: () => set({ colorsLight: {}, colorsDark: {} }),
      resetAll: () => set({ typography: {}, colorsLight: {}, colorsDark: {} }),
    }),
    { name: "pharmasee-design-tokens" },
  ),
);

// ---------------------------------------------------------------------------
// Helpers — read effective (default + override) values.
// ---------------------------------------------------------------------------

export function effectiveSpec(
  variant: TypographyVariantKey,
  bp: BreakpointKey,
  overrides: TypographyOverrides,
): TypographySpec {
  const d = TYPOGRAPHY_DEFAULTS[variant][bp];
  const o = overrides[variant]?.[bp] ?? {};
  return { ...d, ...o };
}

export function effectiveColor(
  mode: "light" | "dark",
  token: ColorTokenKey,
  overrides: ColorOverrides,
): string {
  return (
    overrides[token] ??
    (mode === "light" ? COLOR_DEFAULTS_LIGHT[token] : COLOR_DEFAULTS_DARK[token])
  );
}

// ---------------------------------------------------------------------------
// CSS serializer — turn overrides into a single CSS string.
// ---------------------------------------------------------------------------

const BP_SUFFIX: Record<BreakpointKey, string> = {
  mobile: "",
  tablet: "-sm",
  desktop: "-lg",
};

const BP_MEDIA: Record<BreakpointKey, string | null> = {
  mobile: null,
  tablet: "@media (min-width: 640px)",
  desktop: "@media (min-width: 1024px)",
};

export function buildOverrideCss(state: {
  typography: TypographyOverrides;
  colorsLight: ColorOverrides;
  colorsDark: ColorOverrides;
}): string {
  const lines: string[] = [];

  // Group typography by breakpoint so each media query is emitted once.
  const groups: Record<BreakpointKey, string[]> = { mobile: [], tablet: [], desktop: [] };
  (Object.keys(state.typography) as TypographyVariantKey[]).forEach((variant) => {
    const perBp = state.typography[variant];
    if (!perBp) return;
    (Object.keys(perBp) as BreakpointKey[]).forEach((bp) => {
      const patch = perBp[bp];
      if (!patch) return;
      const suffix = BP_SUFFIX[bp];
      if (patch.size !== undefined)
        groups[bp].push(`--ty-${variant}-size${suffix}: ${patch.size}px;`);
      if (patch.lh !== undefined)
        groups[bp].push(`--ty-${variant}-lh${suffix}: ${patch.lh}px;`);
      if (patch.weight !== undefined)
        groups[bp].push(`--ty-${variant}-weight${suffix}: ${patch.weight};`);
      if (patch.tracking !== undefined)
        groups[bp].push(`--ty-${variant}-tracking${suffix}: ${patch.tracking};`);
    });
  });

  // Mobile (no media) + colors land on the base :root block.
  const baseLines: string[] = [...groups.mobile];
  (Object.keys(state.colorsLight) as ColorTokenKey[]).forEach((token) => {
    const v = state.colorsLight[token];
    if (v) baseLines.push(`--${token}: ${v};`);
  });
  if (baseLines.length) {
    lines.push(`:root {\n  ${baseLines.join("\n  ")}\n}`);
  }

  // Dark mode colors.
  const darkLines: string[] = [];
  (Object.keys(state.colorsDark) as ColorTokenKey[]).forEach((token) => {
    const v = state.colorsDark[token];
    if (v) darkLines.push(`--${token}: ${v};`);
  });
  if (darkLines.length) {
    lines.push(`.dark {\n  ${darkLines.join("\n  ")}\n}`);
  }

  // Tablet + desktop typography in their media queries.
  (["tablet", "desktop"] as const).forEach((bp) => {
    if (!groups[bp].length) return;
    lines.push(`${BP_MEDIA[bp]} {\n  :root {\n    ${groups[bp].join("\n    ")}\n  }\n}`);
  });

  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// HSL <-> hex helpers for color pickers.
// ---------------------------------------------------------------------------

export function hslTripletToHex(triplet: string): string {
  const m = triplet.match(/(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m2 = l - c / 2;
  const to = (v: number) =>
    Math.round((v + m2) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToHslTriplet(hex: string): string {
  const m = hex.replace("#", "").match(/^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return "0 0% 0%";
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
