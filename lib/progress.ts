import type { AchievementContext } from "@/data/achievements";
import { getBillionaire } from "@/data/billionaires";
import { challengeForDate, todayKey } from "@/data/dailyChallenges";
import { CHEAPEST_PRICE } from "@/data/products";
import {
  computePercentSpent,
  computeTotalSpent,
  countOf,
  mergeMaps,
  useGameStore,
} from "@/lib/store";

/**
 * Builds the snapshot every achievement and daily challenge is evaluated
 * against. Reads the store directly rather than taking props, so a watcher can
 * call it from an effect without threading a dozen values through React.
 */
export function buildAchievementContext(now: number): AchievementContext | null {
  const state = useGameStore.getState();
  if (!state.billionaireId) return null;

  const billionaire = getBillionaire(state.billionaireId);
  const owned = mergeMaps(state.purchased, state.cart);
  const totalSpent = computeTotalSpent(state);
  const remaining = state.startingBalance - totalSpent;
  const percentSpent = computePercentSpent(totalSpent, state.startingBalance);

  return {
    owned,
    totalSpent,
    percentSpent,
    itemsBought: countOf(owned),
    uniqueLines: Object.keys(owned).filter((id) => (owned[id] ?? 0) > 0).length,
    elapsedMs: state.startedAt ? Math.max(0, now - state.startedAt) : 0,
    timeToHalfMs:
      state.startedAt !== null && state.halfwayAt !== null
        ? state.halfwayAt - state.startedAt
        : null,
    destroyed: remaining < CHEAPEST_PRICE,
    ordersPlaced: state.orders.length,
    isJoke: billionaire?.joke ?? false,
    stoleHaul: state.stoleHaul,
    beatChallenge:
      state.challenge !== null && totalSpent > state.challenge.targetSpent,
    // Resolved by the watcher after it evaluates today's challenge; an
    // achievement can't be the thing that decides whether the daily was done.
    dailyDone: state.dailyCompletedDate === todayKey(now),
  };
}

/** Today's challenge, in UTC so it flips at the same instant for everyone. */
export function dailyChallengeFor(now: number) {
  const key = todayKey(now);
  return { key, challenge: challengeForDate(key) };
}
