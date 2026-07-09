"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { formatCompact, formatCount, formatFull } from "@/lib/format";
import { playSound } from "@/lib/sounds";
import {
  computeItems,
  useCart,
  useCartCount,
  useCartTotal,
  useGameStore,
  useRemainingBalance,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const cart = useCart();
  const cartTotal = useCartTotal();
  const cartCount = useCartCount();
  const remaining = useRemainingBalance();
  const clearCart = useGameStore((s) => s.clearCart);

  const items = useMemo(() => computeItems(cart), [cart]);

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
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-[var(--bg)]"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">
                Your cart{" "}
                <span className="tnum font-normal text-subtle">
                  ({formatCount(cartCount)})
                </span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close cart"
                className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-canvas hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="text-4xl" aria-hidden>
                  🛒
                </span>
                <p className="text-sm text-subtle">
                  Your cart is empty. There is a fortune to destroy.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Start shopping
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {items.map((item) => (
                    <CartRow key={item.product.id} item={item} />
                  ))}
                </ul>

                <footer className="border-t border-line px-5 py-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-subtle">Subtotal</span>
                    <span className="tnum text-lg font-semibold tracking-tight">
                      {formatCompact(cartTotal)}
                    </span>
                  </div>
                  <p className="tnum mt-0.5 text-right text-[11px] text-subtle">
                    {formatFull(cartTotal)}
                  </p>

                  {/* The reserve already left the balance, so this is what's
                      left right now — not a projection. */}
                  <div className="mt-2 flex items-baseline justify-between text-xs text-subtle">
                    <span>Balance remaining</span>
                    <span className="tnum">{formatCompact(remaining)}</span>
                  </div>

                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="mt-4 block rounded-lg bg-accent px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                  >
                    Checkout
                  </Link>

                  <div className="mt-2 flex gap-2">
                    <Link
                      href="/cart"
                      onClick={onClose}
                      className="flex-1 rounded-lg border border-line px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-canvas dark:hover:bg-white/5"
                    >
                      View cart
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearCart();
                        playSound("refund");
                        toast("Cart emptied. The money is back.");
                      }}
                      className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-subtle transition-colors hover:text-red-600"
                    >
                      Empty cart
                    </button>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CartRow({ item }: { item: ReturnType<typeof computeItems>[number] }) {
  const { product, quantity, lineTotal } = item;
  const remaining = useRemainingBalance();
  const addItem = useGameStore((s) => s.addItem);
  const removeItem = useGameStore((s) => s.removeItem);
  const setQuantity = useGameStore((s) => s.setQuantity);

  const affordable = remaining >= product.price;

  return (
    <li className="flex gap-3 py-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-canvas dark:bg-white/5">
        {product.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.photo}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-2xl" aria-hidden>
            {product.emoji}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm font-medium leading-snug tracking-tight">
            {product.name}
          </p>
          <p className="tnum shrink-0 text-sm font-semibold tracking-tight">
            {formatCompact(lineTotal)}
          </p>
        </div>
        <p className="tnum mt-0.5 text-xs text-subtle">
          {formatCount(quantity)} × {formatFull(product.price)}
        </p>

        <div className="mt-2 flex items-center gap-2">
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
            }}
            className={cn(
              "text-xs font-medium text-subtle transition-colors hover:text-red-600",
            )}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
