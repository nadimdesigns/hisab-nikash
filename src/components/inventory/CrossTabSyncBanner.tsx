import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { typography } from "@/lib/typography";

/**
 * Small inline banner that appears whenever the shop store is rehydrated
 * because of a change made in another browser tab.
 *
 * The store dispatches a `medishop-store-synced` window event after it
 * applies an external update (see `src/store/shop.ts`). We listen for
 * that event and surface a brief, dismissible visual cue so the user
 * understands why their inventory rows just changed under them.
 *
 * The banner auto-hides after a short delay; if multiple sync events
 * arrive in quick succession (a burst of edits in another tab) the
 * timer is reset so the banner stays visible until things quiet down.
 */
export default function CrossTabSyncBanner({
  visibleMs = 1800,
  className,
}: {
  /** How long to keep the banner visible after the last sync event. */
  visibleMs?: number;
  /** Optional wrapper classes (e.g. spacing) applied when visible. */
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const onSync = () => {
      setVisible(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, visibleMs);
    };
    window.addEventListener("medishop-store-synced", onSync);
    return () => {
      window.removeEventListener("medishop-store-synced", onSync);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [visibleMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "flex items-center gap-2 rounded-md border border-primary/30 bg-accent px-3 py-2 text-accent-foreground shadow-soft animate-in fade-in slide-in-from-top-1" +
        (className ? " " + className : "")
      }
    >
      <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden />
      <span className={typography("body-strong")}>
        Refreshing inventory — updates from another tab.
      </span>
    </div>
  );
}
