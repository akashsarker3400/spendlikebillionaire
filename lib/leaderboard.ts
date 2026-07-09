import type { LeaderboardEntry } from "@/types";

/**
 * Every read/write goes through this interface. Swapping localStorage for
 * Supabase later means writing one more provider and changing the export at the
 * bottom of this file — no calling code changes, which is why the methods are
 * async even though localStorage is not.
 */
export interface LeaderboardProvider {
  getEntries(): Promise<LeaderboardEntry[]>;
  addEntry(entry: LeaderboardEntry): Promise<void>;
  clear(): Promise<void>;
}

export const MAX_ENTRIES = 10;

const STORAGE_KEY = "slab:leaderboard";

function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.nickname === "string" &&
    typeof e.billionaireId === "string" &&
    typeof e.billionaireName === "string" &&
    typeof e.startingBalance === "number" &&
    typeof e.totalSpent === "number" &&
    typeof e.percentSpent === "number" &&
    typeof e.itemsBought === "number" &&
    typeof e.uniqueItems === "number" &&
    typeof e.createdAt === "number" &&
    (typeof e.timeToHalfMs === "number" || e.timeToHalfMs === null)
  );
}

class LocalStorageLeaderboard implements LeaderboardProvider {
  async getEntries(): Promise<LeaderboardEntry[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isEntry);
    } catch {
      return [];
    }
  }

  async addEntry(entry: LeaderboardEntry): Promise<void> {
    if (typeof window === "undefined") return;
    const entries = await this.getEntries();
    entries.push(entry);

    // Keep the union of the top MAX_ENTRIES on each board rather than a single
    // ranking, so a run that wins on speed isn't evicted by ten big spenders.
    const keep = new Set<string>();
    for (const board of BOARDS) {
      for (const e of rankBy(entries, board.id).slice(0, MAX_ENTRIES)) {
        keep.add(e.id);
      }
    }

    const kept = entries.filter((e) => keep.has(e.id));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    } catch {
      // Quota exceeded or storage disabled — the run just doesn't persist.
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const leaderboard: LeaderboardProvider = new LocalStorageLeaderboard();

// ----------------------------------------------------------------- ranking

export type BoardId = "spent" | "items" | "speed";

export const BOARDS: Array<{ id: BoardId; label: string; blurb: string }> = [
  { id: "spent", label: "Most Spent", blurb: "Total damage done" },
  { id: "items", label: "Most Items", blurb: "Sheer volume of stuff" },
  { id: "speed", label: "Fastest to 50%", blurb: "Time to burn half the fortune" },
];

export function rankBy(
  entries: LeaderboardEntry[],
  board: BoardId,
): LeaderboardEntry[] {
  const sorted = [...entries];
  switch (board) {
    case "spent":
      sorted.sort((a, b) => b.totalSpent - a.totalSpent || a.createdAt - b.createdAt);
      return sorted;
    case "items":
      sorted.sort((a, b) => b.itemsBought - a.itemsBought || a.createdAt - b.createdAt);
      return sorted;
    case "speed":
      return sorted
        .filter((e) => e.timeToHalfMs !== null)
        .sort((a, b) => a.timeToHalfMs! - b.timeToHalfMs! || a.createdAt - b.createdAt);
  }
}
