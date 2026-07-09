import { PRODUCTS_BY_ID } from "@/data/products";
import type { CategoryId } from "@/types";

/**
 * Every achievement is a pure predicate over a snapshot of the run. No
 * timers, no side effects — `evaluateAchievements` just asks each one whether it
 * is true right now, so replaying the same run always unlocks the same set.
 */
export interface AchievementContext {
  /** Cart merged with everything already checked out. */
  owned: Record<string, number>;
  totalSpent: number;
  percentSpent: number;
  itemsBought: number;
  /** Distinct products owned. */
  uniqueLines: number;
  /** Milliseconds from picking a billionaire to now. */
  elapsedMs: number;
  /** Milliseconds to cross 50% of the fortune, or null if not reached. */
  timeToHalfMs: number | null;
  /** Nothing on the shelf is affordable any more. */
  destroyed: boolean;
  ordersPlaced: number;
  isJoke: boolean;
  /** This run's cart was copied from someone else's shared haul. */
  stoleHaul: boolean;
  /** True when this run beat a shared haul's percentage. */
  beatChallenge: boolean;
  /** True when this run completed today's daily challenge. */
  dailyDone: boolean;
}

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tier: AchievementTier;
  xp: number;
  /** Hidden achievements aren't listed until unlocked. */
  secret?: boolean;
  check: (ctx: AchievementContext) => boolean;
}

const XP_BY_TIER: Record<AchievementTier, number> = {
  bronze: 10,
  silver: 25,
  gold: 60,
  legendary: 150,
};

const owns = (ctx: AchievementContext, id: string, atLeast = 1) =>
  (ctx.owned[id] ?? 0) >= atLeast;

const countInCategory = (ctx: AchievementContext, category: CategoryId) =>
  Object.entries(ctx.owned).reduce((n, [id, qty]) => {
    const product = PRODUCTS_BY_ID[id];
    return product?.category === category ? n + qty : n;
  }, 0);

