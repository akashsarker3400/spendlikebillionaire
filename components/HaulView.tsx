"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getBillionaire } from "@/data/billionaires";
import { PRODUCTS_BY_ID } from "@/data/products";
import { burstConfetti } from "@/lib/confetti";
import {
  formatCompact,
  formatCount,
  formatCountCompact,
  formatFull,
  formatPercent,
} from "@/lib/format";
import { haulItemCount, haulPercent, type Haul } from "@/lib/haul";
import { playSound, unlockAudio } from "@/lib/sounds";
import { useGameStore, useHasPurchases } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useMounted } from "@/lib/useMounted";

interface HaulViewProps {
  haul: Haul;
  code: string;
}

type PendingAction = "steal" | "beat" | null;

export function HaulView({ haul, code }: HaulViewProps) {
  const router = useRouter();
  const mounted = useMounted();
  const hasRun = useHasPurchases();
  const stealHaul = useGameStore((s) => s.stealHaul);
  const startChallenge = useGameStore((s) => s.startChallenge);

  const [pending, setPending] = useState<PendingAction>(null);

  const billionaire = getBillionaire(haul.billionaireId);
  const percent = haulPercent(haul);
  const itemCount = haulItemCount(haul.items);
  const who = haul.nickname || "Someone";

  const lines = Object.entries(haul.items)
    .flatMap(([id, qty]) => {
      const product = PRODUCTS_BY_ID[id];
      return product ? [{ product, qty, lineTotal: product.price * qty }] : [];
    })
    .sort((a, b) => b.lineTotal - a.lineTotal);

  const runSteal = useCallback(() => {
    unlockAudio();
    const { applied, dropped } = stealHaul(haul);
    playSound("purchase");
    void burstConfetti(0.4);
    if (dropped > 0) {
      toast(
        `Prices moved. ${formatCount(applied)} items copied, ${formatCount(dropped)} wouldn't fit.`,
      );
    } else {
      toast(`Haul stolen. ${formatCount(applied)} items in your cart.`, "celebrate");
    }
    router.push("/cart");
  }, [haul, router, stealHaul]);

  const runBeat = useCallback(() => {
    unlockAudio();
    startChallenge(haul, code);
    playSound("milestone");
    toast(`Beat ${who}: spend more than ${formatCompact(haul.spent)}.`, "celebrate");
    router.push("/shop");
  }, [code, haul, startChallenge, who, router]);

  const request = (action: Exclude<PendingAction, null>) => {
    // Both actions wipe whatever run is in progress.
    if (mounted && hasRun) {
      setPending(action);
      return;
    }
    action === "steal" ? runSteal() : runBeat();
  };

  if (!billionaire) return null;

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-24 sm:px-8">
      <header className="py-6 text-center">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Spend Like a Billionaire
        </Link>
      </header>

      <section className="surface overflow-hidden rounded-2xl">
        <div className="relative border-b border-line px-6 py-8 text-center">
          <div className="glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex flex-col items-center">
            <Avatar billionaire={billionaire} size={64} />
            <p className="mt-4 text-sm text-subtle">
              <span className="font-semibold text-ink dark:text-white">{who}</span>{" "}
              spent
            </p>
            <p className="tnum mt-1 text-[clamp(2rem,10vw,3rem)] font-semibold leading-none tracking-tighter">
              {formatCompact(haul.spent)}
            </p>
            <p className="tnum mt-2 text-sm text-subtle">
              of {billionaire.name}&apos;s {formatCompact(haul.startingBalance)} ·{" "}
              <span className="font-semibold text-ink dark:text-white">
                {formatPercent(percent)}
              </span>
            </p>

            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-red-600"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {lines.slice(0, 6).map(({ product, qty, lineTotal }) => (
            <li key={product.id} className="flex items-center gap-3 px-5 py-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-canvas dark:bg-white/5">
                {product.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={product.photo}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-lg" aria-hidden>
                    {product.emoji}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tracking-tight">
                  {product.name}
                </p>
                <p className="tnum text-xs text-subtle">
                  ×{formatCountCompact(qty)}
                </p>
              </div>
              <p className="tnum shrink-0 text-sm font-semibold tracking-tight">
                {formatCompact(lineTotal)}
              </p>
            </li>
          ))}
          {lines.length > 6 && (
            <li className="px-5 py-3 text-center text-xs text-subtle">
              + {lines.length - 6} more product
              {lines.length - 6 === 1 ? "" : "s"}
            </li>
          )}
          {lines.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-subtle">
              They bought absolutely nothing. Bold.
            </li>
          )}
        </ul>

        <div className="border-t border-line px-5 py-3">
          <p className="tnum text-center text-xs text-subtle">
            {formatCount(itemCount)} items · {formatFull(haul.spent)}
          </p>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => request("beat")}
          className="w-full rounded-lg bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Beat {who}
        </button>
        <button
          type="button"
          onClick={() => request("steal")}
          className="w-full rounded-lg border border-line px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-canvas dark:hover:bg-white/5"
        >
          Steal this haul
        </button>
        <Link
          href="/"
          className="mt-1 rounded-lg px-5 py-2.5 text-center text-sm font-medium text-subtle transition-colors hover:text-ink dark:hover:text-white"
        >
          Pick my own fortune
        </Link>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-subtle">
        &ldquo;Steal&rdquo; copies their cart to yours at today&apos;s prices.
        &ldquo;Beat&rdquo; gives you the same fortune and a score to pass.
      </p>

      <ConfirmDialog
        open={pending !== null}
        title="Wipe your current run?"
        body={
          pending === "steal"
            ? "Your cart and orders are cleared, then their haul is copied into your cart."
            : `Your cart and orders are cleared, then you start fresh against ${who}'s score.`
        }
        confirmLabel="Wipe it"
        cancelLabel="Never mind"
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          if (action === "steal") runSteal();
          else if (action === "beat") runBeat();
        }}
      />
    </main>
  );
}
