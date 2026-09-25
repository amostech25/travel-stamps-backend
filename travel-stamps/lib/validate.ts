import { LIMITS, TAGS, VERDICT_KEYS, type Verdict } from "./constants";
import { COUNTRIES } from "./countries";

export interface SubmissionInput {
  country: string;
  city: string;
  place_name: string;
  tags: string[];
  verdict: Verdict;
  note: string | null;
  map_link: string;
  contributor: string | null;
}

export type FieldErrors = Partial<Record<keyof SubmissionInput, string>>;

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const cleanNote = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "");

const LOOKS_LIKE_CONTACT = /(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s-]{7,}\d)/i;

export function validateSubmission(raw: Record<string, unknown>): { data?: SubmissionInput; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const country = clean(raw.country);
  if (!COUNTRIES.some((c) => c.name === country)) errors.country = "Choose a country from the list.";

  const city = clean(raw.city);
  if (!city) errors.city = "Add the city or town.";
  else if (city.length > LIMITS.city) errors.city = `Keep this under ${LIMITS.city} characters.`;

  const place_name = clean(raw.place_name);
  if (!place_name) errors.place_name = "Add the name of the place.";
  else if (place_name.length > LIMITS.placeName) errors.place_name = `Keep this under ${LIMITS.placeName} characters.`;

  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = [...new Set(tagsRaw.filter((t): t is string => typeof t === "string" && (TAGS as readonly string[]).includes(t)))];
  if (tags.length === 0) errors.tags = "Pick at least one tag.";

  const verdict = clean(raw.verdict) as Verdict;
  if (!VERDICT_KEYS.includes(verdict)) errors.verdict = "Choose a verdict.";

  const note = cleanNote(raw.note);
  if (note.length > LIMITS.note) errors.note = `Keep your note under ${LIMITS.note} characters.`;
  else if (/https?:\/\/|www\./i.test(note)) errors.note = "Please leave links out of the note. Only the map link is needed.";

  const map_link = clean(raw.map_link);
  if (!map_link) errors.map_link = "Paste a Google Maps or Apple Maps link.";
  else if (map_link.length > LIMITS.mapLink) errors.map_link = "That link is too long. Use the Share button in Maps to get a short one.";

  const contributor = clean(raw.contributor);
  if (contributor.length > LIMITS.contributor) errors.contributor = `Keep this under ${LIMITS.contributor} characters.`;
  else if (contributor && LOOKS_LIKE_CONTACT.test(contributor)) errors.contributor = "Use a name or handle, not an email, phone number or link.";

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    data: { country, city, place_name, tags, verdict, note: note || null, map_link, contributor: contributor || null },
  };
}
