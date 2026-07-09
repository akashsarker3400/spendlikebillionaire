"use client";

import { motion, useReducedMotion } from "framer-motion";
import { memo, useCallback, useRef, useState } from "react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { PRICE_BASIS_LABEL } from "@/data/products";
import {
  formatCompact,
  formatCount,
  formatCountCompact,
  formatFull,
} from "@/lib/format";
import { playSound } from "@/lib/sounds";
import { toast } from "@/lib/toast";
import {
  useGameStore,
  useOwned,
  useQuantity,
  useRemainingBalance,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index: number;
}

const PRICE_BASIS_TITLE: Record<Product["priceBasis"], string> = {
  msrp: "Manufacturer's list price",
  avg: "Published average or real reported price",
  estimate: "An estimate. This isn't really for sale.",
};

function ProductCardImpl({ product, index }: ProductCardProps) {
  const reduceMotion = useReducedMotion();
  const quantity = useQuantity(product.id);
  const owned = useOwned(product.id);
  const remaining = useRemainingBalance();
  const addItem = useGameStore((s) => s.addItem);
  const removeItem = useGameStore((s) => s.removeItem);
  const setQuantity = useGameStore((s) => s.setQuantity);

  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<number | null>(null);

  const affordable = remaining >= product.price;
  const compactPrice = formatCompact(product.price);
  const fullPrice = formatFull(product.price);

  const shake = useCallback(() => {
    playSound("error");
    if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = window.setTimeout(() => setShaking(false), 380);
  }, []);

  const onIncrement = useCallback(
    (amount: number) => {
      const result = addItem(product.id, amount);
      if (result.applied <= 0) {
        shake();
        return;
      }
      playSound("purchase");
    },
    [addItem, product.id, shake],
  );

  const onDecrement = useCallback(
    (amount: number) => {
      const result = removeItem(product.id, amount);
      if (result.applied > 0) playSound("refund");
    },
    [product.id, removeItem],
  );

  const onSetQuantity = useCallback(
    (target: number) => {
      // The cart quantity, not `owned` — that's what's already been checked out.
      const inCart = useGameStore.getState().cart[product.id] ?? 0;
      const result = setQuantity(product.id, target);

      if (target > inCart && result.clamped) {
        const affordableNow = result.maxAffordable;
        toast(
          affordableNow > 0
            ? `You can only afford ${formatCount(affordableNow)} more of these.`
            : `You can't afford another ${product.name}.`,
          "error",
        );
        shake();
        if (result.applied > 0) playSound("purchase");
        return;
      }

      if (result.applied > 0) {
        playSound(target > inCart ? "purchase" : "refund");
      }
    },
    [product.id, product.name, setQuantity, shake],
  );

  return (
    // No `layout` prop: framer would write an inline transform on all 58 cards,
    // which fights the CSS shake animation and janks on every re-sort.
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.015, 0.24),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "surface relative flex flex-col rounded-lg p-3.5 transition-shadow sm:p-4",
        quantity > 0 && "border-accent/40",
        !affordable && quantity === 0 && "opacity-50",
        !reduceMotion && "hover:shadow-lift",
        shaking && "animate-shake",
      )}
    >
      {quantity > 0 && (
        <span className="tnum absolute -right-1.5 -top-1.5 z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white shadow-card">
          ×{formatCountCompact(quantity)}
        </span>
      )}

      <div className="relative">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-canvas dark:bg-white/5">
          {product.photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.photo}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            /* Some things can't be photographed. You cannot take a picture of a
               "Private Space Program" or "Clean Water for a Nation". */
            <span
              className="grid h-full w-full place-items-center text-4xl sm:text-5xl"
              role="img"
              aria-label={product.name}
            >
              {product.emoji}
            </span>
          )}
        </div>
        {!affordable && (
          <span className="absolute right-1.5 top-1.5 rounded bg-[var(--card)]/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle backdrop-blur-sm">
            Can&apos;t afford
          </span>
        )}
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-snug tracking-tight">
        {product.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-subtle">
        {product.description}
      </p>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tnum text-base font-semibold tracking-tight">
          {compactPrice}
        </span>
        {fullPrice !== compactPrice && (
          <span className="tnum truncate text-[11px] text-subtle">
            {fullPrice}
          </span>
        )}
        <span
          className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-subtle/70"
          title={PRICE_BASIS_TITLE[product.priceBasis]}
        >
          {PRICE_BASIS_LABEL[product.priceBasis]}
        </span>
      </div>

      {owned > 0 && (
        <p className="tnum mt-2 text-[11px] font-medium text-subtle">
          {formatCountCompact(owned)} already delivered
        </p>
      )}

      <div className="mt-3.5">
        {quantity === 0 ? (
          <button
            type="button"
            // aria-disabled, not disabled: an unaffordable tap must still reach
            // the handler so the card can shake and buzz at you.
            aria-disabled={!affordable}
            onClick={() => (affordable ? onIncrement(1) : shake())}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              affordable
                ? "border-line hover:border-accent hover:bg-accent-soft hover:text-accent dark:hover:bg-accent/10"
                : "cursor-not-allowed border-line text-subtle/50",
            )}
          >
            {affordable ? "Add to cart" : "Can't afford"}
          </button>
        ) : (
          <QuantityStepper
            quantity={quantity}
            canIncrement={affordable}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onSetQuantity={onSetQuantity}
            onRejected={shake}
            label={product.name}
          />
        )}
      </div>
    </motion.div>
  );
}

export const ProductCard = memo(ProductCardImpl);
