import { PRODUCTS_BY_ID } from "@/data/products";
import type { AchievementContext } from "@/data/achievements";

/**
 * One challenge per UTC day, picked deterministically from the date so every
 * player in the world gets the same one without a server telling them so.
 */
export interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  xp: number;
  check: (ctx: AchievementContext) => boolean;
}

const owns = (ctx: AchievementContext, id: string, atLeast = 1) =>
  (ctx.owned[id] ?? 0) >= atLeast;

const ownsNoneOfCategory = (ctx: AchievementContext, category: string) =>
  Object.entries(ctx.owned).every(([id, qty]) =>
    qty <= 0 || PRODUCTS_BY_ID[id]?.category !== category,
  );

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: "destroy-fast",
    emoji: "⚡",
    title: "Burn half a fortune in under two minutes",
    hint: "Go straight for the expensive stuff.",
    xp: 40,
    check: (c) => c.timeToHalfMs !== null && c.timeToHalfMs < 120_000,
  },
  {
    id: "no-cars",
    emoji: "🚫",
    title: "Destroy a fortune without buying a single car",
    hint: "Planes, boats, and bad decisions only.",
    xp: 50,
    check: (c) => c.destroyed && ownsNoneOfCategory(c, "cars"),
  },
  {
    id: "surgical",
    emoji: "🎯",
    title: "Destroy a fortune with 5 products or fewer",
    hint: "Think big-ticket. Twitter costs $44B on its own.",
    xp: 60,
    check: (c) => c.destroyed && c.uniqueLines <= 5,
  },
  {
    id: "philanthropy",
    emoji: "💧",
    title: "Spend more on good than on toys",
    hint: "Clean water, vaccines, rainforest.",
    xp: 50,
    check: (c) =>
      owns(c, "clean-water") && owns(c, "vaccine") && owns(c, "rainforest"),
  },
  {
    id: "everyday-only",
    emoji: "🍔",
    title: "Spend $1B using only Everyday items",
    hint: "That is a lot of Big Macs.",
    xp: 60,
    check: (c) => {
      let everydaySpend = 0;
      for (const [id, qty] of Object.entries(c.owned)) {
        const product = PRODUCTS_BY_ID[id];
        if (!product) continue;
        if (product.category !== "everyday") return false;
        everydaySpend += product.price * qty;
      }
      return everydaySpend >= 1_000_000_000;
    },
  },
  {
    id: "fleet-day",
    emoji: "✈️",
    title: "Own 10 aircraft",
    hint: "One of each, then double up.",
    xp: 40,
    check: (c) =>
      Object.entries(c.owned).reduce(
        (n, [id, qty]) =>
          PRODUCTS_BY_ID[id]?.category === "aviation" ? n + qty : n,
        0,
      ) >= 10,
  },
  {
    id: "the-lot",
    emoji: "🗂️",
    title: "Own 20 different products",
    hint: "Breadth, not depth.",
    xp: 40,
    check: (c) => c.uniqueLines >= 20,
  },
];

/** `2026-07-09` in UTC, so the day flips at the same instant everywhere. */
export function todayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Deterministic, stable hash of the date string. */
function hashDate(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function challengeForDate(key: string): DailyChallenge {
  const index = hashDate(key) % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[index]!;
}

/** Was `previous` exactly the day before `current`? Used for streaks. */
export function isConsecutiveDay(previous: string, current: string): boolean {
  const prev = Date.parse(`${previous}T00:00:00Z`);
  const curr = Date.parse(`${current}T00:00:00Z`);
  if (Number.isNaN(prev) || Number.isNaN(curr)) return false;
  return curr - prev === 86_400_000;
}
