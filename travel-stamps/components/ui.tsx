import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { VERDICTS, type Verdict } from "@/lib/constants";

const PATHS: Record<string, ReactNode> = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
  locate: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 5 5 9-10" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  chev: <path d="m6 9 6 6 6-6" />,
  pin: (<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  back: <path d="M15 6l-6 6 6 6" />,
  utensils: <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M17 3c-2 1.5-2.5 4-2.5 7H17v11" />,
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z" />,
  scissors: (<><circle cx="6" cy="7" r="2.5" /><circle cx="6" cy="17" r="2.5" /><path d="M8 8.5 20 18M8 15.5 20 6" /></>),
  users: (<><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" /></>),
  landmark: <path d="M4 9h16L12 4zM6 9v8M10 9v8M14 9v8M18 9v8M4 20h16" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 1.8, color = "currentColor" }: { name: IconName; size?: number; stroke?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/** A postage stamp with perforated edges. */
export function Stamp({ w, h, fill, edge, code = "", ink, fontSize = 18, style }: {
  w: number; h: number; fill: string; edge: string; code?: string; ink: string; fontSize?: number; style?: CSSProperties;
}) {
  const step = 8, r = 3.2;
  const nx = Math.floor(w / step), ny = Math.floor(h / step);
  const ox = (w - (nx - 1) * step) / 2, oy = (h - (ny - 1) * step) / 2;
  const holes: ReactNode[] = [];
  for (let i = 0; i < nx; i++) {
    const x = ox + i * step;
    holes.push(<circle key={`t${i}`} cx={x} cy={0} r={r} />, <circle key={`b${i}`} cx={x} cy={h} r={r} />);
  }
  for (let j = 0; j < ny; j++) {
    const y = oy + j * step;
    holes.push(<circle key={`l${j}`} cx={0} cy={y} r={r} />, <circle key={`r${j}`} cx={w} cy={y} r={r} />);
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ flexShrink: 0, ...style }}>
      <rect width={w} height={h} fill={fill} />
      <rect x={6} y={6} width={w - 12} height={h - 12} fill="none" stroke={ink} strokeOpacity={0.35} strokeDasharray="2 2" />
      <g fill={edge}>{holes}</g>
      {code && (
        <text x={w / 2} y={h / 2 + fontSize * 0.36} textAnchor="middle" fontFamily="var(--font-outfit), sans-serif" fontWeight={600} fontSize={fontSize} fill={ink}>
          {code}
        </text>
      )}
    </svg>
  );
}

export function VerdictStamp({ verdict, code, w = 56, h = 66, edge = "#FFFFFF", fontSize = 18 }: { verdict: Verdict; code: string; w?: number; h?: number; edge?: string; fontSize?: number }) {
  const v = VERDICTS[verdict];
  return <Stamp w={w} h={h} fill={v.tint} edge={edge} code={code} ink={v.color} fontSize={fontSize} />;
}

export function Logo({ size = 22, edge = "#EEEAE3", href = "/" }: { size?: number; edge?: string; href?: string }) {
  return (
    <Link href={href} className="logo" style={{ fontSize: size }} aria-label="Travel Stamps home">
      <Stamp w={30} h={36} fill="#1C1B19" edge={edge} ink="#1C1B19" />
      <span>Travel Stamps</span>
    </Link>
  );
}

export function VerdictPill({ verdict, small }: { verdict: Verdict; small?: boolean }) {
  const v = VERDICTS[verdict];
  return (
    <span className={small ? "pill sm" : "pill"}>
      <span className="dot" style={{ background: v.color }} />
      {v.label}
    </span>
  );
}

export function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="tags">
      {tags.map((t) => (
        <span key={t} className="tag">{t}</span>
      ))}
    </div>
  );
}

export function byline(contributor: string | null) {
  if (!contributor) return null;
  const c = contributor.trim();
  return c.startsWith("@") ? c : `@${c}`;
}

export function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return monthYear(iso);
}
