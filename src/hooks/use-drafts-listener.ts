import { useEffect, useRef } from "react";

/**
 * Subscribe to draft-cart changes (same-tab via the custom
 * `medishop-drafts-changed` event, cross-tab via the native `storage` event)
 * with a short debounce so a burst of rapid edits — e.g. quickly bumping a
 * quantity or scanning many barcodes — only triggers a single re-render.
 *
 * The default 120ms window is short enough to feel instant while still
 * collapsing chains of synchronous updates into one callback invocation.
 */
export function useDraftsListener(callback: () => void, delay = 120) {
  // Keep the latest callback in a ref so consumers don't need to memoize it
  // and the effect can stay mounted for the lifetime of the component.
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        cbRef.current();
      }, delay);
    };
    window.addEventListener("medishop-drafts-changed", schedule);
    window.addEventListener("storage", schedule);
    return () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener("medishop-drafts-changed", schedule);
      window.removeEventListener("storage", schedule);
    };
  }, [delay]);
}
