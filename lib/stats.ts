import { LAMBO_ID, LAMBO_LENGTH_M } from "@/data/products";
import { formatCount, formatQuantityWithUnit } from "@/lib/format";
import type { CartMap } from "@/lib/store";

/** Assumptions, stated openly so nobody mistakes this for economics. */
export const COST_TO_FEED_ONE_PERSON_PER_YEAR = 1_000;
export const AVERAGE_US_SALARY = 60_000;
export const FEDERAL_MIN_WAGE_HOURLY = 7.25;
export const FULL_TIME_HOURS_PER_YEAR = 2_080;
export const MIN_WAGE_ANNUAL =
  FEDERAL_MIN_WAGE_HOURLY * FULL_TIME_HOURS_PER_YEAR; // $15,080

export interface FunStat {
  id: string;
  emoji: string;
  headline: string;
  detail: string;
}

/**
 * `owned` must be the cart merged with everything already checked out —
 * otherwise your Lamborghinis disappear from the stats the moment you place the
 * order that buys them.
 */
export function buildStats(totalSpent: number, owned: CartMap): FunStat[] {
  const lambos = owned[LAMBO_ID] ?? 0;

  const peopleFed = totalSpent / COST_TO_FEED_ONE_PERSON_PER_YEAR;
  const salaryYears = totalSpent / AVERAGE_US_SALARY;
  const minWageYears = totalSpent / MIN_WAGE_ANNUAL;
  const lamboKm = (lambos * LAMBO_LENGTH_M) / 1_000;

  const stats: FunStat[] = [
    {
      id: "feed",
      emoji: "🍲",
      headline: `Feeds ${formatQuantityWithUnit(peopleFed, "people")} for a year`,
      detail: `At $${formatCount(COST_TO_FEED_ONE_PERSON_PER_YEAR)} per person, per year.`,
    },
    {
      id: "salary",
      emoji: "💼",
      headline: `${formatQuantityWithUnit(salaryYears, "years")} of an average US salary`,
      detail: `Assuming $${formatCount(AVERAGE_US_SALARY)} a year, every year.`,
    },
    {
      id: "minwage",
      emoji: "⏳",
      headline: `${formatQuantityWithUnit(minWageYears, "years")} to earn back at minimum wage`,
      detail: `$${FEDERAL_MIN_WAGE_HOURLY.toFixed(2)}/hr, ${formatCount(FULL_TIME_HOURS_PER_YEAR)} hours a year, no days off.`,
    },
  ];

  if (lambos > 0) {
    stats.push({
      id: "lambo",
      emoji: "🐂",
      headline: `${formatCount(lambos)} Lamborghinis stretch ${formatQuantityWithUnit(lamboKm, "km")}`,
      detail: `Parked bumper-to-bumper. A Revuelto is ${LAMBO_LENGTH_M}m long.`,
    });
  }

  return stats;
}
