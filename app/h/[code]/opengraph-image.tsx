import { ImageResponse } from "next/og";
import { getBillionaire } from "@/data/billionaires";
import { PRODUCTS_BY_ID } from "@/data/products";
import { decodeHaul, haulItemCount, haulPercent } from "@/lib/haul";

export const runtime = "edge";
export const alt = "A shared haul from Spend Like a Billionaire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card WhatsApp, X, and Discord render when someone pastes a haul link.
 *
 * Two constraints from Satori, the renderer behind ImageResponse:
 *   1. Any <div> with more than one child needs an explicit `display: flex`.
 *      Interpolating two text nodes into one div counts. Every text node here
 *      is therefore a single precomputed string.
 *   2. Emoji need a remote font fetched at render time. This card avoids them
 *      entirely so an unfurl can never depend on the network.
 */
export default async function OgImage({ params }: { params: { code: string } }) {
  const haul = decodeHaul(params.code);

  if (!haul) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#ededed",
            fontSize: 56,
            fontWeight: 600,
          }}
        >
          Spend Like a Billionaire
        </div>
      ),
      size,
    );
  }

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

  const compact = (n: number) =>
    n >= 1e9
      ? `$${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)}B`
      : n >= 1e6
        ? `$${(n / 1e6).toFixed(1)}M`
        : `$${Math.round(n).toLocaleString("en-US")}`;

  const compactQty = (n: number) =>
    n >= 1_000_000
      ? `${Math.round(n / 1_000_000)}M`
      : n >= 1_000
        ? `${Math.round(n / 1_000)}k`
        : `${n}`;

  const [from, to] = billionaire?.accent ?? ["#1f2937", "#4b5563"];

  // Precomputed so every text node below is a single child.
  const eyebrow = `${who} spent`;
  const subline = `${billionaire?.name ?? "a fortune"}'s money`;
  const stats = `${percent >= 99.95 ? "100" : percent.toFixed(1)}% of the fortune · ${items.toLocaleString("en-US")} items`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#ffffff",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 76,
              height: 76,
              marginRight: 22,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${from}, ${to})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {billionaire?.initials ?? "$"}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 32, color: "#ededed" }}>{eyebrow}</div>
            <div style={{ fontSize: 26, color: "#8f8f8f" }}>{subline}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 150,
              fontWeight: 700,
              letterSpacing: -6,
              lineHeight: 1,
            }}
          >
            {compact(haul.spent)}
          </div>
          <div style={{ fontSize: 36, color: "#8f8f8f", marginTop: 16 }}>
            {stats}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            {topItems.map(({ product, qty }) => (
              <div
                key={product.id}
                style={{
                  display: "flex",
                  background: "#171717",
                  borderRadius: 14,
                  padding: "14px 22px",
                  marginRight: 14,
                  fontSize: 24,
                  color: "#ededed",
                  whiteSpace: "nowrap",
                }}
              >
                {`${product.name.length > 18 ? product.name.slice(0, 17) + "…" : product.name} ×${compactQty(qty)}`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#0070f3", fontWeight: 600 }}>
            Can you beat it?
          </div>
        </div>
      </div>
    ),
    size,
  );
}
