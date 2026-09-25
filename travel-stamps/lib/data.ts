import "server-only";
import { DEMO_MODE } from "./config";
import { DEMO_PENDING, DEMO_STAMPS } from "./demo";
import { supabaseServer } from "./supabase/server";
import type { PublicStamp, Stamp } from "./types";

const PUBLIC_COLUMNS = "id,country,city,place_name,tags,verdict,note,map_link,lat,lng,contributor,created_at";

/** Every approved stamp, newest first. */
export async function getApprovedStamps(): Promise<PublicStamp[]> {
  if (DEMO_MODE) return DEMO_STAMPS;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("stamps")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("Failed to load stamps", error.message);
    return [];
  }
  return (data ?? []) as PublicStamp[];
}

export type AdminState =
  | { kind: "demo"; pending: Stamp[]; live: Stamp[]; rejected: Stamp[] }
  | { kind: "signed-out" }
  | { kind: "not-admin"; email: string | undefined }
  | { kind: "admin"; email: string | undefined; pending: Stamp[]; live: Stamp[]; rejected: Stamp[] };

export async function getAdminState(): Promise<AdminState> {
  if (DEMO_MODE) return { kind: "demo", pending: DEMO_PENDING, live: DEMO_STAMPS, rejected: [] };

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { kind: "signed-out" };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { kind: "not-admin", email: auth.user.email };

  const { data, error } = await supabase.from("stamps").select("*").order("created_at", { ascending: false }).limit(5000);
  if (error) console.error("Failed to load stamps for admin", error.message);
  const all = (data ?? []) as Stamp[];
  return {
    kind: "admin",
    email: auth.user.email,
    pending: all.filter((s) => s.status === "pending").reverse(), // oldest first
    live: all.filter((s) => s.status === "approved"),
    rejected: all.filter((s) => s.status === "rejected"),
  };
}
