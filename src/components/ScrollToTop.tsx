import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset the document scroll position to the top whenever the route changes.
 *
 * Without this, React Router preserves the previous page's scroll offset on
 * client-side navigations — so opening Accounting after scrolling halfway
 * through Inventory would land the user mid-page. This component runs as a
 * sibling of <Routes> so it can observe every navigation.
 */
export function ScrollToTop({
  containers = ["[data-scroll-root]"],
}: {
  /** CSS selectors for additional inner scroll containers to reset. */
  containers?: string[];
} = {}) {
  const { pathname } = useLocation();
  useEffect(() => {
    // 1) Reset the window / document scroll first.
    try {
      window.scrollTo(0, 0);
    } catch {
      // Fallback for older browsers
    }
    if (typeof document !== "undefined") {
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
          el.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        }
      });
    }
  }, [pathname, containers]);
  return null;
}
