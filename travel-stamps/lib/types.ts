import type { Verdict } from "./constants";

export type StampStatus = "pending" | "approved" | "rejected";

export interface Stamp {
  id: string;
  country: string;
  city: string;
  place_name: string;
  tags: string[];
  verdict: Verdict;
  note: string | null;
  map_link: string;
  lat: number;
  lng: number;
  contributor: string | null;
  status: StampStatus;
  created_at: string;
  reviewed_at: string | null;
}

/** The fields visitors can see. */
export type PublicStamp = Omit<Stamp, "status" | "reviewed_at">;
