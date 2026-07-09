"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BOARDS,
  MAX_ENTRIES,
  leaderboard,
  rankBy,
  type BoardId,
} from "@/lib/leaderboard";
import {
  formatCompact,
  formatCount,
  formatDate,
  formatDuration,
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [board, setBoard] = useState<BoardId>("spent");
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(() => {
    void leaderboard.getEntries().then(setEntries);
  }, []);

  useEffect(load, [load]);

  const ranked = useMemo(
    () => (entries ? rankBy(entries, board).slice(0, MAX_ENTRIES) : []),
    [entries, board],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-28 sm:px-8 sm:pb-20">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-subtle transition-colors hover:text-ink dark:hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5m0 0 6-6m-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="py-8 text-center sm:py-12">
        <h1 className="text-[clamp(2rem,6vw,3rem)] font-semibold leading-none tracking-tighter">
          Leaderboard
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-balance text-sm leading-relaxed text-subtle">
          Your top {MAX_ENTRIES} runs, saved on this device. Clearing your
          browser data clears these.
        </p>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBoard(b.id)}
            aria-pressed={board === b.id}
            className={cn(
              "shrink-0 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors",
              board === b.id
                ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink"
                : "border-line text-subtle hover:text-ink dark:hover:text-white",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      <p className="mt-2.5 text-xs text-subtle">
        {BOARDS.find((b) => b.id === board)?.blurb}
      </p>

      <div className="mt-5">
        {entries === null ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-line" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <EmptyState board={board} />
        ) : (
          <ol className="space-y-2">
            {ranked.map((entry, index) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className={cn(
                  "surface flex items-center gap-3 rounded-lg px-4 py-3",
                  index === 0 && "border-accent/40",
                )}
              >
                <span className="tnum w-8 shrink-0 text-center text-lg">
                  {MEDALS[index] ?? (
                    <span className="text-sm font-medium text-subtle">
                      {index + 1}
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {entry.nickname}
                  </p>
                  <p className="truncate text-xs text-subtle">
                    {entry.billionaireName} · {formatDate(entry.createdAt)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="tnum text-sm font-semibold tracking-tight">
                    {primaryValue(entry, board)}
                  </p>
                  <p className="tnum text-xs text-subtle">
                    {secondaryValue(entry, board)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </div>

      {entries !== null && entries.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-xs font-medium text-subtle transition-colors hover:text-red-600"
          >
            Clear leaderboard
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear the leaderboard?"
        body="Every saved run on this device is deleted. There's no undo."
        confirmLabel="Delete everything"
        cancelLabel="Never mind"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void leaderboard.clear().then(load);
        }}
      />
    </main>
  );
}

function primaryValue(entry: LeaderboardEntry, board: BoardId): string {
  switch (board) {
    case "spent":
      return formatCompact(entry.totalSpent);
    case "items":
      return formatCount(entry.itemsBought);
    case "speed":
      return entry.timeToHalfMs === null ? "—" : formatDuration(entry.timeToHalfMs);
  }
}

function secondaryValue(entry: LeaderboardEntry, board: BoardId): string {
  switch (board) {
    case "spent":
      return `${formatPercent(entry.percentSpent)} of the fortune`;
    case "items":
      return `${entry.uniqueItems} product lines`;
    case "speed":
      return formatCompact(entry.totalSpent);
  }
}

function EmptyState({ board }: { board: BoardId }) {
  const message =
    board === "speed"
      ? "No run here has spent half a fortune yet. Get greedier."
      : "Nothing saved yet. Finish a spree and save it from the receipt.";

  return (
    <div className="surface rounded-lg px-6 py-16 text-center">
      <p className="text-sm text-subtle">{message}</p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Pick a fortune
      </Link>
    </div>
  );
}
