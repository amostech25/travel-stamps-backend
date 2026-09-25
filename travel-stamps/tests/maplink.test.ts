import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCoordinates,
  parseCoordinatesFromHtml,
  resolveMapLink,
  isAllowedMapHost,
} from "../lib/maplink.ts";

const close = (a: { lat: number; lng: number } | null, lat: number, lng: number) => {
  assert.ok(a, "expected coordinates");
  assert.ok(Math.abs(a!.lat - lat) < 1e-6 && Math.abs(a!.lng - lng) < 1e-6, JSON.stringify(a));
};

test("Google place link prefers the place over the view centre", () => {
  close(
    parseCoordinates(
      "https://www.google.com/maps/place/Jamestown/@5.5352,-0.2150,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d5.5360!4d-0.2120",
    ),
    5.536,
    -0.212,
  );
});

test("Google view centre", () => {
  close(parseCoordinates("https://www.google.com/maps/@38.7139,-9.1334,17z"), 38.7139, -9.1334);
});

test("Google q= and search path", () => {
  close(parseCoordinates("https://maps.google.com/?q=51.5074,-0.1278"), 51.5074, -0.1278);
  close(parseCoordinates("https://www.google.com/maps/search/35.6762,+139.6503"), 35.6762, 139.6503);
  close(parseCoordinates("https://www.google.com/maps/search/?api=1&query=-22.9068,-43.1729"), -22.9068, -43.1729);
});

test("Apple Maps links", () => {
  close(parseCoordinates("https://maps.apple.com/?ll=31.6295,-7.9811&q=Marrakech"), 31.6295, -7.9811);
  close(
    parseCoordinates("https://maps.apple.com/place?coordinate=37.5665,126.9780&name=Seoul"),
    37.5665,
    126.978,
  );
});

test("consent wrapper is unwrapped", () => {
  const inner = encodeURIComponent("https://www.google.com/maps/@19.4326,-99.1332,14z");
  close(parseCoordinates(`https://consent.google.com/ml?continue=${inner}`), 19.4326, -99.1332);
});

test("no coordinates, bad input, out of range", () => {
  assert.equal(parseCoordinates("https://maps.google.com/?q=Coffee+shop"), null);
  assert.equal(parseCoordinates("not a link"), null);
  assert.equal(parseCoordinates("https://maps.google.com/?q=120,500"), null);
});

test("HTML fallback", () => {
  close(parseCoordinatesFromHtml('<meta content="https://maps.google.com/maps/api/staticmap?center=5.536%2C-0.212&zoom=15">'), 5.536, -0.212);
});

test("only Google and Apple hosts are allowed", () => {
  assert.ok(isAllowedMapHost("maps.app.goo.gl"));
  assert.ok(isAllowedMapHost("www.google.co.uk"));
  assert.ok(isAllowedMapHost("maps.apple.com"));
  assert.ok(!isAllowedMapHost("evil.com"));
  assert.ok(!isAllowedMapHost("google.com.evil.io"));
});

test("short links are followed, and redirects off Google are refused", async () => {
  const fake = (map: Record<string, string>) =>
    (async (u: string) =>
      new Response(null, { status: 302, headers: { location: map[u] ?? "" } })) as unknown as typeof fetch;

  const ok = await resolveMapLink(
    "https://maps.app.goo.gl/abc",
    fake({ "https://maps.app.goo.gl/abc": "https://www.google.com/maps/place/X/@1,1,3z/data=!3d6.5!4d3.4" }),
  );
  assert.ok(ok.ok);
  if (ok.ok) close(ok.coords, 6.5, 3.4);

  const bad = await resolveMapLink("https://maps.app.goo.gl/xyz", fake({ "https://maps.app.goo.gl/xyz": "https://evil.com/" }));
  assert.deepEqual(bad, { ok: false, reason: "host" });

  const host = await resolveMapLink("https://example.com/maps");
  assert.deepEqual(host, { ok: false, reason: "host" });
});
