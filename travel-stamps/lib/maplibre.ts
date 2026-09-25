"use client";
import * as maplibregl from "maplibre-gl";

// The worker file is copied to /public/maplibre by scripts/copy-maplibre-worker.mjs.
if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export default maplibregl;
