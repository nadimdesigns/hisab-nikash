import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { IS_APK, LIVE_ORIGIN } from "@/lib/appTarget";
import { updatesHeld } from "@/lib/updateGate";

/**
 * Keeps every open tab / installed app on the latest deployment without a manual refresh.
 *
 * Each deploy of main publishes two builds that share one version id:
 *  - the live site, with /version.json ({ version }),
 *  - the Android bundle, with /apk/version.json ({ version, url, minNative }) and a zip.
 * The running build knows its own id (__APP_VERSION__) and compares it with the published
 * one on start-up, when it returns to the foreground and every POLL_MS.
 *
 *  - web: a newer build clears Cache Storage / service workers and reloads.
 *  - apk: the bundle zip is downloaded in the background through the Capacitor updater
 *    (src/targets/apk/otaUpdate.ts), staged for the next launch, and switched to right away
 *    at a safe moment. The packaged build keeps working offline; no download is attempted
 *    while offline.
 *
 * To avoid wiping a half-filled form or a request in flight, an update is only applied:
 *  - right at start-up (the page has just loaded, nothing typed yet),
 *  - when the user navigates to another screen (except straight out of /login),
 *  - when the app is in the background or has been idle for 20 s,
 * and never on /login, while a field is focused, or while a screen holds updates (updateGate.ts,
 * e.g. during signup). Coming back to the foreground only checks; it never reloads by itself.
 * A one-minute guard prevents reload loops.
 */

const POLL_MS = 30_000;
const IDLE_MS = 20_000;
const LOOP_GUARD_KEY = "hisab-nikash-update-reload";
const LOOP_GUARD_MS = 60_000;

export type LatestBuild = { version: string; url?: string; minNative?: string };

async function fetchLatest(): Promise<LatestBuild | null> {
  // The APK is served from the device, so it has to ask the live site (absolute URL).
  const url = IS_APK ? `${LIVE_ORIGIN}/apk/version.json` : "/version.json";
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.version !== "string") return null;
    return { version: data.version, url: data.url, minNative: data.minNative };
  } catch {
    return null; // offline or blocked: stay on the current build
  }
}

function shouldSkipRepeat(version: string): boolean {
  // Don't loop if a stale shell keeps coming back after a reload / switch.
  try {
    const last = JSON.parse(sessionStorage.getItem(LOOP_GUARD_KEY) ?? "null");
    if (last && last.version === version && Date.now() - last.at < LOOP_GUARD_MS) return true;
    sessionStorage.setItem(LOOP_GUARD_KEY, JSON.stringify({ version, at: Date.now() }));
  } catch {
    /* ignore */
  }
  return false;
}

async function clearCachesAndReload(latest: LatestBuild) {
  if (shouldSkipRepeat(latest.version)) return;
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

/** Downloads the new bundle (apk) / nothing to prepare (web). Returns false if it cannot be applied. */
async function prepare(latest: LatestBuild): Promise<boolean> {
  // `__IS_APK__` (not IS_APK) so the web build drops the Capacitor code entirely.
  if (__IS_APK__) {
    const ota = await import("@/targets/apk/otaUpdate");
    return ota.stageBundle(latest);
  }
  return true;
}

async function apply(latest: LatestBuild) {
  if (__IS_APK__) {
    if (shouldSkipRepeat(latest.version)) return;
    const ota = await import("@/targets/apk/otaUpdate");
    await ota.switchToStaged(latest);
    return;
  }
  await clearCachesAndReload(latest);
}

/** A reload now would lose something the user is doing (login form, focused field, request in flight). */
function mustNotInterrupt(): boolean {
  return window.location.pathname === "/login" || updatesHeld() || isEditing();
}

function isEditing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useAppUpdater() {
  const { pathname } = useLocation();
  const pending = useRef<LatestBuild | null>(null);
  const lastActive = useRef(Date.now());
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (import.meta.env.DEV || __APP_VERSION__ === "dev") return;

    // APK: tell the updater this bundle started fine (otherwise it rolls back to the previous one).
    if (__IS_APK__) void import("@/targets/apk/otaUpdate").then((ota) => ota.markReady());

    const markActive = () => {
      lastActive.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const check = async (atStartup = false) => {
      const latest = await fetchLatest();
      if (!latest || latest.version === __APP_VERSION__) {
        pending.current = null;
        return;
      }
      if (!(await prepare(latest))) return; // e.g. needs a newer APK, or the download failed
      pending.current = latest;
      // Only at start-up: the page has just loaded, so nothing can be lost.
      if (atStartup && !updatesHeld() && !isEditing()) void apply(latest);
    };

    const maybeApplyWhenIdle = () => {
      if (!pending.current || mustNotInterrupt()) return;
      if (document.hidden || Date.now() - lastActive.current > IDLE_MS) {
        void apply(pending.current);
      }
    };

    void check(true);
    const poll = window.setInterval(() => {
      void check().then(maybeApplyWhenIdle);
    }, POLL_MS);
    // Coming back to the app or the network returning only looks for / downloads the new build;
    // it is applied at the next safe moment, never by interrupting what the user is doing.
    const onVisible = () => {
      if (document.hidden) maybeApplyWhenIdle();
      else void check();
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

  // Navigating to another screen is a safe moment to swap in the new build, except right after
  // logging in or signing up (leave /login alone; it is applied a little later when idle).
  useEffect(() => {
    const from = lastPath.current;
    lastPath.current = pathname;
    if (from === pathname || from === "/login" || updatesHeld()) return;
    if (pending.current) void apply(pending.current);
  }, [pathname]);
}
