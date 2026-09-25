import Link from "next/link";
import { Icon, Logo } from "./ui";

export function SiteHeader({ active }: { active?: "explore" | "latest" | "how" }) {
  return (
    <header className="site-header">
      <Logo />
      <nav className="nav" aria-label="Main">
        <Link href="/#map" aria-current={active === "explore" ? "page" : undefined}>Explore</Link>
        <Link href="/#latest" aria-current={active === "latest" ? "page" : undefined}>Latest stamps</Link>
        <Link href="/guidelines" aria-current={active === "how" ? "page" : undefined}>How it works</Link>
      </nav>
      <div className="header-actions">
        <Link href="/add" className="btn btn-dark" aria-label="Add a stamp">
          <Icon name="plus" /> <span>Add a stamp</span>
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Logo size={18} />
      <span>Built by its travellers, one stamp at a time.</span>
      <nav aria-label="Footer">
        <Link href="/guidelines">Guidelines</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </footer>
  );
}

export function DemoBanner() {
  return (
    <p className="banner" role="note">
      Demo mode: the database isn’t connected yet, so you’re seeing sample stamps and nothing you submit is saved.
    </p>
  );
}
