// MapLibre loads its web worker from a separate file. Bundlers don't copy it,
// so this copies it into /public on every install (keeps versions in sync).
import { copyFileSync, mkdirSync } from "node:fs";
const out = new URL("../public/maplibre/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(new URL(`../node_modules/maplibre-gl/dist/${f}`, import.meta.url), new URL(f, out));
}
console.log("Copied MapLibre worker to public/maplibre/");
