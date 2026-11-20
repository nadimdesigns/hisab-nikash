import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mkdirSync, writeFileSync } from "fs";

// Unique id of this build. On Vercel it is the deployed commit, so every push
// to main produces a new id; locally it falls back to the build timestamp.
const APP_VERSION = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 12) || String(Date.now());

// Emits dist/version.json so a running app can ask "is there a newer build?".
const versionFile = () => ({
  name: "emit-version-json",
  apply: "build" as const,
  closeBundle() {
    mkdirSync("dist", { recursive: true });
    writeFileSync("dist/version.json", JSON.stringify({ version: APP_VERSION }));
  },
});

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
  },
  plugins: [react(), mode === "development" && componentTagger(), versionFile()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
