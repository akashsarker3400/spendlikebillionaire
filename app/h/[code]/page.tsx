import type { Metadata } from "next";
import Link from "next/link";
import { HaulView } from "@/components/HaulView";
import { getBillionaire } from "@/data/billionaires";
import { formatCompact, formatPercent } from "@/lib/format";
import { decodeHaul, haulItemCount, haulPercent } from "@/lib/haul";
import { SITE_NAME } from "@/lib/site";

interface Params {
  params: { code: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const haul = decodeHaul(params.code);
  if (!haul) {
    return { title: "Haul not found", robots: { index: false } };
  }

  const billionaire = getBillionaire(haul.billionaireId);
  const who = haul.nickname || "Someone";
  const title = `${who} spent ${formatCompact(haul.spent)} of ${billionaire?.name ?? "a fortune"}`;
  const description = `${formatPercent(haulPercent(haul))} of the fortune, ${haulItemCount(haul.items).toLocaleString("en-US")} items. Think you can beat it?`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    // A shared link is ephemeral user content, not something to index.
    robots: { index: false, follow: true },
  };
}

export default function HaulPage({ params }: Params) {
  const haul = decodeHaul(params.code);

  // A truncated or hand-edited link must land somewhere friendly, never a crash.
  if (!haul || !getBillionaire(haul.billionaireId)) {
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5 text-center">
        <div>
          <span className="text-4xl" role="img" aria-label="Broken link">
            🔗
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tighter">
            That link is broken
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-subtle">
            The receipt is stored inside the link itself, so a truncated or
            edited URL can&apos;t be recovered. Ask them to send it again.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Play {SITE_NAME}
          </Link>
        </div>
      </main>
    );
  }

  return <HaulView haul={haul} code={params.code} />;
}
