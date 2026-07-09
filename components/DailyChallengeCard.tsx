"use client";

import { useEffect, useState } from "react";
import { dailyChallengeFor } from "@/lib/progress";
import { useDailyCompletedDate, useDailyStreak } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/utils";
import type { DailyChallenge } from "@/data/dailyChallenges";

/**
 * The challenge is derived from today's UTC date, which the server and the
 * client can disagree about across a midnight boundary. Resolve it after mount.
 */
export function DailyChallengeCard({ compact = false }: { compact?: boolean }) {
  const mounted = useMounted();
  const streak = useDailyStreak();
  const completedDate = useDailyCompletedDate();
  const [today, setToday] = useState<{ key: string; challenge: DailyChallenge } | null>(
    null,
  );

  useEffect(() => setToday(dailyChallengeFor(Date.now())), []);

  if (!mounted || !today) {
    return compact ? null : <div className="h-24 animate-pulse rounded-lg bg-line" />;
  }

  const done = completedDate === today.key;

  return (
    <div
      className={cn(
        "surface rounded-lg px-4 py-3.5",
        done && "border-accent/40 bg-accent-soft dark:bg-accent/10",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          {done ? "✅" : today.challenge.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">
              Daily challenge
            </p>
            {streak > 1 && (
              <span className="tnum rounded-full bg-orange-500/15 px-1.5 py-px text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                {streak}-day streak 🔥
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-medium leading-snug tracking-tight">
            {today.challenge.title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-subtle">
            {done ? "Done. Come back tomorrow." : today.challenge.hint}
          </p>
        </div>

        <span className="tnum shrink-0 text-xs font-semibold text-subtle">
          +{today.challenge.xp} XP
        </span>
      </div>
    </div>
  );
}
