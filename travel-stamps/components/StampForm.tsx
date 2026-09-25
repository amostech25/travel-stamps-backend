"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIMITS, TAGS, VERDICTS, VERDICT_KEYS, type Verdict } from "@/lib/constants";
import { COUNTRIES, countryCode } from "@/lib/countries";
import { TURNSTILE_SITE_KEY } from "@/lib/config";
import { Icon } from "./ui";

type Errors = Partial<Record<"country" | "city" | "place_name" | "tags" | "verdict" | "note" | "map_link" | "contributor", string>>;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback"?: () => void; theme?: string }) => string;
      reset: (id?: string) => void;
    };
  }
}

export default function StampForm() {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [place, setPlace] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [contributor, setContributor] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const tsRef = useRef<HTMLDivElement>(null);
  const tsId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !tsRef.current) return;
    const mount = () => {
      if (window.turnstile && tsRef.current && !tsId.current) {
        tsId.current = window.turnstile.render(tsRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          callback: setToken,
          "expired-callback": () => setToken(null),
        });
      }
    };
    if (window.turnstile) return mount();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = mount;
    document.head.appendChild(s);
  }, []);

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Errors = {};
    if (!country) local.country = "Choose a country from the list.";
    if (!city.trim()) local.city = "Add the city or town.";
    if (!place.trim()) local.place_name = "Add the name of the place.";
    if (tags.length === 0) local.tags = "Pick at least one tag.";
    if (!verdict) local.verdict = "Choose a verdict.";
    if (!link.trim()) local.map_link = "Paste a Google Maps or Apple Maps link.";
    setErrors(local);
    if (Object.keys(local).length) {
      setMessage("Please fill in the highlighted fields.");
      focusFirstError(local);
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country, city, place_name: place, tags, verdict, note, map_link: link, contributor, website, turnstileToken: token }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string; errors?: Errors; demo?: boolean };
      if (json.ok) {
        const q = new URLSearchParams({ place: place.trim(), city: city.trim(), code: countryCode(country) });
        if (json.demo) q.set("demo", "1");
        router.push(`/add/thanks?${q}`);
        return;
      }
      setErrors(json.errors ?? {});
      setMessage(json.message ?? "Something went wrong. Please try again.");
      if (json.errors) focusFirstError(json.errors);
      if (tsId.current) {
        window.turnstile?.reset(tsId.current);
        setToken(null);
      }
    } catch {
      setMessage("We couldn’t reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: keyof Errors) =>
    errors[k] ? <span className="field-error" id={`${k}-error`}>{errors[k]}</span> : null;
  const described = (k: keyof Errors, hint?: string) =>
    [errors[k] ? `${k}-error` : null, hint].filter(Boolean).join(" ") || undefined;

  return (
    <form className="sheet" onSubmit={submit} noValidate aria-labelledby="add-title">
      <div className="sheet-head">
        <div>
          <h1 id="add-title">Add a stamp</h1>
          <p>Share a place from your travels. It appears on the map once it’s been reviewed.</p>
        </div>
        <Link href="/" className="icon-btn sm soft" aria-label="Close and go back to the map"><Icon name="x" /></Link>
      </div>

      <div className="sheet-body">
        <div className="field-row">
          <label className="field">
            <span className="field-label">Country</span>
            <span className="select-wrap">
              <select id="f-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)} aria-invalid={!!errors.country} aria-describedby={described("country")}>
                <option value="">Choose a country</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
              <Icon name="chev" />
            </span>
            {err("country")}
          </label>
          <label className="field">
            <span className="field-label">City</span>
            <input id="f-city" className="input" value={city} maxLength={LIMITS.city} placeholder="e.g. Accra" onChange={(e) => setCity(e.target.value)} aria-invalid={!!errors.city} aria-describedby={described("city")} />
            {err("city")}
          </label>
        </div>

        <label className="field">
          <span className="field-label">Place name</span>
          <input id="f-place_name" className="input" value={place} maxLength={LIMITS.placeName} placeholder="e.g. Jamestown, a restaurant, a beach" onChange={(e) => setPlace(e.target.value)} aria-invalid={!!errors.place_name} aria-describedby={described("place_name")} />
          {err("place_name")}
        </label>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={described("tags")}>
          <legend className="field-label" style={{ marginBottom: 10 }}>Tags <em>(choose all that apply)</em></legend>
          <div className="chips-wrap" id="f-tags">
            {TAGS.map((t) => (
              <button type="button" key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</button>
            ))}
          </div>
          {err("tags")}
        </fieldset>

        <div className="field">
          <span className="field-label" id="verdict-label">Verdict</span>
          <div className="verdicts" role="radiogroup" aria-labelledby="verdict-label" aria-describedby={described("verdict")} id="f-verdict">
            {VERDICT_KEYS.map((v, i) => (
              <button
                type="button"
                role="radio"
                key={v}
                className="verdict"
                aria-checked={verdict === v}
                tabIndex={verdict ? (verdict === v ? 0 : -1) : i === 0 ? 0 : -1}
                onClick={() => setVerdict(v)}
                onKeyDown={(e) => {
                  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                  if (!d) return;
                  e.preventDefault();
                  const next = VERDICT_KEYS[(i + d + VERDICT_KEYS.length) % VERDICT_KEYS.length];
                  setVerdict(next);
                  (e.currentTarget.parentElement?.children[VERDICT_KEYS.indexOf(next)] as HTMLElement | undefined)?.focus();
                }}
              >
                <b><span className="dot" style={{ background: VERDICTS[v].color }} />{VERDICTS[v].label}</b>
                <span>{VERDICTS[v].hint}</span>
              </button>
            ))}
          </div>
          {err("verdict")}
        </div>

        <label className="field">
          <span className="field-label">Note <em>(optional)</em></span>
          <textarea
            id="f-note"
            className="input"
            value={note}
            maxLength={LIMITS.note}
            placeholder="What should other travellers know? How you were treated, what to eat, when to go…"
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={!!errors.note}
            aria-describedby={described("note")}
          />
          <span className="counter">{note.length} / {LIMITS.note}</span>
          {err("note")}
        </label>

        <label className="field">
          <span className="field-label">Map link</span>
          <span className="input-wrap">
            <Icon name="link" size={18} />
            <input id="f-map_link" className="input" type="url" inputMode="url" value={link} maxLength={LIMITS.mapLink} placeholder="Paste a Google Maps or Apple Maps link" onChange={(e) => setLink(e.target.value)} aria-invalid={!!errors.map_link} aria-describedby={described("map_link", "link-hint")} />
          </span>
          <span className="field-hint" id="link-hint">We place the pin from this link, so make sure it points to the exact spot.</span>
          {err("map_link")}
        </label>

        <label className="field">
          <span className="field-label">Your name or handle <em>(optional)</em></span>
          <input id="f-contributor" className="input" value={contributor} maxLength={LIMITS.contributor} placeholder="e.g. Ama or @amatravels" onChange={(e) => setContributor(e.target.value)} aria-invalid={!!errors.contributor} aria-describedby={described("contributor", "name-hint")} />
          <span className="field-hint" id="name-hint">Shown on your stamp. Leave blank to stay anonymous.</span>
          {err("contributor")}
        </label>

        <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
          <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        </div>

        {TURNSTILE_SITE_KEY && <div ref={tsRef} />}
        {message && <div className="form-error" role="alert">{message}</div>}
      </div>

      <div className="sheet-foot">
        <span className="consent">
          By submitting, you agree to our <Link href="/guidelines">Community Guidelines</Link>. Your stamp and name will be public once approved.
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" className="btn btn-light">Cancel</Link>
          <button type="submit" className="btn btn-dark" disabled={busy || (!!TURNSTILE_SITE_KEY && !token)}>
            {busy ? "Checking…" : "Submit for review"} {!busy && <Icon name="arrow" size={18} />}
          </button>
        </div>
      </div>
    </form>
  );
}

function focusFirstError(errors: Errors) {
  const order = ["country", "city", "place_name", "tags", "verdict", "note", "map_link", "contributor"] as const;
  const first = order.find((k) => errors[k]);
  if (!first) return;
  const el = document.getElementById(`f-${first}`);
  const target = (el?.matches("div") ? el.querySelector("button") : el) as HTMLElement | null;
  target?.focus();
}
