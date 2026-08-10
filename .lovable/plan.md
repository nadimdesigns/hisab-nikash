# Style Guide as a Live Design Control Panel

Turn the Style Guide into the source of truth: editing a color or a typography spec there instantly updates the entire app, and the changes persist across reloads. Also normalize every typography size to whole pixel values (no `13.5px`, `15.75px`, etc.).

## What becomes editable

**Colors** (semantic HSL tokens from `src/index.css`):
- `background`, `foreground`, `card`, `primary`, `primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`, `sidebar-*`.
- Edited via a color picker per token. Stored as HSL triplets, written into a runtime `<style>` block on `:root` (and `.dark` if the user is in dark mode).

**Typography** (per variant: h1, h2, h3, h4, body, body-strong, body-muted, small, muted, mono, code):
- Per device (mobile / tablet / desktop): font-size (px, integer), line-height (px, integer), font-weight, letter-spacing.
- Font family per role (sans default `Outfit`, mono default `Outfit`).

## New integer-pixel scale

Replace today's mixed rem/px values so every size is a whole pixel number on every breakpoint:

```text
variant       mobile         tablet         desktop
h1            30 / 36 / 600  34 / 40 / 600  40 / 48 / 600
h2            24 / 32 / 600  28 / 34 / 600  32 / 40 / 600
h3            20 / 28 / 600  22 / 30 / 600  26 / 34 / 600
h4            18 / 26 / 600  19 / 26 / 600  22 / 30 / 600
body-strong   14 / 20 / 500  15 / 22 / 500  16 / 24 / 500
body          14 / 20 / 400  15 / 22 / 400  16 / 24 / 400
body-muted    14 / 20 / 400  15 / 22 / 400  16 / 24 / 400
small         13 / 18 / 400  13 / 18 / 400  14 / 20 / 400
muted         13 / 18 / 400  13 / 18 / 400  14 / 20 / 400
mono          14 / 20 / 400  15 / 22 / 400  16 / 24 / 400
code          12 / 16 / 400  13 / 18 / 400  14 / 20 / 400
```

(Values shown as `size / line-height / weight`. Tracking defaults to `-0.025em` for h1–h3, `0` elsewhere. All values are editable in the Style Guide.)

## How runtime overrides work

1. Introduce CSS variables for each variant + breakpoint, e.g.
   ```css
   :root {
     --ty-body-size: 14px;   --ty-body-lh: 20px;   --ty-body-weight: 400;
     --ty-body-size-sm: 15px; --ty-body-lh-sm: 22px;
     --ty-body-size-lg: 16px; --ty-body-lh-lg: 24px;
   }
   ```
2. Rewrite the `typo-*` Tailwind component classes in `src/index.css` to consume those variables (with `@media` queries for `sm` and `lg`). The TS helper `typography(variant)` returns the matching `typo-*` class — call sites don't change.
3. A new `useDesignTokens` zustand store (persisted to `localStorage`) holds user overrides. A small `<DesignTokensProvider>` mounted in `App.tsx` writes the active overrides into a single injected `<style id="design-tokens-overrides">` block on every change.
4. Colors work the same way — overrides set `--primary`, `--background`, etc. on `:root` / `.dark`.
5. A "Reset to defaults" button per section clears overrides for that section.

## Style Guide UI changes

- Each typography card gets inline editors for size / line-height / weight / tracking per device (number inputs, integers only — `step=1`, `min=8`). Family selector at the card level.
- Each color swatch becomes a clickable chip that opens a color picker (HSL sliders + hex input).
- Header gains a "Reset all" button and a small "Unsaved overrides active" indicator when any token differs from defaults.

## Technical notes

- Files touched:
  - `src/index.css` — declare default `--ty-*` variables and rewrite `.typo-*` component classes to use them; same pattern stays for color vars.
  - `src/lib/typography.ts` — `TYPOGRAPHY` map becomes thin wrappers around `typo-*` classes; `BODY_TEXT`, `SMALL_TEXT`, `HEADING_TEXT` legacy exports point at the new classes too.
  - `src/lib/designTokens.ts` (new) — defaults table, zustand store, types, serializer.
  - `src/components/DesignTokensProvider.tsx` (new) — mounts the override `<style>` tag.
  - `src/App.tsx` — wrap app in `<DesignTokensProvider>`.
  - `src/pages/StyleGuide.tsx` — replace static spec tables with editable controls; remove the device-only sampleClass switch (samples now reflect real CSS via the active variant class).
- Inline `text-sm sm:text-[15px] …` triples remaining in components are not affected (they aren't variant-based). Migration of those stays out of scope here; the memory rule already steers new code to `typo-*`.
- No backend changes; overrides are local to each browser. Multi-user sync can be a follow-up.

## Out of scope

- Editing spacing scale, radii, shadows, or component variants.
- Per-user / per-account persistence (server-side).
- Migrating every remaining inline Tailwind size triple in the codebase to `typo-*` (large mechanical pass; can be a separate task).
