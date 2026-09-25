"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import maplibregl from "@/lib/maplibre";
import Supercluster from "supercluster";
import { MAP_STYLE_URL } from "@/lib/config";
import { TAGS, VERDICTS, VERDICT_KEYS, type Verdict } from "@/lib/constants";
import { countryCode } from "@/lib/countries";
import type { PublicStamp } from "@/lib/types";
import { byline, Icon, monthYear, Tags, VerdictPill, VerdictStamp } from "./ui";

type Props = { stamps: PublicStamp[] };

export default function Explorer({ stamps }: Props) {
  const [tag, setTag] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Set<Verdict>>(new Set(VERDICT_KEYS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Verdict | "all">("all");
  const mapRef = useRef<MapHandle | null>(null);

  const filtered = useMemo(
    () => stamps.filter((s) => verdicts.has(s.verdict) && (!tag || s.tags.includes(tag))),
    [stamps, tag, verdicts],
  );
  const selected = stamps.find((s) => s.id === selectedId) ?? null;

  const focusStamp = useCallback((s: PublicStamp, scroll = false) => {
    setSelectedId(s.id);
    mapRef.current?.flyTo(s);
    if (scroll) document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const latest = stamps.filter((s) => tab === "all" || s.verdict === tab).slice(0, 6);

  return (
    <>
      <MapView
        ref={mapRef}
        stamps={filtered}
        all={stamps}
        selected={selected}
        onSelect={(s) => (s ? focusStamp(s) : setSelectedId(null))}
        tag={tag}
        setTag={setTag}
        verdicts={verdicts}
        toggleVerdict={(v) =>
          setVerdicts((prev) => {
            const next = new Set(prev);
            if (next.has(v) && next.size > 1) next.delete(v);
            else next.add(v);
            return next;
          })
        }
      />

      <section className="latest" id="latest" aria-labelledby="latest-title">
        <div className="latest-head">
          <div>
            <h2 id="latest-title">Latest stamps</h2>
            <div className="tabs" role="group" aria-label="Filter latest stamps by verdict">
              <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>All stamps</button>
              {VERDICT_KEYS.map((v) => (
                <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)}>{VERDICTS[v].label}</button>
              ))}
            </div>
          </div>
          <a href="#map" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 500, textDecoration: "none" }}>
            See all on the map <Icon name="arrow" size={18} />
          </a>
        </div>

        <div className="grid">
          {latest.slice(0, 3).map((s) => <StampCard key={s.id} s={s} onOpen={() => focusStamp(s, true)} />)}
          <AddCta />
          {latest.slice(3, 6).map((s) => <StampCard key={s.id} s={s} onOpen={() => focusStamp(s, true)} />)}
          {latest.length === 0 && (
            <div className="empty">
              {stamps.length === 0 ? "No stamps yet. Be the first to add a place." : "No stamps with this verdict yet."}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function StampCard({ s, onOpen }: { s: PublicStamp; onOpen: () => void }) {
  const by = byline(s.contributor);
  return (
    <button className="card" onClick={onOpen} aria-label={`${s.place_name}, ${s.city}. Show on map`}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="lines">
          <b>{s.tags.slice(0, 2).join(" · ")}{s.tags.length > 2 ? ` +${s.tags.length - 2}` : ""}</b>
          <span>{s.city}, {s.country}</span>
          {by && <span>by {by}</span>}
        </div>
        <VerdictPill verdict={s.verdict} />
      </div>
      <div className="row-end">
        <h3>{s.place_name}</h3>
        <VerdictStamp verdict={s.verdict} code={countryCode(s.country)} />
      </div>
    </button>
  );
}

function AddCta() {
  const badges: [Parameters<typeof Icon>[0]["name"], number, number][] = [
    ["utensils", 16, 140], ["moon", 72, 70], ["scissors", 142, 40], ["users", 200, 96], ["landmark", 0, 222], ["heart", 196, 200],
  ];
  return (
    <Link href="/add" className="cta">
      <span className="ring" style={{ left: -80, top: -120, width: 360, height: 360 }} />
      <span className="ring" style={{ left: -20, top: -60, width: 220, height: 220 }} />
      <span className="row" style={{ position: "relative", alignItems: "flex-start" }}>
        <span>
          <strong>Been somewhere worth a stamp?</strong>
          <p>Add it to the map. Every stamp is reviewed before it goes live.</p>
        </span>
        <span className="arrow"><Icon name="arrow" size={24} /></span>
      </span>
      <span className="badges" aria-hidden="true">
        {badges.map(([n, x, y]) => (
          <span key={n} className="badge" style={{ left: x, top: y }}><Icon name={n} size={24} /></span>
        ))}
        <span className="badge plus" style={{ left: 96, top: 176 }}><Icon name="plus" size={22} /></span>
      </span>
    </Link>
  );
}

/* ───────────────────────────── Map ───────────────────────────── */

type MapHandle = { flyTo: (s: PublicStamp) => void };

type MapProps = {
  ref: React.RefObject<MapHandle | null>;
  stamps: PublicStamp[];
  all: PublicStamp[];
  selected: PublicStamp | null;
  onSelect: (s: PublicStamp | null) => void;
  tag: string | null;
  setTag: (t: string | null) => void;
  verdicts: Set<Verdict>;
  toggleVerdict: (v: Verdict) => void;
};

function restyle(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#E7E1D6");
      else if (layer.type === "fill" && /water|ocean|sea/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#F7F5F0");
      else if (layer.type === "fill" && /landcover|park|wood|grass/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-opacity", 0.35);
    } catch {
      /* layer doesn't support it — ignore */
    }
  }
}

function MapView({ ref, stamps, all, selected, onSelect, tag, setTag, verdicts, toggleVerdict }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const cardMarker = useRef<maplibregl.Marker | null>(null);
  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(0); // bumps when the map moves, to recompute clusters
  const [docked, setDocked] = useState(false);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);

  // Keep latest callbacks without re-creating markers each render.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setDocked(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE_URL,
      center: [15, 22],
      zoom: window.innerWidth < 640 ? 0.8 : 1.6,
      minZoom: 0.6,
      maxZoom: 17,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.on("load", () => {
      restyle(m);
      setReady(true);
    });
    m.on("error", (e) => {
      if (!m.loaded()) console.warn("Map error", (e as { error?: { message?: string } }).error?.message);
    });
    m.on("moveend", () => setView((v) => v + 1));
    const timer = window.setTimeout(() => !m.loaded() && setFailed(true), 12000);
    map.current = m;
    return () => {
      window.clearTimeout(timer);
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    ref.current = {
      flyTo: (s) => {
        const m = map.current;
        if (!m) return;
        const small = window.innerWidth < 640;
        m.flyTo({ center: [s.lng, s.lat], zoom: Math.max(m.getZoom(), 11), offset: small ? [0, -80] : [0, 140], speed: 1.4 });
      },
    };
  }, [ref]);

  // Clustering
  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string }>({ radius: 44, maxZoom: 14 });
    sc.load(stamps.map((s) => ({ type: "Feature", properties: { id: s.id }, geometry: { type: "Point", coordinates: [s.lng, s.lat] } })));
    return sc;
  }, [stamps]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    const b = m.getBounds();
    const clusters = index.getClusters([-180, Math.max(-85, b.getSouth()), 180, Math.min(85, b.getNorth())], Math.round(m.getZoom()));
    const byId = new Map(stamps.map((s) => [s.id, s]));

    for (const c of clusters) {
      const [lng, lat] = c.geometry.coordinates;
      const el = document.createElement("button");
      if ("cluster" in c.properties && c.properties.cluster) {
        const count = c.properties.point_count as number;
        const cid = c.properties.cluster_id as number;
        el.className = "cluster";
        el.textContent = String(count);
        el.setAttribute("aria-label", `${count} stamps here. Zoom in`);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          m.easeTo({ center: [lng, lat], zoom: Math.min(index.getClusterExpansionZoom(cid), 16) });
        });
      } else {
        const s = byId.get((c.properties as { id: string }).id);
        if (!s) continue;
        const isSel = selected?.id === s.id;
        el.className = isSel ? "pin selected" : "pin";
        el.style.background = VERDICTS[s.verdict].color;
        el.setAttribute("aria-label", `${s.place_name}, ${s.city}. ${VERDICTS[s.verdict].label}`);
        if (isSel) el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current(s);
        });
      }
      const mk = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
      if (el.classList.contains("selected")) el.parentElement?.style.setProperty("z-index", "2");
      markers.current.push(mk);
    }
  }, [index, stamps, ready, view, selected]);

  // The floating place card is anchored to the selected pin (desktop).
  useEffect(() => {
    const m = map.current;
    cardMarker.current?.remove();
    cardMarker.current = null;
    setCardEl(null);
    if (!m || !ready || !selected || docked) return;
    const el = document.createElement("div");
    el.style.zIndex = "3";
    el.addEventListener("click", (e) => e.stopPropagation());
    el.addEventListener("wheel", (e) => e.stopPropagation());
    cardMarker.current = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -30] }).setLngLat([selected.lng, selected.lat]).addTo(m);
    setCardEl(el);
  }, [selected, ready, docked]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const close = () => onSelectRef.current(null);
    m.on("click", close);
    return () => {
      m.off("click", close);
    };
  }, [ready]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return all
      .filter((s) => `${s.place_name} ${s.city} ${s.country}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, all]);

  const card = selected && <PlaceCard s={selected} docked={docked} onClose={() => onSelect(null)} />;

  return (
    <section className="map-section" id="map" aria-label="Map of stamps">
      <div ref={container} className="map-canvas" />

      <div className="map-top">
        <div className="map-search" role="search">
          <Icon name="search" size={18} />
          <label htmlFor="map-q" className="sr-only">Search a place, city or country</label>
          <input
            id="map-q"
            placeholder="Search a country or city"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                onSelect(results[0]);
                setQuery("");
              }
              if (e.key === "Escape") setQuery("");
            }}
          />
          {query && (
            <button className="icon-btn sm soft" style={{ width: 40, height: 40 }} aria-label="Clear search" onClick={() => setQuery("")}>
              <Icon name="x" size={16} />
            </button>
          )}
          {query.trim().length >= 2 && (
            <ul className="search-results">
              {results.length === 0 && <li style={{ padding: "10px 12px", color: "var(--muted)", fontSize: 14 }}>No stamps match “{query}” yet.</li>}
              {results.map((s) => (
                <li key={s.id}>
                  <button onClick={() => { onSelect(s); setQuery(""); }}>
                    {s.place_name}
                    <small>{s.city}, {s.country}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="map-chips" role="group" aria-label="Filter by tag">
          <button className="chip" aria-pressed={tag === null} onClick={() => setTag(null)}>All</button>
          {TAGS.map((t) => (
            <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="map-controls">
        <button className="icon-btn" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}><Icon name="plus" /></button>
        <button className="icon-btn" aria-label="Zoom out" onClick={() => map.current?.zoomOut()}><Icon name="minus" /></button>
        <button
          className="icon-btn"
          aria-label="Show stamps near me"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => map.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 9 }),
              () => undefined,
              { timeout: 8000 },
            )
          }
        >
          <Icon name="locate" />
        </button>
      </div>

      <div className="map-legend" role="group" aria-label="Show verdicts">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Verdict</span>
        {VERDICT_KEYS.map((v) => (
          <button key={v} aria-pressed={verdicts.has(v)} onClick={() => toggleVerdict(v)}>
            <span className="dot" style={{ background: VERDICTS[v].color }} />
            {VERDICTS[v].label}
          </button>
        ))}
      </div>

      <div className="map-note"><Icon name="check" size={16} stroke={2} color="var(--green)" />Every stamp is reviewed before it appears here</div>

      {ready && stamps.length === 0 && (
        <div className="map-empty">{all.length === 0 ? "No stamps on the map yet." : "No stamps match these filters."}</div>
      )}
      {failed && !ready && <div className="map-empty">The map couldn’t load. Check your connection and refresh.</div>}

      {cardEl && card && createPortal(card, cardEl)}
      {docked && card}
    </section>
  );
}

function PlaceCard({ s, docked, onClose }: { s: PublicStamp; docked: boolean; onClose: () => void }) {
  const by = byline(s.contributor);
  return (
    <div className={docked ? "place-card docked" : "place-card"} role="dialog" aria-label={`${s.place_name}, ${s.city}`}>
      <button className="icon-btn sm soft close" aria-label="Close" onClick={onClose}><Icon name="x" size={16} /></button>
      <div className="row" style={{ paddingRight: 32 }}>
        <span className="meta">{s.country} · {s.city}</span>
        <VerdictPill verdict={s.verdict} small />
      </div>
      <div className="row-end">
        <h3>{s.place_name}</h3>
        <VerdictStamp verdict={s.verdict} code={countryCode(s.country)} w={44} h={52} fontSize={15} />
      </div>
      <Tags tags={s.tags} />
      {s.note && <p>{s.note}</p>}
      <div className="foot">
        <a href={s.map_link} target="_blank" rel="noopener noreferrer nofollow">Open in Maps <Icon name="arrow" size={16} /></a>
        <span>{by ? `by ${by} · ` : ""}{monthYear(s.created_at)}</span>
      </div>
    </div>
  );
}
