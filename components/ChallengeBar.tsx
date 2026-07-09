"use client";

import { useEffect, useRef } from "react";
import { burstConfetti } from "@/lib/confetti";
import { formatCompact, formatPercent } from "@/lib/format";
import { playSound } from "@/lib/sounds";
import {
  useBeatChallenge,
  useChallenge,
  useGameStore,
  usePercentSpent,
  useTotalSpent,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/utils";

/** Shown on the shop when this run was launched from someone's shared link. */
export function ChallengeBar() {
  const mounted = useMounted();
  const challenge = useChallenge();
  const totalSpent = useTotalSpent();
  const percentSpent = usePercentSpent();
  const beaten = useBeatChallenge();
  const clearChallenge = useGameStore((s) => s.clearChallenge);

  const celebrated = useRef(false);
  useEffect(() => {
    if (!beaten || celebrated.current) return;
    celebrated.current = true;
    playSound("milestone");
    void burstConfetti(1);
    toast(`You beat ${challenge?.nickname ?? "them"} 👑`, "celebrate", 5000);
  }, [beaten, challenge?.nickname]);

  if (!mounted || !challenge) return null;

  const progress =
    challenge.targetSpent > 0
      ? Math.min(1, totalSpent / challenge.targetSpent)
      : 1;

  return (
    <div
      className={cn(
        "border-b px-5 py-2.5 sm:px-8",
        beaten
          ? "border-accent/30 bg-accent-soft dark:bg-accent/10"
          : "border-line bg-canvas dark:bg-white/[0.03]",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <span className="text-base leading-none" aria-hidden>
          {beaten ? "👑" : "🎯"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {beaten ? (
              <>You beat {challenge.nickname}.</>
            ) : (
              <>
                Beat {challenge.nickname}:{" "}
                <span className="tnum">{formatCompact(challenge.targetSpent)}</span>{" "}
                <span className="text-subtle">
                  ({formatPercent(challenge.targetPercent)})
                </span>
              </>
            )}
          </p>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                beaten ? "bg-accent" : "bg-orange-500",
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <span className="tnum shrink-0 text-xs font-medium text-subtle">
          {formatPercent(percentSpent)}
        </span>

        <button
          type="button"
          onClick={clearChallenge}
          aria-label="Dismiss challenge"
          className="shrink-0 rounded p-1 text-subtle transition-colors hover:text-ink dark:hover:text-white"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
