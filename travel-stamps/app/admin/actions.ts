"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

async function asAdmin() {
  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? supabase : null;
}

function done(): Result {
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

async function setStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<Result> {
  if (DEMO_MODE) return { ok: true };
  const db = await asAdmin();
  if (!db) return { ok: false, error: "You’re not signed in as the admin." };
  const { error } = await db
    .from("stamps")
    .update({ status, reviewed_at: status === "pending" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function approveStamp(id: string) {
  return setStatus(id, "approved");
}

export async function rejectStamp(id: string) {
  return setStatus(id, "rejected");
}

export async function removeStamp(id: string): Promise<Result> {
  if (DEMO_MODE) return { ok: true };
  const db = await asAdmin();
  if (!db) return { ok: false, error: "You’re not signed in as the admin." };
  const { error } = await db.from("stamps").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function signOut() {
  if (!DEMO_MODE) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
