"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatCompact, formatCount, formatFull, formatPercent } from "@/lib/format";
import { playSound } from "@/lib/sounds";
import {
  computeItems,
  useBillionaire,
  useCart,
  useCartCount,
  useCartTotal,
  useGameStore,
  usePercentSpent,
  useRemainingBalance,
  useStartingBalance,
} from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();

  const billionaire = useBillionaire();
  const cart = useCart();
  const cartTotal = useCartTotal();
  const cartCount = useCartCount();
  const remaining = useRemainingBalance();
  const startingBalance = useStartingBalance();
  const percentSpent = usePercentSpent();
  const placeOrder = useGameStore((s) => s.placeOrder);

  const [placing, setPlacing] = useState(false);
  const items = useMemo(() => computeItems(cart), [cart]);

  useEffect(() => {
    if (!mounted) return;
    if (!billionaire) router.replace("/");
    // An empty cart has nothing to check out. Don't strand the user on a dead page.
    else if (items.length === 0 && !placing) router.replace("/cart");
  }, [mounted, billionaire, items.length, placing, router]);

  useEffect(() => {
    router.prefetch("/order");
  }, [router]);

  const onPlaceOrder = useCallback(() => {
    if (placing) return;
    setPlacing(true);
    const order = placeOrder();
    if (!order) {
      setPlacing(false);
      return;
    }
    playSound("milestone");
    router.push("/order");
  }, [placeOrder, placing, router]);

  if (!mounted || !billionaire || items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <div className="h-96 w-full animate-pulse rounded-lg bg-line" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-28 sm:px-8 sm:pb-24">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/cart"
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
          Back to cart
        </Link>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="py-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
          Step 2 of 2
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-none tracking-tighter">
          Checkout
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-subtle">
          Review your order. Once placed, there are no refunds — the money left{" "}
          {billionaire.name}&apos;s account the moment you added these to the cart.
        </p>
      </section>

      <section className="surface rounded-lg">
        <h2 className="border-b border-line px-5 py-3 text-sm font-semibold tracking-tight">
          Order summary{" "}
          <span className="tnum font-normal text-subtle">
            ({formatCount(cartCount)} item{cartCount === 1 ? "" : "s"})
          </span>
        </h2>

        <ul className="divide-y divide-line px-5">
          {items.map((item) => (
            <li key={item.product.id} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-canvas dark:bg-white/5">
                {item.product.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.product.photo}
                    alt={item.product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-xl" aria-hidden>
                    {item.product.emoji}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tracking-tight">
                  {item.product.name}
                </p>
                <p className="tnum text-xs text-subtle">
                  {formatCount(item.quantity)} × {formatFull(item.product.price)}
                </p>
              </div>
              <p className="tnum shrink-0 text-sm font-semibold tracking-tight">
                {formatFull(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
          <Row label="Subtotal" value={formatFull(cartTotal)} />
          <Row label="Shipping" value="Free (you own the plane)" muted />
          <Row label="Tax" value="LOL" muted />
          <div className="!mt-3 border-t border-dashed border-line pt-3">
            <div className="flex items-baseline justify-between">
              <dt className="text-base font-semibold tracking-tight">Total</dt>
              <dd className="tnum text-2xl font-semibold tracking-tight">
                {formatFull(cartTotal)}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <section className="surface mt-4 rounded-lg px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">Paying with</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded bg-ink text-lg dark:bg-white/10">
            💳
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{billionaire.name}&apos;s money</p>
            <p className="tnum text-xs text-subtle">
              {formatCompact(startingBalance)} opening balance ·{" "}
              {formatPercent(percentSpent)} already gone
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={placing}
          className="w-full rounded-lg bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {placing ? "Placing order…" : `Place order · ${formatCompact(cartTotal)}`}
        </button>
        {/* Not "balance after this order" — the funds were reserved on add, so
            placing the order doesn't move this number at all. */}
        <p className="tnum mt-3 text-center text-xs text-subtle">
          Balance remaining: {formatFull(remaining)} · already reserved
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-subtle">{label}</dt>
      <dd className={muted ? "text-subtle" : "tnum font-medium"}>{value}</dd>
    </div>
  );
}
