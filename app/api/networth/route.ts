import { NextResponse } from "next/server";
import {
  BILLIONAIRES,
  NET_WORTH_LAST_UPDATED,
  STATIC_NET_WORTHS,
} from "@/data/billionaires";
import type { NetWorthResponse } from "@/types";

/** Forbes' real-time list. Public, unauthenticated, and entirely allowed to disappear. */
const FORBES_URL =
  "https://www.forbes.com/forbesapi/person/rtb/0/position/true.json";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 4_000;

export const revalidate = 86400;

interface ForbesPerson {
  personName?: string;
  /** Forbes reports net worth in millions of USD. */
  finalWorth?: number;
}

const staticPayload: NetWorthResponse = {
  source: "static",
  lastUpdated: NET_WORTH_LAST_UPDATED,
  values: STATIC_NET_WORTHS,
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/&\s*family/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export async function GET() {
  try {
    const response = await fetch(FORBES_URL, {
      next: { revalidate: ONE_DAY_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Forbes responded ${response.status}`);

    const payload: unknown = await response.json();
    const people: ForbesPerson[] =
      (payload as { personList?: { personsLists?: ForbesPerson[] } })
        ?.personList?.personsLists ?? [];

    if (!Array.isArray(people) || people.length === 0) {
      throw new Error("Unexpected Forbes payload shape");
    }

    const worthByName = new Map<string, number>();
    for (const person of people) {
      if (typeof person.personName !== "string") continue;
      if (typeof person.finalWorth !== "number" || person.finalWorth <= 0) continue;
      worthByName.set(normalize(person.personName), person.finalWorth);
    }

    const values: Record<string, number> = { ...STATIC_NET_WORTHS };
    let matches = 0;

    for (const billionaire of BILLIONAIRES) {
      if (!billionaire.forbesName) continue;
      const millions = worthByName.get(normalize(billionaire.forbesName));
      if (millions === undefined) continue;
      values[billionaire.id] = Math.round(millions) * 1_000_000;
      matches += 1;
    }

    if (matches === 0) throw new Error("No billionaires matched by name");

    const live: NetWorthResponse = {
      source: "live",
      lastUpdated: new Date().toISOString().slice(0, 10),
      values,
    };
    return NextResponse.json(live);
  } catch {
    // The game must never show an error screen because Forbes had a bad day.
    return NextResponse.json(staticPayload);
  }
}
