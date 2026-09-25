import type { Stamp } from "./types";

/**
 * Sample stamps shown in DEMO MODE only (before Supabase is connected).
 * These are placeholders for previewing the design — replace them with
 * real stamps once the site is live.
 */
const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

type Seed = [string, string, string, string[], Stamp["verdict"], number, number, string | null, string | null];

const seeds: Seed[] = [
  ["Portugal", "Lisbon", "Mouraria", ["Diverse crowd", "Welcoming", "Food"], "must", 38.7155, -9.1352, "[handle]", "[Sample note] One of the oldest, most mixed neighbourhoods in the city."],
  ["Ghana", "Accra", "Jamestown", ["Heritage", "Welcoming"], "must", 5.536, -0.212, "[handle]", "[Sample note] Describe the place, how you were treated and what to know."],
  ["Morocco", "Marrakech", "The Mellah", ["Halal food", "Heritage"], "worth", 31.6215, -7.9831, null, "[Sample note]"],
  ["Mexico", "Mexico City", "Coyoacán", ["Food", "Family"], "must", 19.3467, -99.1617, "[handle]", "[Sample note]"],
  ["South Korea", "Seoul", "Itaewon", ["Diverse crowd", "Nightlife"], "worth", 37.5345, 126.9946, "[handle]", "[Sample note]"],
  ["Indonesia", "Ubud", "Campuhan Ridge Walk", ["Nature"], "okay", -8.5033, 115.2542, null, "[Sample note]"],
  ["Brazil", "Rio de Janeiro", "Pequena África", ["Heritage", "Black-owned"], "must", -22.8975, -43.1856, "[handle]", "[Sample note]"],
  ["Japan", "Tokyo", "[Place name]", ["Solo-friendly"], "worth", 35.6762, 139.6503, null, null],
  ["South Africa", "Cape Town", "[Place name]", ["Nature", "Food"], "must", -33.9249, 18.4241, null, null],
  ["Kenya", "Nairobi", "[Place name]", ["Welcoming"], "worth", -1.2921, 36.8219, null, null],
  ["Turkey", "Istanbul", "[Place name]", ["Halal food", "Heritage"], "must", 41.0082, 28.9784, null, null],
  ["Jamaica", "Kingston", "[Place name]", ["Food", "Black-owned"], "must", 17.9712, -76.7936, null, null],
  ["United Arab Emirates", "Dubai", "[Place name]", ["Halal food"], "okay", 25.2048, 55.2708, null, null],
  ["Thailand", "Bangkok", "[Place name]", ["Food", "Nightlife"], "worth", 13.7563, 100.5018, null, null],
];

export const DEMO_STAMPS: Stamp[] = seeds.map((s, i) => ({
  id: `demo-${i + 1}`,
  country: s[0],
  city: s[1],
  place_name: s[2],
  tags: s[3],
  verdict: s[4],
  lat: s[5],
  lng: s[6],
  contributor: s[7],
  note: s[8],
  map_link: `https://www.google.com/maps/@${s[5]},${s[6]},15z`,
  status: "approved",
  created_at: d(i + 1),
  reviewed_at: d(i),
}));

export const DEMO_PENDING: Stamp[] = [
  {
    id: "demo-p1", country: "Ghana", city: "Accra", place_name: "[Place name]", tags: ["Heritage", "Welcoming", "Food"],
    verdict: "must", lat: 5.55, lng: -0.2, contributor: "[handle]", note: "[Visitor's note appears here in full.]",
    map_link: "https://maps.app.goo.gl/[submitted-link]", status: "pending", created_at: d(0.1), reviewed_at: null,
  },
  {
    id: "demo-p2", country: "Japan", city: "Tokyo", place_name: "[Place name]", tags: ["Solo-friendly"],
    verdict: "worth", lat: 35.68, lng: 139.76, contributor: null, note: null,
    map_link: "https://maps.app.goo.gl/[submitted-link]", status: "pending", created_at: d(0.3), reviewed_at: null,
  },
];
