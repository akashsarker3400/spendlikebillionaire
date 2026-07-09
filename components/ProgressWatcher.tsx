"use client";

import { useEffect, useRef } from "react";
import { ACHIEVEMENTS_BY_ID, evaluateAchievements } from "@/data/achievements";
import { burstConfetti } from "@/lib/confetti";
import { buildAchievementContext, dailyChallengeFor } from "@/lib/progress";
import { playSound } from "@/lib/sounds";
import {
  useGameStore,
  useIsFortuneDestroyed,
  useOrders,
  useTotalSpent,
} from "@/lib/store";
import { toast } from "@/lib/toast";

/**
 * Watches the run and awards achievements, XP, and the daily challenge.
 *
 * Achievements are pure predicates over the current state, so this can safely
 * re-evaluate every time anything changes — `unlockAchievements` returns only
 * the ids that were newly unlocked, and everything else is a no-op.
 */
export function ProgressWatcher() {
  const totalSpent = useTotalSpent();
  const orders = useOrders().length;
  const destroyed = useIsFortuneDestroyed();

  // Toasts queue rather than stack: five unlocks at once is a slot machine, not
  // a celebration.
  const queue = useRef<string[]>([]);
  const draining = useRef(false);

  useEffect(() => {
    const now = Date.now();
    const store = useGameStore.getState();

    const context = buildAchievementContext(now);
    if (!context) return;

    // Daily first, so a run that completes it can also unlock "Daily Devotee".
    const { key, challenge } = dailyChallengeFor(now);
    if (store.dailyCompletedDate !== key && challenge.check(context)) {
      if (store.completeDaily(key, challenge.xp)) {
        context.dailyDone = true;
        playSound("milestone");
        void burstConfetti(0.7);
        const streak = useGameStore.getState().dailyStreak;
        toast(
          `Daily done: ${challenge.title}. +${challenge.xp} XP${streak > 1 ? ` · ${streak}-day streak 🔥` : ""}`,
          "celebrate",
          5000,
        );
      }
    }

    const fresh = store.unlockAchievements(evaluateAchievements(context));
    if (fresh.length === 0) return;

    queue.current.push(...fresh);
    if (draining.current) return;

    draining.current = true;
    const drain = () => {
      const id = queue.current.shift();
      if (!id) {
        draining.current = false;
        return;
      }
      const achievement = ACHIEVEMENTS_BY_ID[id];
      if (achievement) {
        playSound("milestone");
        if (achievement.tier === "legendary") void burstConfetti(1);
        toast(
          `${achievement.emoji} ${achievement.name} · +${achievement.xp} XP`,
          "celebrate",
          3600,
        );
      }
      window.setTimeout(drain, 900);
    };
    drain();
  }, [totalSpent, orders, destroyed]);

  return null;
}
