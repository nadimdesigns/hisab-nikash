/// <reference types="vite/client" />

/** Id of the running build, injected by vite (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** "apk" for the Android bundle, unset/"web" for the live site (see src/lib/appTarget.ts). */
  readonly VITE_APP_TARGET?: "apk" | "web";
}

/** true in the Android (apk) build, false on the web; injected by vite `define`. */
declare const __IS_APK__: boolean;
