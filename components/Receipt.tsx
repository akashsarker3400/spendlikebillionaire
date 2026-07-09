"use client";

import { forwardRef } from "react";
import { pickHeadline } from "@/data/headlines";
import { CHEAPEST_PRICE } from "@/data/products";
import {
  formatCount,
  formatDate,
  formatFull,
  formatPercent,
} from "@/lib/format";
import { SITE_NAME, SITE_WATERMARK } from "@/lib/site";
import type { Billionaire, CartItem } from "@/types";

interface ReceiptProps {
  billionaire: Billionaire;
  /** Line items for this order only. */
  items: CartItem[];
  orderNumber: number;
  /** This order's total. */
  orderTotal: number;
  /** Everything spent across the whole run, including previous orders. */
  totalSpent: number;
  remainingBalance: number;
  startingBalance: number;
  percentSpent: number;
  /** Items bought across the whole run. */
  itemsBought: number;
  /** Passed in rather than read from `Date.now()` so the render is deterministic. */
  issuedAt: number;
}

/**
 * Deliberately styled in fixed light colours and a system monospace stack: this
 * node gets rasterised by html-to-image, where CSS variables resolve
 * unpredictably and a webfont may not have loaded into the cloned document.
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  function Receipt(props, ref) {
    const {
      billionaire,
      items,
      orderNumber,
      orderTotal,
      totalSpent,
      remainingBalance,
      startingBalance,
      percentSpent,
      itemsBought,
      issuedAt,
    } = props;

    const isDestroyed = remainingBalance < CHEAPEST_PRICE;
    const orderItemCount = items.reduce((n, i) => n + i.quantity, 0);
    const hasEarlierOrders = totalSpent > orderTotal;

    const headline = pickHeadline({
      billionaireName: billionaire.name,
      totalSpent,
      remainingBalance,
      percentSpent,
      isJoke: billionaire.joke ?? false,
      isDestroyed,
    });

    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[380px] font-mono text-[#171717]"
      >
        <div className="receipt-tear-top" />

        <div className="receipt-paper px-6 pb-7 pt-6 shadow-lift">
          <header className="text-center">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.22em]">
              {SITE_NAME}
            </h2>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#8a8a8a]">
              Order Confirmation
            </p>
          </header>

          <Divider />

          <Row label="ORDER" value={`#${String(orderNumber).padStart(4, "0")}`} />
          <Row label="CUSTOMER" value={billionaire.name.toUpperCase()} />
          <Row label="DATE" value={formatDate(issuedAt).toUpperCase()} />
          <Row label="OPENING BALANCE" value={formatFull(startingBalance)} />

          <Divider />

          {items.length === 0 ? (
            <p className="py-6 text-center text-[11px] uppercase tracking-wider text-[#8a8a8a]">
              No items purchased
            </p>
          ) : (
            <ul className="space-y-2.5 py-1">
              {items.map((item) => (
                <li key={item.product.id}>
                  <div className="flex items-baseline justify-between gap-3 text-[11px] leading-tight">
                    <span className="min-w-0 flex-1 break-words uppercase">
                      {item.product.name}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatFull(item.lineTotal)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] tabular-nums text-[#8a8a8a]">
                    {formatCount(item.quantity)} × {formatFull(item.product.price)}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Divider />

          <Row
            label={`ITEMS (${formatCount(orderItemCount)})`}
            value={formatFull(orderTotal)}
          />
          <Row label="SHIPPING" value="FREE" />
          <Row label="TAX" value="LOL" />

          <div className="my-3 border-t-2 border-dashed border-[#171717]" />

          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
              Order Total
            </span>
            <span className="text-[15px] font-bold tabular-nums">
              {formatFull(orderTotal)}
            </span>
          </div>

          {hasEarlierOrders && (
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">
                Spent this run ({formatCount(itemsBought)} items)
              </span>
              <span className="text-[11px] font-semibold tabular-nums">
                {formatFull(totalSpent)}
              </span>
            </div>
          )}

          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
              Remaining
            </span>
            <span className="text-[15px] font-bold tabular-nums">
              {formatFull(remainingBalance)}
            </span>
          </div>

          <Divider />

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8a8a]">
              {isDestroyed ? "Fortune destroyed" : "Fortune spent"}
            </p>
            <p className="mt-1 text-[26px] font-bold leading-none tabular-nums tracking-tight">
              {formatPercent(percentSpent)}
            </p>
          </div>

          <div className="mt-4 border border-dashed border-[#c9c9c9] px-3 py-3">
            <p className="text-center text-[11px] font-medium leading-relaxed">
              {headline}
            </p>
          </div>

          <div className="mt-5 flex justify-center gap-[3px]" aria-hidden>
            {BARCODE.map((width, i) => (
              <span
                key={i}
                className="block h-8 bg-[#171717]"
                style={{ width: `${width}px` }}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-[9px] uppercase tracking-[0.18em] text-[#8a8a8a]">
            {SITE_WATERMARK}
          </p>
          <p className="mt-1 text-center text-[9px] leading-relaxed text-[#b0b0b0]">
            No refunds. No exchanges. No real money.
          </p>
        </div>

        <div className="receipt-tear-bottom" />
      </div>
    );
  },
);

/** Fixed pattern — a random one would change on every render and every export. */
const BARCODE = [1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 4, 2, 1];

function Divider() {
  return <div className="my-3 border-t border-dashed border-[#c9c9c9]" />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px] text-[11px]">
      <span className="shrink-0 tracking-wide text-[#8a8a8a]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium tabular-nums">
        {value}
      </span>
    </div>
  );
}
