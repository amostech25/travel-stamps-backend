import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE, IP_HASH_SALT, TURNSTILE_SECRET_KEY } from "@/lib/config";
import { LIMITS } from "@/lib/constants";
import { resolveMapLink } from "@/lib/maplink";
import { supabaseService } from "@/lib/supabase/server";
import { validateSubmission } from "@/lib/validate";

export const runtime = "nodejs";

const LINK_ERRORS = {
  invalid: "That doesn’t look like a link. In Google Maps or Apple Maps, open the place, tap Share and copy the link.",
  host: "Please use a Google Maps or Apple Maps link.",
  no_coordinates:
    "We couldn’t find a location in that link. Open the exact place in Google Maps or Apple Maps, tap Share, and paste that link.",
  network: "We couldn’t check that link just now. Please try again in a moment.",
} as const;

function fail(status: number, message: string, errors?: Record<string, string>) {
  return NextResponse.json({ ok: false, message, errors }, { status });
}

async function verifyTurnstile(token: unknown, ip: string | null) {
  if (!TURNSTILE_SECRET_KEY) return true; // not configured (development)
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Something went wrong sending your stamp. Please try again.");
  }

  // Honeypot: a hidden field real people never fill in.
  if (typeof raw.website === "string" && raw.website.trim()) return NextResponse.json({ ok: true });

  const { data, errors } = validateSubmission(raw);
  if (!data) return fail(422, "Please check the highlighted fields.", errors as Record<string, string>);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip");

  if (!(await verifyTurnstile(raw.turnstileToken, ip))) {
    return fail(400, "Please complete the check that you’re not a robot, then submit again.");
  }

  const link = await resolveMapLink(data.map_link);
  if (!link.ok) return fail(422, "Please check the map link.", { map_link: LINK_ERRORS[link.reason] });

  if (DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true, coords: link.coords });
  }

  const db = supabaseService();
  const ipHash = createHash("sha256").update(`${IP_HASH_SALT}:${ip ?? "unknown"}`).digest("hex");
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from("submission_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= LIMITS.submissionsPerDay) {
    return fail(429, "You’ve added lots of stamps today, thank you! Please come back tomorrow to add more.");
  }

  const { error } = await db.from("stamps").insert({
    ...data,
    lat: link.coords.lat,
    lng: link.coords.lng,
    status: "pending",
  });
  if (error) {
    console.error("Insert failed", error.message);
    return fail(500, "We couldn’t save your stamp. Please try again.");
  }

  await db.from("submission_log").insert({ ip_hash: ipHash });
  await db.rpc("purge_old_data");

  return NextResponse.json({ ok: true });
}
