"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QuantityStepper } from "@/components/QuantityStepper";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import {
  formatCompact,
  formatCount,
  formatCountCompact,
  formatFull,
} from "@/lib/format";
import { playSound } from "@/lib/sounds";
import {
  computeItems,
  useBillionaire,
  useCart,
  useCartCount,
  useCartTotal,
  useGameStore,
  useRemainingBalance,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { useMounted } from "@/lib/useMounted";
import type { CartItem } from "@/types";

export default function CartPage() {
  const router = useRouter();
  const mounted = useMounted();
  const billionaire = useBillionaire();
  const cart = useCart();
  const cartTotal = useCartTotal();
  const cartCount = useCartCount();
  const remaining = useRemainingBalance();
  const clearCart = useGameStore((s) => s.clearCart);
  const [confirmClear, setConfirmClear] = useState(false);

  const items = useMemo(() => computeItems(cart), [cart]);

  useEffect(() => {
    if (mounted && !billionaire) router.replace("/");
  }, [mounted, billionaire, router]);

  useEffect(() => {
    router.prefetch("/checkout");
  }, [router]);

  if (!mounted || !billionaire) {
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
          Continue shopping
        </Link>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="py-6">
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-none tracking-tighter">
          Your cart
        </h1>
        <p className="tnum mt-3 text-sm text-subtle">
          {cartCount === 0
            ? "Nothing reserved yet."
            : `${formatCount(cartCount)} item${cartCount === 1 ? "" : "s"} reserved from ${billionaire.name}'s fortune.`}
        </p>
      </section>

      {items.length === 0 ? (
        <div className="surface rounded-lg px-6 py-20 text-center">
          <span className="text-4xl" aria-hidden>
            🛒
          </span>
          <p className="mt-4 text-sm text-subtle">
            An empty cart. There is a fortune to destroy.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <CartRow key={item.product.id} item={item} />
            ))}
          </ul>

          <div className="surface mt-6 rounded-lg p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-subtle">Subtotal</span>
              <span className="tnum text-2xl font-semibold tracking-tight">
                {formatFull(cartTotal)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm text-subtle">
              <span>Balance remaining</span>
              <span className="tnum">{formatFull(remaining)}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              Funds are reserved the moment an item enters your cart. Checkout
              just makes it official — and final.
            </p>

            <Link
              href="/checkout"
              className="mt-5 block rounded-lg bg-accent px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Proceed to checkout
            </Link>

            <div className="mt-2 flex gap-2">
              <Link
                href="/shop"
                className="flex-1 rounded-lg border border-line px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-canvas dark:hover:bg-white/5"
              >
                Keep shopping
              </Link>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-subtle transition-colors hover:text-red-600"
              >
                Empty cart
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Empty your cart?"
        body={`All ${formatCount(cartCount)} reserved items are released and ${formatFull(cartTotal)} returns to the balance.`}
        confirmLabel="Empty it"
        cancelLabel="Never mind"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          clearCart();
          playSound("refund");
          toast("Cart emptied. The money is back.");
        }}
      />
    </main>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const { product, quantity, lineTotal } = item;
  const remaining = useRemainingBalance();
  const addItem = useGameStore((s) => s.addItem);
  const removeItem = useGameStore((s) => s.removeItem);
  const setQuantity = useGameStore((s) => s.setQuantity);

  const affordable = remaining >= product.price;

  return (
    <li className="flex gap-4 py-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-canvas dark:bg-white/5 sm:h-24 sm:w-24">
        {product.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.photo}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-3xl" aria-hidden>
            {product.emoji}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-snug tracking-tight">
              {product.name}
            </h2>
            <p className="tnum mt-0.5 text-xs text-subtle">
              {formatFull(product.price)} each
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tnum text-sm font-semibold tracking-tight">
              {formatCompact(lineTotal)}
            </p>
            <p className="tnum text-[11px] text-subtle">{formatFull(lineTotal)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="w-32">
            <QuantityStepper
              quantity={quantity}
              canIncrement={affordable}
              onIncrement={(n) => {
                if (addItem(product.id, n).applied > 0) playSound("purchase");
              }}
              onDecrement={(n) => {
                if (removeItem(product.id, n).applied > 0) playSound("refund");
              }}
              onSetQuantity={(n) => setQuantity(product.id, n)}
              onRejected={() => playSound("error")}
              label={product.name}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              removeItem(product.id, quantity);
              playSound("refund");
              toast(`${product.name} removed (×${formatCountCompact(quantity)}).`);
            }}
            className="text-xs font-medium text-subtle transition-colors hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
