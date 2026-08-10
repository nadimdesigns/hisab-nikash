import { useEffect, useRef, useState } from "react";

/**
 * Global typography hover inspector.
 *
 * Hover the cursor on any text in the app for 4 seconds and a small
 * tooltip will appear showing which global typography token the text
 * currently matches (H1, H2, H3, H4, Primary, Body, Small / Muted, Mono),
 * along with its computed font-size, line-height and weight.
 */

type TypoMatch = {
  name: string;
  size: string;
  lineHeight: string;
  weight: string;
  family: string;
};

/**
 * Per-breakpoint canonical pixel sizes for each role in the design system.
 * Mirrors the strings in `src/lib/typography.ts`. Update both places when
 * the scale changes.
 */
type Bp = "mobile" | "sm" | "lg";
const ROLE_SIZES: Record<Bp, Record<string, number>> = {
  mobile: { h1: 30, h2: 24, h3: 20, h4: 18, body: 14, small: 12 },
  sm:     { h1: 34, h2: 28, h3: 22, h4: 19, body: 15, small: 13 },
  lg:     { h1: 36, h2: 30, h3: 24, h4: 20, body: 16, small: 14 },
};

function currentBreakpoint(): Bp {
  const w = window.innerWidth;
  if (w >= 1024) return "lg";
  if (w >= 640) return "sm";
  return "mobile";
}

/**
 * Match by computed pixel font-size for the current viewport. Use weight
 * + element role to disambiguate variants that share a size (e.g. body
 * vs body-strong vs body-muted, or stat-label vs body).
 */
function classifyTypography(el: Element): TypoMatch | null {
  const cs = window.getComputedStyle(el as HTMLElement);
  const sizePx = Math.round(parseFloat(cs.fontSize));
  const weight = parseInt(cs.fontWeight, 10) || 400;
  const family = cs.fontFamily;
  const color = cs.color;
  const isMono = /mono|menlo|consolas|courier|sf mono|jetbrains/i.test(family);
  const tag = el.tagName.toLowerCase();

  // Monospace family: distinguish inline <code> (boxed) from a plain
  // mono span by checking background.
  if (isMono) {
    const bg = cs.backgroundColor;
    const hasBg = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    const name = tag === "code" || hasBg ? "Code" : "Mono";
    return finalize(name, sizePx, cs, family, weight);
  }

  // Resolve the role table for the current breakpoint, then find the
  // closest size match (within 1px) so 14.5px etc. still map cleanly.
  const sizes = ROLE_SIZES[currentBreakpoint()];
  const within = (a: number, b: number) => Math.abs(a - b) <= 1;

  // Heading detection prefers the actual semantic tag when sizes overlap.
  const headingRoles: Array<keyof typeof sizes> = ["h1", "h2", "h3", "h4"];
  for (const role of headingRoles) {
    if (within(sizePx, sizes[role]) || tag === role) {
      if (within(sizePx, sizes[role])) {
        return finalize(role.toUpperCase(), sizePx, cs, family, weight);
      }
    }
  }

  // Body family — three variants share the same size, so use weight and
  // muted color to pick.
  if (within(sizePx, sizes.body)) {
    const isMuted = isMutedColor(color);
    if (weight >= 600) return finalize("Body Strong", sizePx, cs, family, weight);
    if (weight >= 500 && !isMuted) return finalize("Body Strong", sizePx, cs, family, weight);
    if (isMuted) return finalize("Body Muted", sizePx, cs, family, weight);
    return finalize("Body", sizePx, cs, family, weight);
  }

  // Stat label / sub: same pixel size as Small on mobile and Body on lg,
  // but always uppercase-ish eyebrow with letter-spacing. We can't rely
  // on tracking from getComputedStyle reliably, so fall back to Small.
  if (within(sizePx, sizes.small)) {
    const isMuted = isMutedColor(color);
    return finalize(isMuted ? "Muted" : "Small", sizePx, cs, family, weight);
  }

  // Anything bigger than h1 — call it Display.
  if (sizePx >= sizes.h1 + 2) {
    return finalize("Display", sizePx, cs, family, weight);
  }

  // Fallback for sizes that don't match any token (custom inline styles).
  return finalize(`Custom (${sizePx}px)`, sizePx, cs, family, weight);
}

