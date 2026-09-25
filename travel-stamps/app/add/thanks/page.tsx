import type { Metadata } from "next";
import Link from "next/link";
import { Logo, Stamp } from "@/components/ui";

export const metadata: Metadata = { title: "Stamp sent for review" };

export default async function Thanks({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const place = (q.place ?? "your place").slice(0, 120);
  const city = (q.city ?? "").slice(0, 40);
  const code = (q.code ?? "").slice(0, 2).toUpperCase();
  return (
    <main className="thanks">
      <Logo />
      <div style={{ position: "relative", width: 200, height: 236 }} aria-hidden="true">
        <div style={{ position: "absolute", left: 0, top: 0, transform: "rotate(-6deg)" }}>
          <Stamp w={168} h={200} fill="#FFFFFF" edge="#EEEAE3" code={code} ink="#1F6B57" fontSize={56} />
        </div>
        <div className="postmark">
          IN REVIEW
          <small>{city.toUpperCase()}</small>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <h1>Stamp sent<br />for review</h1>
        <p>Thanks for adding {place}. Once it’s approved it’ll appear on the map for everyone.</p>
        {q.demo && <p className="banner" style={{ margin: 0 }}>Demo mode: this stamp wasn’t saved.</p>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn-dark">Back to the map</Link>
        <Link href="/add" className="btn btn-light">Add another stamp</Link>
      </div>
    </main>
  );
}
