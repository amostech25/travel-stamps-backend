import type { Metadata } from "next";
import StampForm from "@/components/StampForm";

export const metadata: Metadata = { title: "Add a stamp" };

export default function AddPage() {
  return (
    <main className="sheet-page">
      <div className="sheet-backdrop" aria-hidden="true" />
      <div style={{ position: "relative", padding: "0.1px 0" }}>
        <StampForm />
      </div>
    </main>
  );
}
