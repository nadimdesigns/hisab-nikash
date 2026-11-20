# হিসাব নিকাশ: Android shell

This branch holds **only the Android wrapper** (`android/`, `capacitor.config.ts`) and the workflow
that builds the APK. The app UI lives on `main` and is built as the offline `apk` variant
(`VITE_APP_TARGET=apk`).

- **Build an APK:** GitHub → Actions → *Build Android APK* → *Run workflow* (UI = `main` by default),
  or push to this branch. The APK is attached to the `apk-latest` release and as an artifact.
- **UI updates:** not needed here. Every deploy of `main` publishes `/apk/version.json` and a bundle
  zip; installed apps download it when they are online (see `src/targets/apk/otaUpdate.ts` on `main`).
- **Rebuild the APK only for native changes:** plugins, permissions, launcher icon, splash, theme colours.
  Bump `APK_MIN_NATIVE` in `scripts/zip-apk-bundle.mjs` on `main` if a new bundle needs the newer native shell.
- The previous full offline copy of the app (before the single-codebase change) is in this branch's git history
  (commit `c38a803`).
