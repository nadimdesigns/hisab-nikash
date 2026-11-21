import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mkdirSync, writeFileSync } from "fs";

// Unique id of this build. On Vercel it is the deployed commit, so every push
// to main produces a new id (the web and apk builds of one deploy share it);
// locally it falls back to the build timestamp. APP_VERSION can pin it.
const APP_VERSION =
  process.env.APP_VERSION || (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 12) || String(Date.now());

// "web" (live site) or "apk" (bundle shipped in / delivered to the Android app).
const APP_TARGET = process.env.VITE_APP_TARGET === "apk" ? "apk" : "web";

// Emits version.json next to the build output so a running app can ask "is there a newer build?".
const versionFile = () => {
  let outDir = "dist";
  return {
    name: "emit-version-json",
    apply: "build" as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(`${outDir}/version.json`, JSON.stringify({ version: APP_VERSION }));
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(mode === "development" ? "dev" : APP_VERSION),
    // A plain boolean literal, so the bundler can drop whichever target's code is unused.
    __IS_APK__: JSON.stringify(APP_TARGET === "apk"),
  },
  plugins: [react(), mode === "development" && componentTagger(), versionFile()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
