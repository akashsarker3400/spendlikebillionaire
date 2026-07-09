import { NextResponse } from "next/server";
import {
  BILLIONAIRES,
  NET_WORTH_LAST_UPDATED,
  STATIC_NET_WORTHS,
} from "@/data/billionaires";
import type { NetWorthResponse } from "@/types";

/**
 * Forbes' real-time list. Public and unauthenticated, with two traps:
 *
 *  1. It answers 503 to anything that doesn't look like a browser. Sending a
 *     real User-Agent is the difference between live data and permanent
 *     fallback — and because the fallback is silent by design, the failure is
 *     invisible unless you check `source` in the response.
 *  2. The unfiltered payload is 42 MB. `?fields=` trims it to ~184 KB, which
 *     matters when the server has 4 GB and one core.
 */
const FORBES_URL =
  "https://www.forbes.com/forbesapi/person/rtb/0/position/true.json?fields=personName,finalWorth";

/** Overridable so the fallback path can be exercised against a dead endpoint. */
const SOURCE_URL = process.env.NETWORTH_SOURCE_URL || FORBES_URL;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 20_000;

/**
 * Rendered per request, never prerendered.
 *
 * This route used to be statically generated with `revalidate = 86400`. That
 * baked whatever Forbes returned *at docker build time* into the image — and
 * since the build container got a 503, every visitor was served the static
 * fallback for a whole day, with no way to recover. Freezing a failed fetch
 * for 24 hours is worse than not caching at all.
 */
export const dynamic = "force-dynamic";

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

/**
 * In-memory, per-container. Only successful live responses are cached — a
 * failure must never be memoised, or one bad minute at Forbes poisons the next
 * six hours.
 */
let cache: { payload: NetWorthResponse; expiresAt: number } | null = null;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/&\s*family/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function fetchLive(): Promise<NetWorthResponse | null> {
  const response = await fetch(SOURCE_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "user-agent": BROWSER_UA,
      accept: "application/json,text/plain,*/*",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) throw new Error(`Forbes responded ${response.status}`);

  const payload: unknown = await response.json();
  const people: ForbesPerson[] =
    (payload as { personList?: { personsLists?: ForbesPerson[] } })?.personList
      ?.personsLists ?? [];

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
    // Round the millions first: `finalWorth` is a float and 272254.094999999
    // must not become a fractional dollar amount.
    values[billionaire.id] = Math.round(millions) * 1_000_000;
    matches += 1;
  }

  if (matches === 0) throw new Error("No billionaires matched by name");

  return {
    source: "live",
    lastUpdated: new Date().toISOString().slice(0, 10),
    values,
  };
}

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.payload, {
      headers: { "cache-control": "public, max-age=0, s-maxage=3600" },
    });
  }

  try {
    const live = await fetchLive();
    if (!live) throw new Error("No live payload");

    cache = { payload: live, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(live, {
      headers: { "cache-control": "public, max-age=0, s-maxage=3600" },
    });
  } catch {
    // The game must never show an error screen because Forbes had a bad day.
    // Do NOT cache this, and do NOT let a CDN cache it — the next request
    // should try again.
    return NextResponse.json(staticPayload, {
      headers: { "cache-control": "no-store" },
    });
  }
}
