/**
 * Which build this is. Set by `VITE_APP_TARGET`:
 *  - unset / "web": the live site (Supabase phone+PIN login).
 *  - "apk": the bundle packaged in the Android app and delivered to it over the air
 *    (offline, no login, data on the device). See vite.config.ts and src/targets/apk.
 *
 * `__IS_APK__` is a boolean literal injected by vite (see `define` in vite.config.ts), so code
 * behind `IS_APK` is removed from the web bundle (and the other way round).
 */
export const IS_APK: boolean = __IS_APK__;

/** Where the APK looks for newer bundles (published on every deploy of main). */
export const LIVE_ORIGIN = "https://hisab-nikash.userheaven.app";
