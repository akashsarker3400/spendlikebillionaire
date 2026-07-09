"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OrderAchievements } from "@/components/OrderAchievements";
import { Receipt } from "@/components/Receipt";
import { SoundToggle } from "@/components/SoundToggle";
import { StatsPanel } from "@/components/StatsPanel";
import { ShareStudio } from "@/components/ShareStudio";
import { ThemeToggle } from "@/components/ThemeToggle";
import { burstConfetti } from "@/lib/confetti";
import { leaderboard } from "@/lib/leaderboard";
import { SITE_NAME } from "@/lib/site";
import { playSound } from "@/lib/sounds";
import {
  computeItems,
  mergeMaps,
  useBillionaire,
  useCart,
  useNickname,
  useGameStore,
  useItemsBought,
  useLastOrder,
  usePercentSpent,
  usePurchased,
  useRemainingBalance,
  useStartingBalance,
  useTotalSpent,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { useMounted } from "@/lib/useMounted";
import { uid } from "@/lib/utils";

export default function OrderPage() {
  const router = useRouter();
  const mounted = useMounted();

  const billionaire = useBillionaire();
  const order = useLastOrder();
  const totalSpent = useTotalSpent();
  const remaining = useRemainingBalance();
  const startingBalance = useStartingBalance();
  const percentSpent = usePercentSpent();
  const itemsBought = useItemsBought();
  const startedAt = useGameStore((s) => s.startedAt);
  const halfwayAt = useGameStore((s) => s.halfwayAt);
  const savedToLeaderboard = useGameStore((s) => s.savedToLeaderboard);
  const storedNickname = useNickname();
  const markSaved = useGameStore((s) => s.markSavedToLeaderboard);
  const reset = useGameStore((s) => s.reset);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [nickname, setNickname] = useState("");

  const cart = useCart();
  const purchased = usePurchased();

  const items = useMemo(() => (order ? computeItems(order.items) : []), [order]);

  // The shared haul is the whole run, not just this order — that's the score
  // someone else will be trying to beat.
  const haul = useMemo(
    () => ({
      billionaireId: billionaire?.id ?? "",
      startingBalance,
      items: mergeMaps(purchased, cart),
      spent: totalSpent,
      createdAt: Date.now(),
    }),
    [billionaire?.id, startingBalance, purchased, cart, totalSpent],
  );

  useEffect(() => setIssuedAt(Date.now()), []);

  // No order placed yet? There's nothing to confirm.
  useEffect(() => {
    if (!mounted) return;
    if (!billionaire) router.replace("/");
    else if (!order) router.replace("/cart");
  }, [mounted, billionaire, order, router]);

  const celebrated = useRef(false);
  useEffect(() => {
    if (!mounted || !order || celebrated.current) return;
    celebrated.current = true;
    void burstConfetti(0.5);
  }, [mounted, order]);

  const renderPng = useCallback(async (): Promise<Blob | null> => {
    const node = receiptRef.current;
    if (!node) return null;
    const { toBlob } = await import("html-to-image");
    return toBlob(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      skipFonts: true,
    });
  }, []);

  const onShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await renderPng();
      if (!blob) throw new Error("Nothing to render");

      const file = new File([blob], "receipt.png", { type: "image/png" });
      const shareData = {
        files: [file],
        title: SITE_NAME,
        text: `I spent ${Math.round(percentSpent)}% of ${billionaire?.name}'s fortune.`,
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        playSound("purchase");
        return;
      }
      downloadBlob(blob);
      playSound("purchase");
      toast("Receipt saved to your downloads.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Couldn't generate the image. Try the download button.", "error");
    } finally {
      setBusy(false);
    }
  }, [billionaire?.name, busy, percentSpent, renderPng]);

  const onDownload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await renderPng();
      if (!blob) throw new Error("Nothing to render");
      downloadBlob(blob);
      playSound("purchase");
    } catch {
      toast("Couldn't generate the image.", "error");
    } finally {
      setBusy(false);
    }
  }, [busy, renderPng]);

  const onSaveToLeaderboard = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = nickname.trim().slice(0, 20);
      if (!name || !billionaire) return;

      const purchased = useGameStore.getState().purchased;

      await leaderboard.addEntry({
        id: uid(),
        nickname: name,
        billionaireId: billionaire.id,
        billionaireName: billionaire.name,
        startingBalance,
        totalSpent,
        percentSpent,
        itemsBought,
        uniqueItems: Object.keys(purchased).length,
        timeToHalfMs:
          startedAt !== null && halfwayAt !== null ? halfwayAt - startedAt : null,
        createdAt: Date.now(),
      });

      markSaved();
      playSound("milestone");
      toast("Run saved to the leaderboard.", "celebrate");
    },
    [
      billionaire,
      halfwayAt,
      itemsBought,
      markSaved,
      nickname,
      percentSpent,
      startedAt,
      startingBalance,
      totalSpent,
    ],
  );

  if (!mounted || !billionaire || !order || issuedAt === null) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-[380px] place-items-center px-5">
        <div className="h-[560px] w-full animate-pulse rounded-lg bg-line" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 sm:px-8 sm:pb-20">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/shop"
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
          Keep shopping
        </Link>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="pb-8 text-center">
        <span className="text-4xl" role="img" aria-label="Package">
          📦
        </span>
        <h1 className="mt-4 text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-none tracking-tighter">
          Order placed
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-balance text-sm leading-relaxed text-subtle">
          Order #{String(order.number).padStart(4, "0")} is on its way. Delivery
          in 2–5 business days, or whenever the helicopter is free.
        </p>
      </section>

      <Receipt
        ref={receiptRef}
        billionaire={billionaire}
        items={items}
        orderNumber={order.number}
        orderTotal={order.total}
        totalSpent={totalSpent}
        remainingBalance={remaining}
        startingBalance={startingBalance}
        percentSpent={percentSpent}
        itemsBought={itemsBought}
        issuedAt={issuedAt}
      />

      <div className="mx-auto mt-8 flex w-full max-w-[380px] flex-col gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="rounded-lg bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Share your haul
        </button>
        <p className="text-center text-[11px] leading-relaxed text-subtle">
          Post the image, or send the link so they can steal your haul.
        </p>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onShare}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-2.5 text-xs font-medium transition-colors hover:bg-canvas disabled:opacity-60 dark:hover:bg-white/5"
          >
            {busy ? "…" : "Share PNG"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-2.5 text-xs font-medium transition-colors hover:bg-canvas disabled:opacity-60 dark:hover:bg-white/5"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="rounded-lg border border-line px-3 py-2.5 text-xs font-medium transition-colors hover:bg-canvas dark:hover:bg-white/5"
          >
            Stats
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-[380px]">
        <OrderAchievements />
      </div>

      <section className="mx-auto mt-10 w-full max-w-[380px]">
        {savedToLeaderboard ? (
          <div className="surface rounded-lg px-4 py-4 text-center">
            <p className="text-sm font-medium">This run is on the leaderboard.</p>
            <Link
              href="/leaderboard"
              className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
            >
              See where you landed →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSaveToLeaderboard} className="surface rounded-lg p-4">
            <label htmlFor="nickname" className="text-sm font-medium tracking-tight">
              Put this run on the leaderboard
            </label>
            <p className="mt-1 text-xs leading-relaxed text-subtle">
              Stored on this device only. Nothing leaves your browser.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="Nickname for the leaderboard"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
              />
              <button
                type="submit"
                disabled={nickname.trim().length === 0}
                className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-ink"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="mx-auto mt-6 flex w-full max-w-[380px] flex-col gap-2 sm:flex-row">
        <Link
          href="/shop"
          className="flex-1 rounded-lg border border-line px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-canvas dark:hover:bg-white/5"
        >
          Keep shopping
        </Link>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          Start over
        </button>
      </div>

      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
      <ShareStudio
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        billionaire={billionaire}
        haul={haul}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Start over?"
        body="Your orders and cart are wiped and you pick a new fortune. Anything you saved to the leaderboard stays there."
        confirmLabel="Wipe it"
        cancelLabel="Never mind"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          router.push("/");
        }}
      />
    </main>
  );
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "spend-like-a-billionaire-receipt.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously cancels the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