function finalize(
  name: string,
  sizePx: number,
  cs: CSSStyleDeclaration,
  family: string,
  weight: number,
): TypoMatch {
  return {
    name,
    size: `${sizePx}px`,
    lineHeight: cs.lineHeight,
    weight: String(weight),
    family: family.split(",")[0].replace(/['"]/g, "").trim(),
  };
}

/**
 * Heuristic check: does this CSS color look like the design system's
 * `--muted-foreground`? We compare against the resolved CSS variable so
 * the inspector keeps working in both light and dark themes.
 */
function isMutedColor(color: string): boolean {
  if (typeof document === "undefined") return false;
  const root = getComputedStyle(document.documentElement);
  const muted = root.getPropertyValue("--muted-foreground").trim();
  if (!muted) return false;
  // Build a probe element to resolve the HSL var into rgb() like the
  // browser would for `color: hsl(var(--muted-foreground))`.
  const probe = document.createElement("span");
  probe.style.color = `hsl(${muted})`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved === color;
}

// Walk up to find the nearest element that actually renders text content.
function findTextElement(start: Element | null): Element | null {
  let el: Element | null = start;
  let depth = 0;
  while (el && depth < 6) {
    const text = (el.textContent ?? "").trim();
    if (text.length > 0) {
      // Prefer leaf-ish elements: an element whose direct child text nodes
      // contain non-whitespace.
      const hasOwnText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 0,
      );
      if (hasOwnText) return el;
    }
    el = el.parentElement;
    depth++;
  }
  return start;
}

export default function TypographyHoverInspector() {
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef<Element | null>(null);
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    info: TypoMatch;
  } | null>(null);

  useEffect(() => {
    const HOVER_MS = 4000;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;

      // Don't activate on form controls or inside the inspector itself.
      if (
        target.closest("[data-typo-inspector]") ||
        target.closest("input, textarea, select, button, [role='button'], [role='menu'], [role='dialog']")
      ) {
        clearTimer();
        setTip(null);
        targetRef.current = null;
        return;
      }

      const textEl = findTextElement(target);
      if (!textEl || (textEl.textContent ?? "").trim().length === 0) {
        clearTimer();
        setTip(null);
        targetRef.current = null;
        return;
      }

      if (textEl === targetRef.current) return; // unchanged target

      targetRef.current = textEl;
      setTip(null);
      clearTimer();

      const startX = e.clientX;
      const startY = e.clientY;
      timerRef.current = window.setTimeout(() => {
        const info = classifyTypography(textEl);
        if (!info) return;
        setTip({ x: startX, y: startY, info });
      }, HOVER_MS);
    };

    const onLeave = () => {
      clearTimer();
      setTip(null);
      targetRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onLeave, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onLeave, true);
      clearTimer();
    };
  }, []);

  if (!tip) return null;

  // Keep tooltip on screen.
  const left = Math.min(tip.x + 14, window.innerWidth - 220);
  const top = Math.min(tip.y + 18, window.innerHeight - 110);

  return (
    <div
      data-typo-inspector
      className="pointer-events-none fixed z-[9999] rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-elevated"
      style={{ left, top, maxWidth: 220 }}
    >
      <div className="text-xs font-semibold">{tip.info.name}</div>
      <dl className="mt-1 space-y-0.5 font-mono text-[10px] text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>size</dt>
          <dd className="text-foreground">{tip.info.size}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>line-height</dt>
          <dd className="text-foreground">{tip.info.lineHeight}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>weight</dt>
          <dd className="text-foreground">{tip.info.weight}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>family</dt>
          <dd className="text-foreground truncate">{tip.info.family}</dd>
        </div>
      </dl>
    </div>
  );
}
