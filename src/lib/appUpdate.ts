import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Keeps every open tab/app on the latest deployment without a manual refresh.
 *
 * Each build ships /version.json ({ version }) and bakes the same id into the
 * bundle (__APP_VERSION__). The app compares the two: on start-up, when it
 * returns to the foreground, and every POLL_MS. A newer build triggers a full
 * reload after clearing Cache Storage / service workers. To avoid wiping a
 * half-filled form, a reload that is found while the user is active waits for
 * the next navigation, for the app to be backgrounded, or for 20s of idleness
 * with no field focused.
 */

const POLL_MS = 30_000;
const IDLE_MS = 20_000;
const LOOP_GUARD_KEY = "hisab-nikash-update-reload";
const LOOP_GUARD_MS = 60_000;

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null; // offline or blocked: stay on the current build
  }
}

async function clearCachesAndReload(latest: string) {
  // Don't loop if the CDN keeps serving a stale shell after a reload.
  try {
    const last = JSON.parse(sessionStorage.getItem(LOOP_GUARD_KEY) ?? "null");
    if (last && last.version === latest && Date.now() - last.at < LOOP_GUARD_MS) return;
    sessionStorage.setItem(LOOP_GUARD_KEY, JSON.stringify({ version: latest, at: Date.now() }));
  } catch {
    /* ignore */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* best effort */
  }
  window.location.reload();
}

function isEditing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useAppUpdater() {
  const { pathname } = useLocation();
  const pending = useRef<string | null>(null);
  const lastActive = useRef(Date.now());
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (import.meta.env.DEV || __APP_VERSION__ === "dev") return;

    const markActive = () => {
      lastActive.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const check = async (atStartup = false) => {
      const latest = await fetchLatestVersion();
      if (!latest || latest === __APP_VERSION__) {
        pending.current = null;
        return;
      }
      pending.current = latest;
      // Nothing typed yet at start-up, or the app is in the background: safe now.
      if (atStartup || document.hidden) void clearCachesAndReload(latest);
    };

    const maybeReloadWhenIdle = () => {
      if (!pending.current) return;
      if (document.hidden || (!isEditing() && Date.now() - lastActive.current > IDLE_MS)) {
        void clearCachesAndReload(pending.current);
      }
    };

    void check(true);
    const poll = window.setInterval(() => {
      void check().then(maybeReloadWhenIdle);
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void check(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, []);

  // Navigating to another screen is a safe moment to swap in the new build.
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (pending.current) void clearCachesAndReload(pending.current);
  }, [pathname]);
}
