"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BillionaireCard } from "@/components/BillionaireCard";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletLoading } from "@/components/WalletLoading";
import {
  BILLIONAIRES,
  NET_WORTH_LAST_UPDATED,
  STATIC_NET_WORTHS,
} from "@/data/billionaires";
import { formatIsoDate } from "@/lib/format";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { playSound, unlockAudio } from "@/lib/sounds";
import { useGameStore, useHasPurchases } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import type { Billionaire, NetWorthResponse } from "@/types";

export default function LandingPage() {
  const router = useRouter();
  const mounted = useMounted();
  const selectBillionaire = useGameStore((s) => s.selectBillionaire);
  const hasPurchases = useHasPurchases();
  const activeBillionaireId = useGameStore((s) => s.billionaireId);

  const [netWorths, setNetWorths] = useState<Record<string, number>>(
    STATIC_NET_WORTHS,
  );
  const [lastUpdated, setLastUpdated] = useState(NET_WORTH_LAST_UPDATED);
  const [pending, setPending] = useState<Billionaire | null>(null);
  const [loadingWallet, setLoadingWallet] = useState<Billionaire | null>(null);

  // Live values when we can get them, static values when we can't. Never an error.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/networth")
      .then((r) => (r.ok ? (r.json() as Promise<NetWorthResponse>) : null))
      .then((data) => {
        if (cancelled || !data?.values) return;
        setNetWorths((current) => ({ ...current, ...data.values }));
        if (data.lastUpdated) setLastUpdated(data.lastUpdated);
      })
      .catch(() => {
        /* Static values are already on screen. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    router.prefetch("/shop");
  }, [router]);

  const begin = useCallback(
    (billionaire: Billionaire) => {
      unlockAudio();
      playSound("click");
      selectBillionaire(billionaire.id, netWorths[billionaire.id]);
      setLoadingWallet(billionaire);
    },
    [netWorths, selectBillionaire],
  );

  const onSelect = useCallback(
    (billionaire: Billionaire) => {
      // A selection always resets the run, so an in-progress cart needs a warning.
      if (hasPurchases) {
        setPending(billionaire);
        return;
      }
      begin(billionaire);
    },
    [begin, hasPurchases],
  );

  const netWorthOf = useCallback(
    (b: Billionaire) => netWorths[b.id] ?? b.netWorth,
    [netWorths],
  );

  // Sort on the values actually being displayed. The static list happens to be in
  // descending order, but live figures reshuffle the ranking — without this the
  // grid looks arbitrarily ordered the moment /api/networth returns. Broke Mode
  // is a punchline, so it stays pinned to the end regardless.
  const ordered = useMemo(
    () =>
      [...BILLIONAIRES].sort((a, b) => {
        if (a.joke !== b.joke) return a.joke ? 1 : -1;
        return netWorthOf(b) - netWorthOf(a);
      }),
    [netWorthOf],
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-5 pb-20 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="text-sm font-semibold tracking-tight">{SITE_NAME}</span>
        <nav className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-subtle transition-colors hover:text-ink dark:hover:text-white"
          >
            Leaderboard
          </Link>
          <SoundToggle />
          <ThemeToggle />
        </nav>
      </header>

      <section className="relative py-12 text-center sm:py-20">
        <div
          className="glow pointer-events-none absolute inset-x-0 top-0 h-64"
          aria-hidden
        />
        <h1 className="relative text-[clamp(2.25rem,7vw,4.25rem)] font-semibold leading-[1.05] tracking-tighter">
          {SITE_TAGLINE}
        </h1>
        <p className="relative mx-auto mt-5 max-w-md text-balance text-sm leading-relaxed text-subtle sm:text-base">
          Choose someone obscenely wealthy. Their entire net worth lands in your
          wallet. Spend every last dollar of it.
        </p>
      </section>

      {mounted && hasPurchases && activeBillionaireId && (
        <div className="mb-8 flex flex-col items-start justify-between gap-3 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 dark:bg-accent/10 sm:flex-row sm:items-center">
          <p className="text-sm">
            You have a run in progress. Picking someone new will wipe it.
          </p>
          <Link
            href="/shop"
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Resume shopping
          </Link>
        </div>
      )}

      <div className="mb-8">
        <DailyChallengeCard />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {ordered.map((billionaire, index) => (
          <BillionaireCard
            key={billionaire.id}
            billionaire={billionaire}
            netWorth={netWorthOf(billionaire)}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>

      <footer className="mt-16 border-t border-line pt-6 text-center text-xs leading-relaxed text-subtle">
        <p>
          Net worth figures last updated {formatIsoDate(lastUpdated)}. Estimates
          only, for entertainment.
        </p>
        <p className="mt-1">
          Not affiliated with anyone named above. No real money changes hands.
        </p>
        <p className="mt-1">
          Portraits from Wikimedia Commons under free licences —{" "}
          <Link href="/credits" className="text-accent hover:underline">
            image credits
          </Link>
          .
        </p>
      </footer>

      <ConfirmDialog
        open={pending !== null}
        title="Start a new run?"
        body={`This wipes your current cart and hands you ${pending?.name ?? "someone else"}'s fortune instead.`}
        confirmLabel="Wipe it"
        cancelLabel="Never mind"
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const next = pending;
          setPending(null);
          if (next) begin(next);
        }}
      />

      <AnimatePresence>
        {loadingWallet && (
          <WalletLoading
            billionaire={loadingWallet}
            netWorth={netWorthOf(loadingWallet)}
            onDone={() => router.push("/shop")}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
