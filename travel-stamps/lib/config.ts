/**
 * Settings come from environment variables (see .env.example).
 * When Supabase isn't connected yet, the site runs in DEMO MODE:
 * it shows sample stamps, and submissions/admin actions are simulated.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

/** Map style: MapTiler if a key is set, otherwise the free OpenFreeMap style. */
export const MAP_STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`
  : "https://tiles.openfreemap.org/styles/positron";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? "";

/** Used to hash IP addresses for rate limiting, so raw IPs are never stored. */
export const IP_HASH_SALT = process.env.IP_HASH_SALT ?? "change-me";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://travelstampsguide.com";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "[CONTACT EMAIL]";
