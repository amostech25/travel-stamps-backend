"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import maplibregl from "@/lib/maplibre";
import { approveStamp, rejectStamp, removeStamp } from "@/app/admin/actions";
import { MAP_STYLE_URL } from "@/lib/config";
import { VERDICTS } from "@/lib/constants";
import { countryCode } from "@/lib/countries";
import type { Stamp as StampT } from "@/lib/types";
import { byline, Icon, Stamp, Tags, timeAgo, VerdictPill } from "./ui";

type Props = { pending: StampT[]; live: StampT[]; rejected: StampT[]; demo: boolean };

export default function AdminDashboard(props: Props) {
  const [pending, setPending] = useState(props.pending);
  const [live, setLive] = useState(props.live);
  const [rejected, setRejected] = useState(props.rejected);
  const [tab, setTab] = useState<"pending" | "rejected">("pending");
  const [openId, setOpenId] = useState<string | null>(props.pending[0]?.id ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const note = (msg: string) => setToast(props.demo ? `${msg} (demo: not saved)` : msg);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, apply: () => void, msg: string) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) return setToast(`Couldn’t save that: ${res.error ?? "unknown error"}`);
      apply();
      note(msg);
    });
  }

  const approve = (s: StampT) =>
    run(() => approveStamp(s.id), () => {
      setPending((p) => p.filter((x) => x.id !== s.id));
      setRejected((r) => r.filter((x) => x.id !== s.id));
      setLive((l) => [{ ...s, status: "approved" }, ...l]);
      setOpenId(pending.find((x) => x.id !== s.id)?.id ?? null);
    }, `${s.place_name} is now on the map`);

  const reject = (s: StampT) =>
    run(() => rejectStamp(s.id), () => {
      setPending((p) => p.filter((x) => x.id !== s.id));
      setRejected((r) => [{ ...s, status: "rejected" }, ...r]);
      setOpenId(pending.find((x) => x.id !== s.id)?.id ?? null);
    }, `${s.place_name} was rejected`);

  const remove = (s: StampT) =>
    run(() => removeStamp(s.id), () => {
      setLive((l) => l.filter((x) => x.id !== s.id));
      setRejected((r) => r.filter((x) => x.id !== s.id));
      setConfirmId(null);
    }, `${s.place_name} was removed`);

  const liveFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? live.filter((s) => `${s.place_name} ${s.city} ${s.country} ${s.contributor ?? ""}`.toLowerCase().includes(q)) : live;
  }, [live, query]);

  const list = tab === "pending" ? pending : rejected;

  return (
    <main className="admin-wrap" aria-busy={busy}>
      <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="admin-title">
          <h1>Review queue</h1>
          <p>Approve stamps to put them on the map. Rejected stamps stay hidden from visitors and are deleted after 30 days.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }} role="group" aria-label="Show">
          <button className="chip" aria-pressed={tab === "pending"} onClick={() => setTab("pending")}>Pending · {pending.length}</button>
          <button className="chip" aria-pressed={tab === "rejected"} onClick={() => setTab("rejected")}>Rejected · {rejected.length}</button>
        </div>
      </div>

      <div className="admin-cols">
        <section className="queue" aria-label={tab === "pending" ? "Pending stamps" : "Rejected stamps"}>
          {list.length === 0 && (
            <div className="review"><p>{tab === "pending" ? "All caught up. New submissions will appear here." : "No rejected stamps."}</p></div>
          )}
          {list.map((s) =>
            s.id === openId || tab === "rejected" ? (
              <ReviewCard key={s.id} s={s} open={tab === "pending"} busy={busy}
                onApprove={() => approve(s)} onReject={tab === "pending" ? () => reject(s) : undefined}
                onDelete={tab === "rejected" ? () => remove(s) : undefined} />
            ) : (
              <article key={s.id} className="review" style={{ padding: "20px 24px" }}>
                <div className="review-summary">
                  <button onClick={() => setOpenId(s.id)} style={{ border: 0, background: "none", padding: 0, textAlign: "left", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }} aria-label={`Open ${s.place_name}`}>
                    <span style={{ fontSize: 14, color: "var(--muted)" }}>{s.country} · {s.city} · {byline(s.contributor) ?? "Anonymous"} · {timeAgo(s.created_at)}</span>
                    <span style={{ fontSize: 22 }}>{s.place_name}</span>
                  </button>
                  <Tags tags={s.tags} />
                  <VerdictPill verdict={s.verdict} small />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-reject btn-sm" disabled={busy} onClick={() => reject(s)}>Reject</button>
                    <button className="btn btn-green btn-sm" disabled={busy} onClick={() => approve(s)}>Approve</button>
                  </div>
                </div>
              </article>
            ),
          )}
        </section>

        <aside className="live" aria-labelledby="live-title">
          <div className="row">
            <h2 id="live-title">Live on the map</h2>
            <span className="count">{live.length}</span>
          </div>
          <label className="live-search">
            <Icon name="search" size={18} />
            <span className="sr-only">Search live stamps</span>
            <input placeholder="Search live stamps" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="live-list">
            {liveFiltered.length === 0 && <p style={{ margin: 8, color: "var(--muted)", fontSize: 15 }}>{live.length ? "No matches." : "Nothing on the map yet."}</p>}
            {liveFiltered.map((s) => {
              const v = VERDICTS[s.verdict];
              return confirmId === s.id ? (
                <div key={s.id} className="confirm" role="alertdialog" aria-label={`Remove ${s.place_name}?`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Stamp w={36} h={42} fill="#FFFFFF" edge="#FBEFEC" code={countryCode(s.country)} ink={v.color} fontSize={12} />
                    <div className="who" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ fontSize: 16, fontWeight: 500 }}>Remove {s.place_name} from the map?</b>
                      <span style={{ fontSize: 14, color: "var(--ink-2)" }}>Visitors will no longer see it. This can’t be undone.</span>
                    </div>
                  </div>
                  <div className="acts">
                    <button className="btn btn-light btn-sm" onClick={() => setConfirmId(null)} autoFocus>Keep</button>
                    <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => remove(s)}><Icon name="trash" size={16} stroke={2} /> Remove</button>
                  </div>
                </div>
              ) : (
                <div key={s.id} className="live-row">
                  <Stamp w={36} h={42} fill="#F5F2EC" edge="#FFFFFF" code={countryCode(s.country)} ink={v.color} fontSize={12} />
                  <div className="who">
                    <b>{s.place_name}</b>
                    <span>{s.city}, {s.country}{s.contributor ? ` · ${byline(s.contributor)}` : ""}</span>
                  </div>
                  <span className="dot" style={{ width: 10, height: 10, background: v.color }} title={v.label} />
                  <a href={s.map_link} target="_blank" rel="noopener noreferrer" className="icon-btn sm outline" aria-label={`Open ${s.place_name} in Maps`}><Icon name="link" size={18} /></a>
                  <button className="icon-btn sm outline" aria-label={`Remove ${s.place_name} from map`} onClick={() => setConfirmId(s.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function ReviewCard({ s, open, busy, onApprove, onReject, onDelete }: {
  s: StampT; open: boolean; busy: boolean; onApprove: () => void; onReject?: () => void; onDelete?: () => void;
}) {
  return (
    <article className={open ? "review open" : "review"}>
      <div className="body">
        <div className="details">
          <div className="row">
            <span style={{ fontSize: 14, color: "var(--muted)" }}>{s.country} · {s.city}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
              <Icon name="clock" size={14} /> Submitted {timeAgo(s.created_at).toLowerCase()}
            </span>
          </div>
          <h3>{s.place_name}</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Tags tags={s.tags} />
            <VerdictPill verdict={s.verdict} small />
          </div>
          <span style={{ fontSize: 14, color: "var(--ink-2)" }}>From <b style={{ fontWeight: 500 }}>{byline(s.contributor) ?? "Anonymous"}</b></span>
          {s.note ? <p>{s.note}</p> : <p style={{ color: "var(--muted)" }}>No note.</p>}
          <span className="link">
            <Icon name="link" size={16} />
            <a href={s.map_link} target="_blank" rel="noopener noreferrer">{s.map_link}</a>
          </span>
        </div>
        <MiniMap lat={s.lat} lng={s.lng} link={s.map_link} />
      </div>
      <div className="actions">
        <span>{onDelete ? "Rejected stamps are hidden. You can still approve this one." : "Approving puts this stamp on the public map."}</span>
        <div style={{ display: "flex", gap: 10 }}>
          {onReject && <button className="btn btn-reject" disabled={busy} onClick={onReject}><Icon name="x" size={18} stroke={2} /> Reject</button>}
          {onDelete && <button className="btn btn-reject" disabled={busy} onClick={onDelete}><Icon name="trash" size={18} stroke={2} /> Delete now</button>}
          <button className="btn btn-green" disabled={busy} onClick={onApprove}><Icon name="check" size={18} stroke={2} /> Approve</button>
        </div>
      </div>
    </article>
  );
}

function MiniMap({ lat, lng, link }: { lat: number; lng: number; link: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new maplibregl.Map({ container: ref.current, style: MAP_STYLE_URL, center: [lng, lat], zoom: 13, interactive: false, attributionControl: false });
    const el = document.createElement("div");
    el.className = "pin selected";
    el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
    new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
    return () => m.remove();
  }, [lat, lng]);
  return (
    <div className="minimap">
      <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-label={`Map preview at ${lat.toFixed(4)}, ${lng.toFixed(4)}`} role="img" />
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", left: 12, bottom: 12, padding: "8px 14px", borderRadius: 999, background: "#fff", fontSize: 14, fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
        Check the pin <Icon name="arrow" size={14} />
      </a>
    </div>
  );
}
