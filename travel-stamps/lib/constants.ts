export const TAGS = [
  "Welcoming",
  "Diverse crowd",
  "Halal food",
  "Afro hair care",
  "Black-owned",
  "LGBTQ+ friendly",
  "Family",
  "Solo-friendly",
  "Heritage",
  "Food",
  "Nature",
  "Nightlife",
] as const;

export type Tag = (typeof TAGS)[number];

export const VERDICTS = {
  must: { label: "Must go", hint: "Book the ticket", color: "#1F6B57", tint: "#DCEAE3" },
  worth: { label: "Worth it", hint: "Glad I went", color: "#2F5E9E", tint: "#DEE6F2" },
  okay: { label: "It’s okay", hint: "Mixed feelings", color: "#9A6410", tint: "#F2E7D3" },
  skip: { label: "Skip", hint: "Wouldn’t go back", color: "#A8392B", tint: "#F2DCD8" },
} as const;

export type Verdict = keyof typeof VERDICTS;
export const VERDICT_KEYS = Object.keys(VERDICTS) as Verdict[];

export const LIMITS = {
  city: 80,
  placeName: 120,
  note: 1000,
  contributor: 40,
  mapLink: 500,
  maxTags: TAGS.length,
  submissionsPerDay: 5,
};
