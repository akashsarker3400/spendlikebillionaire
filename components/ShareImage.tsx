"use client";

import { forwardRef } from "react";
import { PRODUCTS_BY_ID } from "@/data/products";
import { formatCompact, formatCount, formatFull, formatPercent } from "@/lib/format";
import type { Haul } from "@/lib/haul";
import { SITE_WATERMARK } from "@/lib/site";
import type { Billionaire } from "@/types";

export const TEMPLATES = [
  { id: "poster", label: "Poster" },
  { id: "card", label: "Clean" },
  { id: "receipt", label: "Receipt" },
] as const;

export const FORMATS = [
  { id: "square", label: "Square", width: 1080, height: 1080, hint: "Feed" },
  { id: "story", label: "Story", width: 1080, height: 1920, hint: "Status" },
  { id: "wide", label: "Wide", width: 1200, height: 630, hint: "Link" },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export type FormatId = (typeof FORMATS)[number]["id"];

export interface ShareImageProps {
  haul: Haul;
  billionaire: Billionaire;
  template: TemplateId;
  format: FormatId;
}

/**
 * The image people actually post. Rendered at real pixel dimensions in a hidden
 * node and rasterised by html-to-image.
 *
 * Everything is inline styles with literal colours and a system font stack. No
 * Tailwind classes, no CSS variables, no webfont: html-to-image clones the node
 * into a detached document where `var(--line)` resolves to nothing and a
 * not-yet-loaded webfont silently becomes Times New Roman.
 */
export const ShareImage = forwardRef<HTMLDivElement, ShareImageProps>(
  function ShareImage({ haul, billionaire, template, format }, ref) {
    const fmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
    const { width: W, height: H } = fmt;

    // One scale unit drives every size, so a template written once works at
    // 1080x1080, 1080x1920, and 1200x630 without a second layout.
    const u = W / 1080;

    const percent = haul.startingBalance > 0 ? (haul.spent / haul.startingBalance) * 100 : 0;
    const itemCount = Object.values(haul.items).reduce((a, b) => a + b, 0);
    const who = haul.nickname?.trim() || "I";

    const lines = Object.entries(haul.items)
      .flatMap(([id, qty]) => {
        const product = PRODUCTS_BY_ID[id];
        return product ? [{ product, qty, total: product.price * qty }] : [];
      })
      .sort((a, b) => b.total - a.total);

    const shared = { haul, billionaire, W, H, u, percent, itemCount, who, lines };

    return (
      <div
        ref={ref}
        style={{
          width: W,
          height: H,
          overflow: "hidden",
          position: "relative",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {template === "poster" && <Poster {...shared} />}
        {template === "card" && <Clean {...shared} />}
        {template === "receipt" && <ReceiptStyle {...shared} />}
      </div>
    );
  },
);

interface Shared {
  haul: Haul;
  billionaire: Billionaire;
  W: number;
  H: number;
  u: number;
  percent: number;
  itemCount: number;
  who: string;
  lines: Array<{ product: (typeof PRODUCTS_BY_ID)[string]; qty: number; total: number }>;
}

// ------------------------------------------------------------------- poster

function Poster({ haul, billionaire, W, H, u, percent, itemCount, who, lines }: Shared) {
  const [from, to] = billionaire.accent;
  const tall = H > W;
  const maxItems = tall ? 4 : 3;

  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#08080a",
        color: "#ffffff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 40 * u,
        padding: 72 * u,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -300 * u,
          left: -200 * u,
          width: 1000 * u,
          height: 1000 * u,
          borderRadius: 9999,
          background: `radial-gradient(circle, ${to} 0%, ${from} 42%, rgba(8,8,10,0) 70%)`,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -360 * u,
          right: -240 * u,
          width: 900 * u,
          height: 900 * u,
          borderRadius: 9999,
          background: "radial-gradient(circle, #ff2d55 0%, #6d0f2a 42%, rgba(8,8,10,0) 70%)",
          opacity: 0.35,
        }}
      />

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {billionaire.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={billionaire.photo}
            alt=""
            style={{
              width: 104 * u,
              height: 104 * u,
              borderRadius: 9999,
              objectFit: "cover",
              objectPosition: "center top",
              border: `${3 * u}px solid rgba(255,255,255,0.25)`,
            }}
          />
        )}
        <div style={{ marginLeft: 26 * u, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44 * u, fontWeight: 700, letterSpacing: -0.5 * u }}>
            {who} spent
          </div>
          <div style={{ fontSize: 27 * u, color: "#9a9aa2", marginTop: 6 * u }}>
            of {billionaire.name}&apos;s {formatCompact(haul.startingBalance)}
          </div>
        </div>
      </div>

      {/* flex:1 + centred: on a 1920-tall story this distributes the leftover
          space evenly instead of dumping it all into one gap. */}
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: (tall ? 200 : 168) * u,
            fontWeight: 800,
            letterSpacing: -10 * u,
            lineHeight: 0.95,
          }}
        >
          {formatCompact(haul.spent)}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 26 * u }}>
          <span style={{ fontSize: 34 * u, fontWeight: 700, color: "#ff4d4d" }}>
            {formatPercent(percent)} destroyed
          </span>
          <span style={{ fontSize: 30 * u, color: "#5b5b63", margin: `0 ${16 * u}px` }}>·</span>
          <span style={{ fontSize: 30 * u, color: "#9a9aa2" }}>
            {formatCount(itemCount)} items
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 14 * u,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.10)",
            marginTop: 26 * u,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(1.5, Math.min(100, percent))}%`,
              height: "100%",
              borderRadius: 9999,
              background: "linear-gradient(90deg, #ff8a3d, #ff2d55)",
            }}
          />
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * u }}>
          {lines.slice(0, maxItems).map(({ product, qty, total }) => (
            <div
              key={product.id}
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 22 * u,
                padding: 14 * u,
              }}
            >
              <Thumb product={product} size={72 * u} radius={14 * u} />
              <div style={{ marginLeft: 18 * u, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 28 * u,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {product.name}
                </div>
                <div style={{ fontSize: 23 * u, color: "#9a9aa2", marginTop: 2 * u }}>
                  ×{formatCount(qty)}
                </div>
              </div>
              <div style={{ fontSize: 28 * u, fontWeight: 700, marginLeft: 16 * u }}>
                {formatCompact(total)}
              </div>
            </div>
          ))}
          {lines.length > maxItems && (
            <div style={{ fontSize: 24 * u, color: "#5b5b63", paddingLeft: 6 * u }}>
              + {lines.length - maxItems} more
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 34 * u,
          }}
        >
          <div
            style={{
              background: "#0070f3",
              borderRadius: 9999,
              padding: `${18 * u}px ${34 * u}px`,
              fontSize: 30 * u,
              fontWeight: 700,
            }}
          >
            Can you beat it?
          </div>
          <div style={{ fontSize: 22 * u, color: "#5b5b63" }}>{SITE_WATERMARK}</div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- clean

function Clean({ haul, billionaire, W, H, u, percent, itemCount, who, lines }: Shared) {
  const tall = H > W;
  const maxItems = tall ? 5 : 3;

  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#ffffff",
        color: "#171717",
        display: "flex",
        flexDirection: "column",
        gap: 40 * u,
        padding: 76 * u,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {billionaire.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={billionaire.photo}
            alt=""
            style={{
              width: 92 * u,
              height: 92 * u,
              borderRadius: 9999,
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        )}
        <div style={{ marginLeft: 24 * u, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 38 * u, fontWeight: 700, letterSpacing: -0.5 * u }}>
            {who} spent
          </div>
          <div style={{ fontSize: 25 * u, color: "#8a8a8f", marginTop: 4 * u }}>
            {billionaire.name}&apos;s money
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: (tall ? 176 : 150) * u,
            fontWeight: 800,
            letterSpacing: -9 * u,
            lineHeight: 0.95,
          }}
        >
          {formatCompact(haul.spent)}
        </div>
        <div style={{ fontSize: 27 * u, color: "#8a8a8f", marginTop: 18 * u }}>
          {formatFull(haul.spent)}
        </div>

        <div
          style={{
            display: "flex",
            gap: 16 * u,
            marginTop: 34 * u,
          }}
        >
          <Stat u={u} label="Of the fortune" value={formatPercent(percent)} />
          <Stat u={u} label="Items bought" value={formatCount(itemCount)} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 * u }}>
          {lines.slice(0, maxItems).map(({ product, qty, total }) => (
            <div
              key={product.id}
              style={{
                display: "flex",
                alignItems: "center",
                paddingBottom: 12 * u,
                borderBottom: "1px solid #ececec",
              }}
            >
              <Thumb product={product} size={56 * u} radius={10 * u} />
              <div style={{ marginLeft: 16 * u, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 26 * u,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {product.name}
                </div>
                <div style={{ fontSize: 21 * u, color: "#8a8a8f" }}>×{formatCount(qty)}</div>
              </div>
              <div style={{ fontSize: 26 * u, fontWeight: 700 }}>{formatCompact(total)}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 30 * u,
          }}
        >
          <div style={{ fontSize: 28 * u, fontWeight: 700, color: "#0070f3" }}>
            Can you beat it?
          </div>
          <div style={{ fontSize: 21 * u, color: "#b0b0b5" }}>{SITE_WATERMARK}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ u, label, value }: { u: number; label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        border: "1px solid #ececec",
        borderRadius: 18 * u,
        padding: `${20 * u}px ${24 * u}px`,
      }}
    >
      <div style={{ fontSize: 19 * u, color: "#8a8a8f", textTransform: "uppercase", letterSpacing: 1.4 * u }}>
        {label}
      </div>
      <div style={{ fontSize: 40 * u, fontWeight: 700, marginTop: 6 * u }}>{value}</div>
    </div>
  );
}

// ------------------------------------------------------------------ receipt

function ReceiptStyle({ haul, billionaire, W, H, u, percent, itemCount, who, lines }: Shared) {
  const maxItems = H > W ? 9 : 5;

  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#f2f2ef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48 * u,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760 * u,
          background: "#fffefb",
          color: "#171717",
          padding: `${52 * u}px ${48 * u}px`,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.14)`,
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", fontSize: 26 * u, fontWeight: 700, letterSpacing: 4 * u }}>
          SPEND LIKE A BILLIONAIRE
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 19 * u,
            color: "#8a8a8a",
            letterSpacing: 3 * u,
            marginTop: 8 * u,
          }}
        >
          ORDER RECEIPT
        </div>

        <div style={{ borderTop: `${2 * u}px dashed #c9c9c9`, margin: `${28 * u}px 0` }} />

        <Row u={u} left="CUSTOMER" right={billionaire.name.toUpperCase()} />
        <Row u={u} left="SHOPPER" right={who.toUpperCase()} />
        <Row u={u} left="OPENING" right={formatCompact(haul.startingBalance)} />

        <div style={{ borderTop: `${2 * u}px dashed #c9c9c9`, margin: `${28 * u}px 0` }} />

        {lines.slice(0, maxItems).map(({ product, qty, total }) => (
          <div key={product.id} style={{ marginBottom: 16 * u }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22 * u }}>
              <span style={{ textTransform: "uppercase" }}>{product.name}</span>
              <span style={{ fontWeight: 700 }}>{formatCompact(total)}</span>
            </div>
            <div style={{ fontSize: 19 * u, color: "#8a8a8a", marginTop: 2 * u }}>
              {formatCount(qty)} × {formatFull(product.price)}
            </div>
          </div>
        ))}
        {lines.length > maxItems && (
          <div style={{ fontSize: 19 * u, color: "#8a8a8a" }}>
            + {lines.length - maxItems} more items
          </div>
        )}

        <div style={{ borderTop: `${3 * u}px dashed #171717`, margin: `${28 * u}px 0` }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 * u, fontWeight: 700 }}>
          <span>TOTAL</span>
          <span>{formatCompact(haul.spent)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 21 * u,
            color: "#8a8a8a",
            marginTop: 8 * u,
          }}
        >
          <span>{formatCount(itemCount)} ITEMS</span>
          <span>TAX: LOL</span>
        </div>

        <div style={{ borderTop: `${2 * u}px dashed #c9c9c9`, margin: `${28 * u}px 0` }} />

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19 * u, color: "#8a8a8a", letterSpacing: 3 * u }}>
            FORTUNE DESTROYED
          </div>
          <div style={{ fontSize: 62 * u, fontWeight: 800, marginTop: 6 * u }}>
            {formatPercent(percent)}
          </div>
        </div>

        <div style={{ marginTop: 30 * u, display: "flex", justifyContent: "center", gap: 3 * u }}>
          {BARCODE.map((w, i) => (
            <span key={i} style={{ width: w * u, height: 54 * u, background: "#171717" }} />
          ))}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 17 * u,
            color: "#8a8a8a",
            letterSpacing: 2 * u,
            marginTop: 22 * u,
          }}
        >
          {SITE_WATERMARK.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function Row({ u, left, right }: { u: number; left: string; right: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21 * u, padding: `${3 * u}px 0` }}>
      <span style={{ color: "#8a8a8a" }}>{left}</span>
      <span style={{ fontWeight: 600 }}>{right}</span>
    </div>
  );
}

const BARCODE = [2, 5, 2, 2, 4, 7, 2, 4, 2, 5, 4, 2, 7, 2, 2, 4, 5, 2, 4, 2, 2, 7, 4, 2];

/** Photo when we have one; a deterministic coloured tile with an initial when we don't. */
function Thumb({
  product,
  size,
  radius,
}: {
  product: (typeof PRODUCTS_BY_ID)[string];
  size: number;
  radius: number;
}) {
  if (!product) return null;

  if (product.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.photo}
        alt=""
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  let h = 0;
  for (let i = 0; i < product.id.length; i++) h = (h * 31 + product.id.charCodeAt(i)) % 360;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${h} 70% 46%), hsl(${(h + 40) % 360} 70% 32%))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontSize: size * 0.42,
        fontWeight: 700,
      }}
    >
      {product.name.slice(0, 1).toUpperCase()}
    </div>
  );
}