function make(
  id: string,
  emoji: string,
  name: string,
  description: string,
  tier: AchievementTier,
  check: (ctx: AchievementContext) => boolean,
  secret = false,
): Achievement {
  return { id, emoji, name, description, tier, xp: XP_BY_TIER[tier], check, secret };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ------------------------------------------------------------- progression
  make("first-blood", "🛒", "First Blood", "Put anything in your cart.", "bronze",
    (c) => c.itemsBought >= 1),
  make("checked-out", "📦", "Order Placed", "Complete your first checkout.", "bronze",
    (c) => c.ordersPlaced >= 1),
  make("quarter", "🩸", "A Quarter Gone", "Spend 25% of a fortune.", "bronze",
    (c) => c.percentSpent >= 25),
  make("halfway", "🔥", "Halfway to Ruin", "Spend 50% of a fortune.", "silver",
    (c) => c.percentSpent >= 50),
  make("three-quarters", "🛋️", "Couch Cushions", "Spend 75% of a fortune.", "silver",
    (c) => c.percentSpent >= 75),
  make("destroyer", "💀", "Fortune Destroyer", "Leave them unable to buy a Big Mac.", "legendary",
    (c) => c.destroyed),

  // ------------------------------------------------------------------ volume
  make("big-mac-1000", "🍔", "Supersize", "Own 1,000 Big Macs.", "bronze",
    (c) => owns(c, "big-mac", 1_000)),
  make("big-mac-million", "🍟", "McMillionaire", "Own 1,000,000 Big Macs.", "gold",
    (c) => owns(c, "big-mac", 1_000_000)),
  make("lambo-100", "🐂", "Lambo Dealership", "Own 100 Lamborghinis.", "silver",
    (c) => owns(c, "lambo", 100)),
  make("fleet", "✈️", "Air Force", "Own 10 aircraft.", "silver",
    (c) => countInCategory(c, "aviation") >= 10),
  make("armada", "⚓", "Armada", "Own 10 vessels.", "silver",
    (c) => countInCategory(c, "marine") >= 10),
  make("landlord", "🏘️", "Landlord", "Own 25 pieces of real estate.", "gold",
    (c) => countInCategory(c, "realestate") >= 25),
  make("collector", "🗂️", "Completionist", "Own 30 different products.", "gold",
    (c) => c.uniqueLines >= 30),
  make("everything", "🏆", "Buy The Catalogue", "Own every product in the shop.", "legendary",
    (c) => c.uniqueLines >= Object.keys(PRODUCTS_BY_ID).length),

  // ------------------------------------------------------------------ iconic
  make("art-thief", "🖼️", "Art Thief", "Buy the Mona Lisa.", "gold",
    (c) => owns(c, "mona-lisa")),
  make("bird-app", "🐦", "That Was a Bad Idea", "Buy Twitter / X.", "gold",
    (c) => owns(c, "twitter")),
  make("to-the-moon", "🌙", "To The Moon", "Fund a crewed moon mission.", "gold",
    (c) => owns(c, "moon-mission")),
  make("interplanetary", "🪐", "Interplanetary", "Put money down on Mars.", "legendary",
    (c) => owns(c, "mars-colony")),
  make("team-owner", "🏀", "Team Owner", "Buy any sports franchise.", "silver",
    (c) => owns(c, "nba-team") || owns(c, "nfl-team") || owns(c, "epl-club") || owns(c, "f1-team")),

  // ------------------------------------------------------------ actually good
  make("philanthropist", "💧", "Actually Useful", "Buy clean water, vaccines, and rainforest.", "legendary",
    (c) => owns(c, "clean-water") && owns(c, "vaccine") && owns(c, "rainforest")),

  // ------------------------------------------------------------------- speed
  make("speedrun", "⚡", "Speedrun", "Burn half a fortune in under 60 seconds.", "gold",
    (c) => c.timeToHalfMs !== null && c.timeToHalfMs < 60_000),
  make("blink", "💨", "Blink And It's Gone", "Burn half a fortune in under 10 seconds.", "legendary",
    (c) => c.timeToHalfMs !== null && c.timeToHalfMs < 10_000),

  // -------------------------------------------------------------------- meta
  make("thief", "🥷", "Copycat", "Steal someone else's haul.", "bronze",
    (c) => c.stoleHaul),
  make("champion", "👑", "Beat The Champ", "Beat a shared haul's score.", "gold",
    (c) => c.beatChallenge),
  make("daily", "📅", "Daily Devotee", "Complete a daily challenge.", "silver",
    (c) => c.dailyDone),

  // ------------------------------------------------------------------- comedy
  make("broke", "🪫", "Rent Is Due", "Destroy your own $1,000.", "bronze",
    (c) => c.isJoke && c.destroyed),
  make("minimalist", "🎯", "Surgical", "Destroy a fortune with 3 products or fewer.", "legendary",
    (c) => c.destroyed && c.uniqueLines <= 3 && !c.isJoke),
  make("patient", "🐌", "Window Shopper", "Take 10 minutes without destroying anything.", "bronze",
    (c) => c.elapsedMs > 600_000 && !c.destroyed, true),
];

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/** Returns the ids of every achievement whose predicate is currently true. */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    try {
      if (achievement.check(ctx)) unlocked.push(achievement.id);
    } catch {
      // A broken predicate must never take the game down.
    }
  }
  return unlocked;
}

// ---------------------------------------------------------------------- XP

export const MAX_XP = ACHIEVEMENTS.reduce((n, a) => n + a.xp, 0);

export interface Level {
  level: number;
  title: string;
  /** XP needed to reach this level. */
  from: number;
}

export const LEVELS: Level[] = [
  { level: 1, title: "Window Shopper", from: 0 },
  { level: 2, title: "Impulse Buyer", from: 40 },
  { level: 3, title: "Big Spender", from: 120 },
  { level: 4, title: "High Roller", from: 260 },
  { level: 5, title: "Tycoon", from: 460 },
  { level: 6, title: "Oligarch", from: 720 },
  { level: 7, title: "Fortune Destroyer", from: 1_040 },
];

export function levelFor(xp: number): { current: Level; next: Level | null; progress: number } {
  let current = LEVELS[0]!;
  for (const level of LEVELS) if (xp >= level.from) current = level;

  const next = LEVELS.find((l) => l.from > current.from) ?? null;
  const span = next ? next.from - current.from : 1;
  const progress = next ? Math.min(1, (xp - current.from) / span) : 1;

  return { current, next, progress };
}
