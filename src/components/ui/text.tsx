import { createElement, forwardRef, type ElementType, type HTMLAttributes } from "react";
import {
  TYPOGRAPHY,
  type TypographyVariant,
  typography,
} from "@/lib/typography";

/**
 * Default DOM element for each typography variant. Authors can override
 * with the `as` prop when the semantics call for it (e.g. rendering a
 * heading style inside a `<span>` for visual-only emphasis).
 */
const DEFAULT_ELEMENT: Record<TypographyVariant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  body: "p",
  "body-strong": "p",
  "body-muted": "p",
  small: "span",
  muted: "span",
  mono: "span",
  code: "code",
  "stat-label": "p",
  "stat-sub": "p",
};

type TextProps = Omit<HTMLAttributes<HTMLElement>, "color"> & {
  /** Which design-system role this text fills. */
  variant?: TypographyVariant;
  /** Override the rendered element (defaults depend on variant). */
  as?: ElementType;
};

/**
 * Single text primitive that maps a typography *role* to the right
 * Tailwind classes and DOM element. Prefer this over hand-rolled
 * `text-sm`/`text-xs` strings so the global mapping in
 * `src/lib/typography.ts` stays the only place sizes are defined.
 *
 * Examples:
 *   <Text>Default body copy</Text>
 *   <Text variant="body-muted">Secondary description</Text>
 *   <Text variant="h2">Section title</Text>
 *   <Text variant="muted" as="p">Footer note</Text>
 */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { variant = "body", as, className, ...rest },
  ref,
) {
  const Element = as ?? DEFAULT_ELEMENT[variant];
  return createElement(Element, {
    ref,
    className: typography(variant, className),
    ...rest,
  });
});

export { TYPOGRAPHY, typography };
export type { TypographyVariant };
