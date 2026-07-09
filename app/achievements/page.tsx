"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ACHIEVEMENTS,
  MAX_XP,
  levelFor,
  type Achievement,
  type AchievementTier,
} from "@/data/achievements";
import { formatCount } from "@/lib/format";
import { useUnlocked, useXp } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<AchievementTier, string> = {
  bronze: "text-amber-700 dark:text-amber-500",
  silver: "text-slate-500 dark:text-slate-400",
  gold: "text-yellow-600 dark:text-yellow-400",
  legendary: "text-fuchsia-600 dark:text-fuchsia-400",
};

export default function AchievementsPage() {
  const mounted = useMounted();
  const xp = useXp();
  const unlocked = useUnlocked();

  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked]);
  const { current, next, progress } = levelFor(mounted ? xp : 0);

  // Secret achievements stay hidden until earned; everything else is a to-do list.
  const visible = ACHIEVEMENTS.filter(
    (a) => !a.secret || unlockedSet.has(a.id),
  );
  const earned = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-28 sm:px-8 sm:pb-20">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/shop"
          className="flex items-center gap-1.5 text-sm font-medium text-subtle transition-colors hover:text-ink dark:hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Shop
        </Link>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="surface mt-2 rounded-lg p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">
              Level {current.level}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tighter">
              {current.title}
            </h1>
          </div>
          <p className="tnum text-right text-sm text-subtle">
            <span className="text-lg font-semibold text-ink dark:text-white">
              {mounted ? formatCount(xp) : "0"}
            </span>
            <span className="block text-xs">of {formatCount(MAX_XP)} XP</span>
          </p>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="tnum mt-2 text-xs text-subtle">
          {next
            ? `${formatCount(next.from - xp)} XP to ${next.title}`
            : "Maximum level. There is nothing left to want."}
        </p>
      </section>

      <div className="mt-4">
        <DailyChallengeCard />
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Achievements</h2>
          <p className="tnum text-xs text-subtle">
            {mounted ? earned : 0} / {ACHIEVEMENTS.length}
          </p>
        </div>

        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map((achievement) => (
            <AchievementRow
              key={achievement.id}
              achievement={achievement}
              unlocked={mounted && unlockedSet.has(achievement.id)}
            />
          ))}
        </ul>

        {mounted && visible.length < ACHIEVEMENTS.length && (
          <p className="mt-4 text-center text-xs text-subtle">
            + {ACHIEVEMENTS.length - visible.length} secret achievement
            {ACHIEVEMENTS.length - visible.length === 1 ? "" : "s"}
          </p>
        )}
      </section>
    </main>
  );
}

function AchievementRow({
  achievement,
  unlocked,
}: {
  achievement: Achievement;
  unlocked: boolean;
}) {
  return (
    <li
      className={cn(
        "surface flex items-center gap-3 rounded-lg px-4 py-3 transition-opacity",
        !unlocked && "opacity-55",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg",
          unlocked ? "bg-accent-soft dark:bg-accent/15" : "bg-canvas dark:bg-white/5 grayscale",
        )}
        aria-hidden
      >
        {unlocked ? achievement.emoji : "🔒"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-tight">
          {achievement.name}
        </p>
        <p className="truncate text-xs text-subtle">{achievement.description}</p>
      </div>

      <span
        className={cn(
          "tnum shrink-0 text-xs font-semibold",
          unlocked ? TIER_STYLE[achievement.tier] : "text-subtle",
        )}
      >
        +{achievement.xp}
      </span>
    </li>
  );
}
