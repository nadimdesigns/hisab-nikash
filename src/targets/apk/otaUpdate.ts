import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import type { LatestBuild } from "@/lib/appUpdate";
import { errorText, logOta } from "@/lib/otaLog";

/**
 * Over-the-air updates for the Android app (APK build only; web never imports this).
 *
 * The APK ships one bundle (works offline from the first launch). When the app is online it
 * downloads newer bundles published by the live deploy (/apk/bundle-<version>.zip) with
 * @capgo/capacitor-updater in manual mode (capacitor.config.ts: autoUpdate off), then
 * activates them. The bundle runs from the same WebView origin, so localStorage (all shop
 * data) is untouched by a switch. If a new bundle fails to start, the updater rolls back.
 *
 * Every function is a safe no-op outside the native app and swallows errors: an update
 * problem must never stop the offline app from working.
 */

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Dotted-number compare: 1 if a > b, -1 if a < b, 0 if equal. Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Call as soon as the app starts: confirms this bundle is healthy (no rollback). */
export async function markReady(): Promise<void> {
  if (!isNative()) return;
  try {
    await CapacitorUpdater.notifyAppReady();
    logOta(`bundle ${__APP_VERSION__} started fine`);
  } catch (e) {
    logOta(`notifyAppReady failed: ${errorText(e)}`);
  }
}

// version -> bundle id, for bundles already downloaded in this session (also de-dupes concurrent checks).
const staged = new Map<string, Promise<string | null>>();

/**
 * Downloads the bundle for `latest` and schedules it for the next launch / backgrounding.
 * Returns false when it cannot or should not be applied (not native, no URL, needs a newer APK,
 * download failed).
 */
export function stageBundle(latest: LatestBuild): Promise<boolean> {
  if (!isNative() || !latest.url) return Promise.resolve(false);
  let job = staged.get(latest.version);
  if (!job) {
    job = (async () => {
      try {
        if (latest.minNative) {
          const { native } = await CapacitorUpdater.current();
          if (compareVersions(native, latest.minNative) < 0) {
            logOta(`needs a newer APK (installed ${native}, bundle needs ${latest.minNative})`);
            return null; // needs a new APK install
          }
        }
        // The updater refuses a bundle it cannot verify ("Checksum required"), so a manifest without one is unusable.
        if (!latest.checksum) {
          logOta(`manifest ${latest.version} has no checksum`);
          return null;
        }
        logOta(`downloading ${latest.version}`);
        const bundle = await CapacitorUpdater.download({ url: latest.url!, version: latest.version, checksum: latest.checksum });
        await CapacitorUpdater.next({ id: bundle.id }); // activates on background / relaunch even if we never switch
        logOta(`downloaded ${latest.version}, will start on next launch`);
        return bundle.id;
      } catch (e) {
        logOta(`download of ${latest.version} failed: ${errorText(e)}`);
        return null;
      }
    })();
    staged.set(latest.version, job);
    // A failed attempt may be retried on a later check.
    void job.then((id) => {
      if (!id) staged.delete(latest.version);
    });
  }
  return job.then((id) => id !== null);
}

/** Switches to the staged bundle now. The WebView reloads on the new bundle. */
export async function switchToStaged(latest: LatestBuild): Promise<void> {
  const id = await staged.get(latest.version);
  if (!id) return;
  try {
    logOta(`switching to ${latest.version}`);
    await CapacitorUpdater.set({ id });
  } catch (e) {
    logOta(`switch to ${latest.version} failed: ${errorText(e)}`);
    /* stay on the current bundle */
  }
}
