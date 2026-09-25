import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { Icon, Logo } from "@/components/ui";
import { getAdminState } from "@/lib/data";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const state = await getAdminState();
  if (state.kind === "signed-out") redirect("/admin/login");

  return (
    <>
      <header className="site-header" style={{ height: 96 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo />
          <span className="admin-badge">Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 500, textDecoration: "none", padding: "0 12px" }}>
            <Icon name="eye" size={18} /> View site
          </Link>
          <form action={signOut}>
            <button className="btn btn-light btn-sm" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      {state.kind === "not-admin" ? (
        <main className="login">
          <h1>Not an admin account</h1>
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
            You’re signed in as {state.email ?? "this user"}, but it isn’t set up as the Travel Stamps admin.
          </p>
        </main>
      ) : (
        <>
          {state.kind === "demo" && (
            <p className="banner" role="note">Demo mode: the database isn’t connected, so these are sample stamps and changes aren’t saved.</p>
          )}
          <AdminDashboard pending={state.pending} live={state.live} rejected={state.rejected} demo={state.kind === "demo"} />
        </>
      )}
    </>
  );
}
