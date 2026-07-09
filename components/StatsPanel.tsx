"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import {
  formatCompact,
  formatCount,
  formatDuration,
  formatPercent,
} from "@/lib/format";
import { buildStats } from "@/lib/stats";
import {
  mergeMaps,
  useCart,
  useGameStore,
  useItemsBought,
  usePercentSpent,
  usePurchased,
  useTotalSpent,
} from "@/lib/store";

interface StatsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function StatsPanel({ open, onClose }: StatsPanelProps) {
  const cart = useCart();
  const purchased = usePurchased();
  const totalSpent = useTotalSpent();
  const itemsBought = useItemsBought();
  const percentSpent = usePercentSpent();
  const startedAt = useGameStore((s) => s.startedAt);
  const halfwayAt = useGameStore((s) => s.halfwayAt);

  // Stats span the whole run, so a checked-out Lamborghini still counts.
  const owned = useMemo(() => mergeMaps(purchased, cart), [purchased, cart]);
  const stats = useMemo(() => buildStats(totalSpent, owned), [totalSpent, owned]);
  const uniqueItems = Object.keys(owned).length;

  const timeToHalf =
    startedAt !== null && halfwayAt !== null ? halfwayAt - startedAt : null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Spending statistics"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-line bg-[var(--bg)]"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">
                What that money means
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close statistics"
                className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-canvas hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Spent" value={formatCompact(totalSpent)} />
                <MiniStat label="Of fortune" value={formatPercent(percentSpent)} />
                <MiniStat label="Items" value={formatCount(itemsBought)} />
                <MiniStat label="Product lines" value={formatCount(uniqueItems)} />
              </div>

              {timeToHalf !== null && (
                <div className="surface mt-3 rounded-lg px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">
                    Time to burn half
                  </p>
                  <p className="tnum mt-1 text-lg font-semibold tracking-tight">
                    {formatDuration(timeToHalf)}
                  </p>
                </div>
              )}

              {totalSpent === 0 ? (
                <p className="mt-8 text-sm leading-relaxed text-subtle">
                  Buy something and the arithmetic of obscenity will appear here.
                </p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {stats.map((stat) => (
                    <li key={stat.id} className="surface rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl leading-none" aria-hidden>
                          {stat.emoji}
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-snug tracking-tight">
                            {stat.headline}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-subtle">
                            {stat.detail}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface rounded-lg px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">
        {label}
      </p>
      <p className="tnum mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
