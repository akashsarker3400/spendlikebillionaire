"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { MILESTONE_MESSAGES } from "@/data/headlines";
import { burstConfetti } from "@/lib/confetti";
import {
  formatCompact,
  formatCount,
  formatFull,
  formatPercent,
} from "@/lib/format";
import { playSound } from "@/lib/sounds";
import {
  useBillionaire,
  useCartCount,
  useGameStore,
  useIsFortuneDestroyed,
  useItemsBought,
  useOrders,
  usePercentSpent,
  useRemainingBalance,
  useTotalSpent,
} from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

/**
 * Fires when nothing on the shelf is affordable any more — which is as close to
 * "$0" as integer prices allow.
 */
export function FortuneDestroyed() {
  const mounted = useMounted();
  const destroyed = useIsFortuneDestroyed();
  const seen = useGameStore((s) => s.destroyedSeen);
  const markSeen = useGameStore((s) => s.markDestroyedSeen);

  const billionaire = useBillionaire();
  const cartCount = useCartCount();
  const orderCount = useOrders().length;
  const totalSpent = useTotalSpent();
  const remaining = useRemainingBalance();
  const itemsBought = useItemsBought();
  const percentSpent = usePercentSpent();

  const open = mounted && destroyed && !seen;

  useEffect(() => {
    if (!open) return;
    playSound("milestone");
    void burstConfetti(1);
  }, [open]);

  // The fortune usually runs out with items still sitting in the cart, so the
  // primary action is to finish checking out — not to view an order that may
  // not exist yet.
  const ctaHref = cartCount > 0 ? "/checkout" : orderCount > 0 ? "/order" : "/shop";
  const ctaLabel =
    cartCount > 0
      ? "Check out"
      : orderCount > 0
        ? "See the receipt"
        : "Back to the shop";

  if (!billionaire) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)]"
        >
          <div className="glow pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
            <motion.span
              initial={{ scale: 0.5, rotate: -14 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="text-6xl"
              role="img"
              aria-label="Party popper"
            >
              🎉
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4 }}
              className="mt-6 text-[clamp(2rem,8vw,3.25rem)] font-semibold leading-none tracking-tighter"
            >
              Fortune destroyed
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-4 max-w-sm text-balance text-sm leading-relaxed text-subtle"
            >
              {MILESTONE_MESSAGES[100]}
            </motion.p>

            <motion.dl
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-10 grid w-full grid-cols-2 gap-3"
            >
              <Stat label="Spent" value={formatCompact(totalSpent)} />
              <Stat label="Of the fortune" value={formatPercent(percentSpent)} />
              <Stat label="Items bought" value={formatCount(itemsBought)} />
              <Stat label="Left over" value={formatFull(remaining)} />
            </motion.dl>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center"
            >
              <Link
                href={ctaHref}
                onClick={markSeen}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                {ctaLabel}
              </Link>
              <button
                type="button"
                onClick={markSeen}
                className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-canvas dark:hover:bg-white/5"
              >
                Admire the wreckage
              </button>
            </motion.div>

            <p className="mt-8 text-xs text-subtle">
              {billionaire.name} has {formatFull(remaining)} to their name. Not
              enough for a Big Mac.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface rounded-lg px-4 py-3 text-left">
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">
        {label}
      </dt>
      <dd className="tnum mt-1 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
