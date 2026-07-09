import { getBillionaire } from "@/data/billionaires";
import { PRODUCTS_BY_ID } from "@/data/products";

/**
 * A haul is a whole shopping run squeezed into a URL. There is no server: the
 * receipt travels inside the link you paste into WhatsApp, and the page that
 * opens it reconstructs the run from those bytes alone.
 *
 * Wire format, before base64url:
 *
 *   1~<billionaireId>~<startingBalance36>~<id*qty36.id*qty36>~<spent36>~<nick64>~<ts36>
 *
 * Base36 keeps big integers short ($927,201,000,000 -> "bp9j5hbc"). The version
 * prefix means an old link never silently decodes into the wrong shape.
 *
 * `spent` is stored rather than recomputed so a shared receipt keeps showing the
 * number its author saw, even after we update a price. Re-deriving from today's
 * prices is what `stealHaul` does — that's a different question.
 */

export const HAUL_VERSION = "1";

/** A quantity this large can't be produced by the affordability clamp. Reject it. */
const MAX_QUANTITY = 1e15;

export interface Haul {
  billionaireId: string;
  startingBalance: number;
  /** productId -> quantity */
  items: Record<string, number>;
  /** Total the author actually spent, at the prices they saw. */
  spent: number;
  nickname?: string;
  /** Unix seconds. */
  createdAt: number;
}

// ------------------------------------------------------------ base36 + b64url

const enc36 = (n: number): string =>
  Math.max(0, Math.floor(n)).toString(36);

function dec36(s: string): number {
  const n = parseInt(s, 36);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Works in the browser, in Node, and on the edge — all three have btoa/atob. */
function toBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ encode

export function encodeHaul(haul: Haul): string {
  const items = Object.entries(haul.items)
    .filter(([id, qty]) => PRODUCTS_BY_ID[id] && qty > 0)
    .map(([id, qty]) => `${id}*${enc36(qty)}`)
    .join(".");

  const parts = [
    HAUL_VERSION,
    haul.billionaireId,
    enc36(haul.startingBalance),
    items,
    enc36(haul.spent),
    haul.nickname ? toBase64Url(haul.nickname) : "",
    enc36(Math.floor(haul.createdAt / 1000)),
  ];

  return toBase64Url(parts.join("~"));
}

// ------------------------------------------------------------------ decode

/** Returns null for anything malformed, unknown, or implausible. Never throws. */
export function decodeHaul(code: string): Haul | null {
  const raw = fromBase64Url(code);
  if (!raw) return null;

  const parts = raw.split("~");
  if (parts.length !== 7) return null;

  const [version, billionaireId, balance36, itemsRaw, spent36, nick64, ts36] =
    parts as [string, string, string, string, string, string, string];

  if (version !== HAUL_VERSION) return null;
  if (!getBillionaire(billionaireId)) return null;

  const startingBalance = dec36(balance36);
  if (startingBalance <= 0) return null;

  const items: Record<string, number> = {};
  if (itemsRaw.length > 0) {
    for (const chunk of itemsRaw.split(".")) {
      const sep = chunk.lastIndexOf("*");
      if (sep <= 0) return null;
      const id = chunk.slice(0, sep);
      const qty = dec36(chunk.slice(sep + 1));
      // Silently drop products that no longer exist rather than 404 the link.
      if (!PRODUCTS_BY_ID[id]) continue;
      if (qty <= 0 || qty > MAX_QUANTITY) return null;
      items[id] = qty;
    }
  }

  const spent = dec36(spent36);
  // A haul can't have cost more than the fortune it came from.
  if (spent > startingBalance) return null;

  const nickname = nick64 ? (fromBase64Url(nick64) ?? undefined) : undefined;
  const createdAt = dec36(ts36) * 1000;

  return {
    billionaireId,
    startingBalance,
    items,
    spent,
    nickname: nickname?.slice(0, 20),
    createdAt,
  };
}

// ----------------------------------------------------------------- helpers

/** Recomputes the haul's cost at *today's* prices. Used when stealing a cart. */
export function haulValueNow(items: Record<string, number>): number {
  let total = 0;
  for (const [id, qty] of Object.entries(items)) {
    const product = PRODUCTS_BY_ID[id];
    if (!product) continue;
    total += product.price * qty;
  }
  return total;
}

export function haulItemCount(items: Record<string, number>): number {
  return Object.values(items).reduce((a, b) => a + b, 0);
}

export function haulPercent(haul: Haul): number {
  if (haul.startingBalance <= 0) return 0;
  return (haul.spent / haul.startingBalance) * 100;
}

export function haulPath(code: string): string {
  return `/h/${code}`;
}
