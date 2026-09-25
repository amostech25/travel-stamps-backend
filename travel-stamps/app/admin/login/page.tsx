"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { DEMO_MODE } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (DEMO_MODE) return router.push("/admin");
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("That email and password didn’t match. Try again.");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <>
      <header className="site-header"><Logo /></header>
      <main>
        <form className="login" onSubmit={submit}>
          <h1>Admin sign in</h1>
          {DEMO_MODE && <p className="banner" style={{ margin: 0 }}>Demo mode: sign-in is skipped until the database is connected.</p>}
          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" type="email" autoComplete="username" required={!DEMO_MODE} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input className="input" type="password" autoComplete="current-password" required={!DEMO_MODE} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-dark" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <Link href="/" style={{ fontSize: 15, textAlign: "center" }}>Back to the site</Link>
        </form>
      </main>
    </>
  );
}
