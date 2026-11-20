# হিসাব নিকাশ (Hisab Nikash): project rules

## Style guide = the UI source of truth (always mirrored, always in sync, dynamic)

`/style-guide` (`src/pages/StyleGuide.tsx`) shows every color token, text style and
global component. These rules always apply:

1. **Every UI change updates the style guide in the same change.** Changing a color token,
   a typography variant, a global/shared component (`src/components/ui/*`, `QtyStepper`,
   `BrandLogo`, onboarding option cards, toasts, tables...) or adding a new
   variant/component means the style guide must show the new state. A new shared
   component or variant gets its own entry there.
2. **The sync goes both ways.** The style guide is *dynamic*, not a screenshot:
   - It must render the real thing: real tokens (CSS variables), the real
     `TYPOGRAPHY` map and the real components, never a hand-copied look-alike.
   - A change made through the style guide has to apply to the global UI (it must write
     to the same tokens/components the app uses), not to a separate copy.
3. **Prefer one source of truth over duplicated values.** Where the style guide still
   repeats a value (e.g. `TYPE_SPECS`, `BRAND_SCALE`, the `SEMANTIC_TOKENS` list), move
   it to a shared module that both the app config and the style guide import, and do not
   add new copies.

Where the sources of truth live:

| What | Source |
| --- | --- |
| Color tokens (light/dark), gradients, tints | `src/index.css` |
| Brand blue scale (`brand-50…950`) | `tailwind.config.ts` |
| Typography variants / `typo-*` classes | `src/lib/typography.ts` + the typography plugin in `tailwind.config.ts` |
| Shared components | `src/components/ui/*`, `src/components/*` |

Before finishing any UI task, check `/style-guide` still matches (light and dark).
