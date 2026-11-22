# হিসাব নিকাশ (Hisab Nikash): project rules

## Style guide = the UI source of truth (always mirrored, always in sync, dynamic)

`/style-guide` (`src/pages/StyleGuide.tsx`) shows every color token, text style and
global component. These rules always apply:

1. **Every UI change updates the style guide in the same change.** Changing a color token,
   a typography variant, a global/shared component (`src/components/ui/*`, `QtyStepper`,
   `BrandLogo`, onboarding option cards, toasts, tables...) or adding a new
   variant/component means the style guide must show the new state. A new shared
   component or variant gets its own entry there.
2. **The sync goes both ways.** The style guide is *dynamic*, not a screenshot:
   - It must render the real thing: real tokens (CSS variables), the real
     `TYPOGRAPHY` map and the real components, never a hand-copied look-alike.
   - A change made through the style guide has to apply to the global UI (it must write
     to the same tokens/components the app uses), not to a separate copy.
3. **Prefer one source of truth over duplicated values.** Where the style guide still
   repeats a value (e.g. `TYPE_SPECS`, `BRAND_SCALE`, the `SEMANTIC_TOKENS` list), move
   it to a shared module that both the app config and the style guide import, and do not
   add new copies.

Where the sources of truth live:

| What | Source |
| --- | --- |
| Color tokens (light/dark), gradients, tints | `src/index.css` |
| Brand blue scale (`brand-50…950`) | `tailwind.config.ts` |
| Typography variants / `typo-*` classes | `src/lib/typography.ts` + the typography plugin in `tailwind.config.ts` |
| Shared components | `src/components/ui/*`, `src/components/*` |

Before finishing any UI task, check `/style-guide` still matches (light and dark).

## Android app (APK): same app, over-the-air UI updates

`main` is the single source for both the live site and the Android app. **The app is the same:** the same
onboarding and phone + PIN signup/login (Supabase), the same screens; shop data lives on the device
(localStorage, per account) **and is synced to Supabase** (`hisab_nikash_records`, `src/lib/cloudSync.ts` +
`cloudSyncCore.ts`), so the same phone number shows the same shop on every device. Opening the app offline works
once someone is signed in (the stored session is trusted offline, `src/lib/auth.ts`) and offline edits sync when the
network returns; signing up or logging in needs internet.

- `VITE_APP_TARGET=apk` (see `vite.config.ts`, `src/lib/appTarget.ts`, `__IS_APK__`) only changes what the
  Android bundle needs: the over-the-air updater (`src/targets/apk/otaUpdate.ts`) and leaving out the
  `/style-guide` page. Do **not** fork UI or auth for the APK; change the shared file once.
- Code that must exist in only one build goes behind `__IS_APK__` (a literal injected by vite, so the
  other build drops it; `IS_APK` from `appTarget.ts` is fine for plain values but does **not** let
  the bundler drop dynamic imports).
- Every deploy of main (`npm run build:all` on Vercel) publishes the web build **and**
  `/apk/version.json` + `/apk/bundle-<version>.zip`. Installed APKs poll `/apk/version.json`
  (`src/lib/appUpdate.ts`), download newer bundles with `@capgo/capacitor-updater` and switch at a safe
  moment, so UI changes reach the APK without a new APK. localStorage (shop data, session) is untouched.
- A new APK/AAB is only needed for **native** changes (plugins, permissions, icon, splash). Bump
  `APK_MIN_NATIVE` (scripts/zip-apk-bundle.mjs) when a bundle needs a newer native shell.
- The Android shell (`android/`, `capacitor.config.ts`, APK workflow) lives on the `Apk` branch only.

## Cloud sync (shop data on every device)

Shop data is a set of records (`products`, `sales`, `purchases`, `dues`, `payments`, `profiles`, `meta`), one cloud
row each, settled per record, last write wins by the edit time (`ts`); deletes are tombstones. The stores know
nothing about sync: `cloudSyncCore.stampLocal` finds edits by comparing records with what was last seen.
**When you add a new persisted collection or a new localStorage key that holds shop data, add it to `readLive` /
`writeBack` in `src/lib/cloudSync.ts` (and to the `coll` check in the table) or it will not follow the account.**
Server changes go in `supabase/migrations/` (prefix `hisab_nikash_`, the project is shared with other apps).

## Auto-updater must never interrupt the user

`useAppUpdater` (`src/lib/appUpdate.ts`) reloads the page / switches the APK bundle after a deploy. It only
applies an update at start-up, on navigation (not straight out of `/login`), or when backgrounded/idle, and
never on `/login`, with a field focused, or while `holdUpdates()` (`src/lib/updateGate.ts`) is held. Any
screen that runs a multi-step async action a reload would half-finish (signup, payment, a save in flight)
must wrap it in `const release = holdUpdates(); try { ... } finally { release(); }`.
(A reload between "account created" and "signed in" once dropped new users back on onboarding step 1.)

## Every reply about a change must say whether a new APK/AAB is needed (and why)

Never answer "tell me if you want an APK/AAB". After any change, state plainly in the reply which of
these applies, with the reason:

- **No new APK/AAB needed** (it reaches installed apps online, over the air): any change under `src/`,
  `public/`, `index.html`, styles, copy or logic that ships in the web bundle. Installed APKs/AABs pick
  it up from `/apk/version.json` after the next deploy of `main`; they apply it at a safe moment (see
  "Auto-updater must never interrupt the user"). Say which bundle version is live.
- **New APK + AAB needed**, and then build and send them without being asked: native/shell changes on
  the `Apk` branch (`android/`, `capacitor.config.ts`): Capacitor plugins, permissions, launcher icon,
  splash, app name, package id, signing key, `APK_MIN_NATIVE` bump, a new Play Store release (versionCode
  is the CI run number). Say what native thing changed and that the OTA update cannot deliver it.
- If an installed APK was signed with a different key than the new one, say that it must be
  uninstalled once (shop data is on the device and is lost) and that later updates then install over it.
- Always say what was and was not verified on a real phone.
