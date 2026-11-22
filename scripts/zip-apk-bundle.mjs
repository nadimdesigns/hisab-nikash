// Packs the apk build (dist-apk) into the over-the-air bundle the Android app downloads and
// writes the manifest it polls. Both go into dist/apk so Vercel serves them with the site:
//   dist/apk/bundle-<version>.zip   index.html at the zip root, as @capgo/capacitor-updater expects
//   dist/apk/version.json           { version, url, minNative, checksum }
// `checksum` is the SHA-256 (hex) of the zip: @capgo/capacitor-updater (v8) refuses to download a
// bundle without it ("Checksum required"), and verifies the file against it.
// Run after `vite build` (web) and `VITE_APP_TARGET=apk vite build --outDir dist-apk`.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zipSync } from "fflate";

const SRC = "dist-apk";
const OUT = "dist/apk";
const LIVE_ORIGIN = process.env.LIVE_ORIGIN || "https://hisab-nikash.userheaven.app";
// Oldest installed APK (native versionName) that can run this bundle. Raise it when a change
// needs a new native plugin / permission, so older APKs are told to reinstall instead.
const MIN_NATIVE = process.env.APK_MIN_NATIVE || "1.0.0";

const { version } = JSON.parse(readFileSync(join(SRC, "version.json"), "utf8"));
if (!version) throw new Error(`${SRC}/version.json has no version`);

const files = {};
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files[relative(SRC, full).split(sep).join("/")] = new Uint8Array(readFileSync(full));
  }
};
walk(SRC);
if (!files["index.html"]) throw new Error(`${SRC}/index.html is missing`);

mkdirSync(OUT, { recursive: true });
const zipName = `bundle-${version}.zip`;
const zip = zipSync(files, { level: 9 });
writeFileSync(join(OUT, zipName), zip);
const checksum = createHash("sha256").update(zip).digest("hex");
writeFileSync(
  join(OUT, "version.json"),
  JSON.stringify({ version, url: `${LIVE_ORIGIN}/apk/${zipName}`, minNative: MIN_NATIVE, checksum }),
);
console.log(`apk bundle ${zipName}: ${Object.keys(files).length} files, ${(zip.length / 1024).toFixed(0)} kB, sha256 ${checksum.slice(0, 12)}…`);
