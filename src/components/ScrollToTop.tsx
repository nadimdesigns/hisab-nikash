import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { readSmoothScrollPref } from "@/lib/settings";

/**
 * Reset the document scroll position to the top whenever the route changes.
 *
 * Without this, React Router preserves the previous page's scroll offset on
 * client-side navigations — so opening Accounting after scrolling halfway
 * through Inventory would land the user mid-page. This component runs as a
 * sibling of <Routes> so it can observe every navigation.
 *
 * Behavior is configurable via the smooth-scroll preference (see
 * `src/lib/settings.ts`):
 *   - smooth = false (default): jump instantly so the new page paints
 *     immediately and avoids fighting any mount-time animations.
 *   - smooth = true: animate with `behavior: "smooth"` for a softer
 *     transition between pages.
 *
 * Some pages render their content inside an internal scroll container
 * (e.g. a `<main>` or a `[data-scroll-root]` element with its own
 * `overflow-y: auto`) instead of letting the window scroll. For those
 * layouts the document is already at the top, but the user is still
 * scrolled down inside the inner element. Pass `containers` to also reset
 * any matching elements found in the DOM at navigation time.
 *
 * Conventions:
 *   - Pass CSS selectors (any `document.querySelectorAll`-compatible string).
 *   - Missing selectors are silently ignored — pages that don't use an
 *     inner scroller cost nothing.
 *   - The default selector `[data-scroll-root]` lets pages opt in by
 *     simply marking their scroll element with that attribute.
 */
export function ScrollToTop({
  containers = ["[data-scroll-root]"],
}: {
  /** CSS selectors for additional inner scroll containers to reset. */
  containers?: string[];
} = {}) {
  const { pathname } = useLocation();
  useEffect(() => {
    const smooth = readSmoothScrollPref();
    const behavior: ScrollBehavior = smooth ? "smooth" : "auto";

    // 1) Reset the window / document scroll first.
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      // Older browsers don't accept the options object — fall back to the
      // positional form, which is always instant.
      window.scrollTo(0, 0);
    }
    if (!smooth && typeof document !== "undefined") {
      // Some browsers actually scroll the html or body element; force these
      // to the top in instant mode. Skip in smooth mode so we don't snap
      // mid-animation.
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    // 2) Reset any opted-in inner scroll containers. We resolve selectors
    //    on every navigation so dynamic mounts (e.g. a page-level scroll
    //    pane that only exists on certain routes) are handled correctly.
    if (typeof document === "undefined" || containers.length === 0) return;
    for (const selector of containers) {
      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        // Skip invalid selectors instead of crashing the whole reset.
        continue;
      }
      nodes.forEach((node) => {
        const el = node as HTMLElement;
        try {
          el.scrollTo({ top: 0, left: 0, behavior });
        } catch {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        }
      });
    }
  }, [pathname, containers]);
  return null;
}
