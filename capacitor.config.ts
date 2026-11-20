import type { CapacitorConfig } from '@capacitor/cli';

// The Android shell. The UI is the `apk` build of the main branch (VITE_APP_TARGET=apk), built
// into `dist` by the APK workflow. It runs offline from the first launch, then updates itself
// over the air from https://hisab-nikash.userheaven.app/apk/version.json (see src/targets/apk/otaUpdate.ts
// on main), so a new APK is only needed for native changes (plugins, permissions, icon, splash).
const config: CapacitorConfig = {
  appId: 'app.userheaven.hisabnikash',
  appName: 'হিসাব নিকাশ',
  webDir: 'dist',
  plugins: {
    // Manual mode: the web code decides when to download and switch (never automatic native updates).
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
};

export default config;
