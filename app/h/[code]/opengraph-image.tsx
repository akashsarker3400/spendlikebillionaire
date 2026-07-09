/* eslint-disable @next/next/no-img-element -- Satori renders these to a PNG; they are never DOM <img> elements. */
import { ImageResponse } from "next/og";
import { getBillionaire } from "@/data/billionaires";
import { PORTRAIT_THUMBS, PRODUCT_THUMBS } from "@/data/imageThumbs";
import { PRODUCTS_BY_ID } from "@/data/products";
import { decodeHaul, haulItemCount, haulPercent } from "@/lib/haul";
import { SITE_WATERMARK } from "@/lib/site";

export const runtime = "edge";
export const alt = "A shared haul from Spend Like a Billionaire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card Facebook, WhatsApp, X, and Discord render when someone pastes a haul
 * link. This is the whole growth loop: nobody clicks a link that unfurls as
 * grey text.
 *
 * Three constraints from Satori, the renderer behind ImageResponse:
 *   1. Any <div> with more than one child needs an explicit `display: flex`.
 *      Interpolating two text nodes into one div counts, and it fails at
 *      request time with a 500, not at build time.
 *   2. Emoji need a font fetched over the network. Product tiles therefore use
 *      the inlined photo, and fall back to a coloured initial — never an emoji.
 *   3. No filesystem, no `<img src="/foo.jpg">`. Every image is a data URI from
 *      data/imageThumbs.ts.
 */
export default async function OgImage({ params }: { params: { code: string } }) {
  const haul = decodeHaul(params.code);

  if (!haul) return new ImageResponse(<Fallback />, size);

  const billionaire = getBillionaire(haul.billionaireId);
  const who = haul.nickname || "Someone";
  const percent = haulPercent(haul);
  const items = haulItemCount(haul.items);

  const topItems = Object.entries(haul.items)
    .flatMap(([id, qty]) => {
      const product = PRODUCTS_BY_ID[id];
      return product ? [{ product, qty, total: product.price * qty }] : [];
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const [from, to] = billionaire?.accent ?? ["#1f2937", "#4b5563"];
  const portrait = billionaire ? PORTRAIT_THUMBS[billionaire.id] : undefined;

  // Precomputed: every text node below must be a single child.
  const eyebrow = `${who} spent`;
  const subline = `of ${billionaire?.name ?? "a fortune"}'s ${compact(haul.startingBalance)}`;
  const pctLabel = `${percent >= 99.95 ? "100" : percent.toFixed(1)}% destroyed`;
  const itemsLabel = `${items.toLocaleString("en-US")} items`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#08080a",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Two washes: the billionaire's own accent, plus a fixed warm/red glow so
            a dark accent (Musk is charcoal) still produces a coloured card. */}
        <div
          style={{
            position: "absolute",
            top: -360,
            left: -220,
            width: 1000,
            height: 1000,
            borderRadius: 999,
            background: `radial-gradient(circle, ${to} 0%, ${from} 40%, rgba(8,8,10,0) 68%)`,
            opacity: 0.85,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -420,
            right: -260,
            width: 900,
            height: 900,
            borderRadius: 999,
            background:
              "radial-gradient(circle, #ff2d55 0%, #7a1030 40%, rgba(8,8,10,0) 68%)",
            opacity: 0.32,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: 60,
          }}
        >
          {/* ---------------------------------------------------------- header */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {portrait ? (
              <img
                alt=""
                src={portrait}
                width={92}
                height={92}
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: "3px solid rgba(255,255,255,0.22)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${from}, ${to})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                {billionaire?.initials ?? "$"}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
              <div style={{ fontSize: 40, fontWeight: 600, color: "#ffffff" }}>
                {eyebrow}
              </div>
              <div style={{ fontSize: 26, color: "#9a9aa2", marginTop: 4 }}>
                {subline}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- the number */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 168,
                fontWeight: 800,
                letterSpacing: -8,
                lineHeight: 1,
                color: "#ffffff",
              }}
            >
              {compact(haul.spent)}
            </div>

            <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#ff4d4d" }}>
                {pctLabel}
              </div>
              <div style={{ display: "flex", fontSize: 30, color: "#5b5b63", margin: "0 14px" }}>
                ·
              </div>
              <div style={{ display: "flex", fontSize: 30, color: "#9a9aa2" }}>
                {itemsLabel}
              </div>
            </div>

            {/* progress bar */}
            <div
              style={{
                display: "flex",
                width: 620,
                height: 12,
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                marginTop: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: Math.max(12, Math.min(620, (percent / 100) * 620)),
                  height: 12,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #ff8a3d, #ff2d55)",
                }}
              />
            </div>
          </div>

          {/* --------------------------------------------------------- footer */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex" }}>
              {topItems.map(({ product, qty }) => (
                <ProductTile key={product.id} id={product.id} name={product.name} qty={qty} />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "flex",
                  background: "#0070f3",
                  color: "#ffffff",
                  fontSize: 26,
                  fontWeight: 700,
                  padding: "16px 30px",
                  borderRadius: 999,
                }}
              >
                Can you beat it?
              </div>
              <div style={{ display: "flex", fontSize: 20, color: "#5b5b63", marginTop: 14 }}>
                {SITE_WATERMARK}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

/**
 * Deterministic colour pair for products with no photo, so "Twitter / X" looks
 * the same on every card. Satori cannot parse `hsl()` inside a gradient — it
 * throws at request time — so this returns hex.
 */
function tileColors(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return [hslToHex(h, 0.7, 0.46), hslToHex((h + 40) % 360, 0.7, 0.32)];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function ProductTile({ id, name, qty }: { id: string; name: string; qty: number }) {
  const thumb = PRODUCT_THUMBS[id];
  const label = `×${compactQty(qty)}`;
  const [tileFrom, tileTo] = tileColors(id);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 12,
        paddingRight: 22,
        marginRight: 16,
      }}
    >
      {thumb ? (
        <img
          alt=""
          src={thumb}
          width={64}
          height={64}
          style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${tileFrom}, ${tileTo})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: "#ffffff" }}>
          {name.length > 16 ? `${name.slice(0, 15)}…` : name}
        </div>
        <div style={{ fontSize: 20, color: "#9a9aa2", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#08080a",
        color: "#ededed",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
        Spend Like a Billionaire
      </div>
      <div style={{ fontSize: 30, color: "#9a9aa2", marginTop: 18 }}>
        Pick a fortune. Destroy it.
      </div>
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function compactQty(n: number): string {
  if (n >= 1e6) return `${Math.round(n / 1e6)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return `${n}`;
}
