"use client";

import Link from "next/link";
import { ACHIEVEMENTS_BY_ID, levelFor } from "@/data/achievements";
import { formatCount } from "@/lib/format";
import { useUnlocked, useXp } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

/** The last six achievements you've earned, newest first. */
export function OrderAchievements() {
  const mounted = useMounted();
  const unlocked = useUnlocked();
  const xp = useXp();

  if (!mounted || unlocked.length === 0) return null;

  const { current, next, progress } = levelFor(xp);
  const recent = [...unlocked].reverse().slice(0, 6);

  return (
    <section className="surface rounded-lg p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium tracking-tight">
          Level {current.level} · {current.title}
        </p>
        <Link
          href="/achievements"
          className="text-xs font-medium text-accent hover:underline"
        >
          All awards →
        </Link>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="tnum mt-1.5 text-[11px] text-subtle">
        {formatCount(xp)} XP
        {next ? ` · ${formatCount(next.from - xp)} to ${next.title}` : " · maxed out"}
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {recent.map((id) => {
          const achievement = ACHIEVEMENTS_BY_ID[id];
          if (!achievement) return null;
          return (
            <li
              key={id}
              title={`${achievement.name} — ${achievement.description}`}
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium"
            >
              <span aria-hidden>{achievement.emoji}</span>
              <span className="max-w-[9rem] truncate">{achievement.name}</span>
            </li>
          );
        })}
        {unlocked.length > 6 && (
          <li className="tnum flex items-center rounded-full border border-line px-2.5 py-1 text-[11px] text-subtle">
            +{unlocked.length - 6}
          </li>
        )}
      </ul>
    </section>
  );
}
