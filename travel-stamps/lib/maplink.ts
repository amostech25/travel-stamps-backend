/**
 * Turns a Google Maps or Apple Maps link into coordinates.
 * The pin for every stamp is placed from the submitted link alone.
 * Self-contained (no imports) so it can be unit tested directly.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

const ALLOWED_HOST = /(^|\.)(google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})|goo\.gl|g\.co|apple\.com|apple\.co)$/i;

export function isAllowedMapHost(host: string): boolean {
  return ALLOWED_HOST.test(host);
}

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function pair(value: string | null): LatLng | null {
  if (!value) return null;
  const m = value.trim().match(new RegExp(`^${NUM}[\\s+]*,[\\s+]*${NUM}`));
  return m ? valid(parseFloat(m[1]), parseFloat(m[2])) : null;
}

/** Reads coordinates from a map URL without any network calls. */
export function parseCoordinates(input: string): LatLng | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  // Google's cookie-consent page wraps the real link in ?continue=
  const cont = url.searchParams.get("continue");
  if (cont && /consent\./i.test(url.hostname)) return parseCoordinates(cont);

  const full = decodeURIComponent(url.href);

  // 1. The place itself (Google "data=" blob): !3d<lat>!4d<lng>
  const place = [...full.matchAll(new RegExp(`!3d${NUM}!4d${NUM}`, "g"))].pop();
  if (place) {
    const p = valid(parseFloat(place[1]), parseFloat(place[2]));
    if (p) return p;
  }

  // 2. Explicit coordinate parameters (Google + Apple)
  for (const key of ["coordinate", "ll", "q", "query", "destination", "daddr", "sll", "center"]) {
    const p = pair(url.searchParams.get(key));
    if (p) return p;
  }

  // 3. Coordinates in the path, e.g. /maps/search/51.5,-0.12 or /place/51.5,-0.12
  const path = full.match(new RegExp(`/(?:search|place|dir)/${NUM},[\\s+]*${NUM}`));
  if (path) {
    const p = valid(parseFloat(path[1]), parseFloat(path[2]));
    if (p) return p;
  }

  // 4. The map view centre: /@<lat>,<lng>,<zoom>z
  const at = full.match(new RegExp(`@${NUM},${NUM}`));
  if (at) {
    const p = valid(parseFloat(at[1]), parseFloat(at[2]));
    if (p) return p;
  }

  return null;
}

/** Looks for coordinates inside a Google Maps page (fallback for links that carry none). */
export function parseCoordinatesFromHtml(html: string): LatLng | null {
  const center = html.match(new RegExp(`center=${NUM}(?:%2C|,)${NUM}`));
  if (center) {
    const p = valid(parseFloat(center[1]), parseFloat(center[2]));
    if (p) return p;
  }
  const arr = html.match(new RegExp(`\\[null,null,${NUM},${NUM}\\]`));
  if (arr) return valid(parseFloat(arr[1]), parseFloat(arr[2]));
  return null;
}

export type ResolveResult =
  | { ok: true; coords: LatLng; finalUrl: string }
  | { ok: false; reason: "invalid" | "host" | "no_coordinates" | "network" };

/**
 * Follows short links (maps.app.goo.gl, goo.gl/maps, apple.co…) to the full URL,
 * only ever requesting Google or Apple hosts, then reads the coordinates.
 */
export async function resolveMapLink(
  link: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolveResult> {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid" };
  if (!isAllowedMapHost(url.hostname)) return { ok: false, reason: "host" };

  const direct = parseCoordinates(url.href);
  if (direct) return { ok: true, coords: direct, finalUrl: url.href };

  let current = url;
  try {
    for (let hop = 0; hop < 6; hop++) {
      const res = await fetchImpl(current.href, {
        redirect: "manual",
        headers: { "user-agent": "Mozilla/5.0 (TravelStamps link check)", "accept-language": "en" },
        signal: AbortSignal.timeout(6000),
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        const next = new URL(location, current);
        if (!isAllowedMapHost(next.hostname)) return { ok: false, reason: "host" };
        const found = parseCoordinates(next.href);
        if (found) return { ok: true, coords: found, finalUrl: next.href };
        current = next;
        continue;
      }
      if (res.ok) {
        const html = (await res.text()).slice(0, 2_000_000);
        const found = parseCoordinatesFromHtml(html);
        if (found) return { ok: true, coords: found, finalUrl: current.href };
      }
      break;
    }
  } catch {
    return { ok: false, reason: "network" };
  }
  return { ok: false, reason: "no_coordinates" };
}
