"use client";

import Link from "next/link";
import { useCallback } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Avatar } from "@/components/Avatar";
import {
  formatCompact,
  formatCountCompact,
  formatFull,
  formatPercent,
} from "@/lib/format";
import { playSound } from "@/lib/sounds";
import {
  useBillionaire,
  useCartCount,
  useCompactBalance,
  useGameStore,
  usePercentSpent,
  useRemainingBalance,
  useTotalSpent,
} from "@/lib/store";
import { cn } from "@/lib/utils";

/** Gray until you've made a dent, then blue, orange, and finally red. */
function progressColor(percent: number): string {
  if (percent < 1) return "bg-subtle/40";
  if (percent < 25) return "bg-accent";
  if (percent < 75) return "bg-orange-500";
  return "bg-red-600";
}

interface BalanceBarProps {
  onOpenStats: () => void;
  onOpenCart: () => void;
}

export function BalanceBar({ onOpenStats, onOpenCart }: BalanceBarProps) {
  const billionaire = useBillionaire();
  const remaining = useRemainingBalance();
  const totalSpent = useTotalSpent();
  const percentSpent = usePercentSpent();
  const cartCount = useCartCount();
  const compact = useCompactBalance();
  const toggleCompact = useGameStore((s) => s.toggleCompactBalance);

  // Stable identity per mode so AnimatedNumber isn't re-subscribing every render.
  const format = compact ? formatCompact : formatFull;

  const onToggleFormat = useCallback(() => {
    playSound("click");
    toggleCompact();
  }, [toggleCompact]);

  if (!billionaire) return null;

  return (
    // Literal hexes, not var(--bg): Tailwind can't fold an opacity modifier into a CSS variable.
    <div className="sticky top-0 z-40 border-b border-line bg-[#ffffff]/85 backdrop-blur-md dark:bg-[#0a0a0a]/85">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="flex items-center justify-between gap-3 pb-2 pt-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-lg py-1 pr-2 transition-opacity hover:opacity-70"
          >
            <Avatar billionaire={billionaire} size={28} />
            <span className="truncate text-sm font-medium">
              {billionaire.name}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenStats}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-subtle transition-colors hover:bg-canvas hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"
            >
              Stats
            </button>
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
              className="relative flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-ink"
            >
              <CartIcon />
              Cart
              {cartCount > 0 && (
                <span className="tnum ml-0.5 rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-white">
                  {formatCountCompact(cartCount)}
                </span>
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleFormat}
          title="Tap to switch between full and compact numbers"
          className="block w-full pb-1 pt-1 text-left"
        >
          <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Remaining
          </span>
          {/* Fixed line height keeps the bar from resizing as digits drop away. */}
          <span className="mt-0.5 block h-[clamp(2rem,7.5vw,3.25rem)] leading-none">
            <AnimatedNumber
              value={remaining}
              format={format}
              durationSeconds={0.55}
              className={cn(
                "tnum block text-[clamp(1.75rem,6.5vw,2.9rem)] font-semibold leading-none tracking-tighter",
                remaining <= 0 && "text-red-600",
              )}
            />
          </span>
        </button>

        <div className="flex items-center justify-between gap-3 pb-2.5 pt-1.5">
          <span className="tnum truncate text-xs text-subtle">
            Spent{" "}
            <span className="font-medium text-ink dark:text-white">
              {formatCompact(totalSpent)}
            </span>
          </span>
          <span className="tnum shrink-0 text-xs font-medium text-subtle">
            {formatPercent(percentSpent)} of the fortune
          </span>
        </div>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={Math.min(100, Math.round(percentSpent))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Percent of fortune spent"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
              progressColor(percentSpent),
            )}
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          />
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 3h2.2l2.1 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L19.6 7H5.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
