import Link from "next/link";
import type { Metadata } from "next";
import { IMAGE_CREDITS } from "@/data/credits";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Image credits",
  description: `Attribution for the freely-licensed photographs used in ${SITE_NAME}.`,
};

export default function CreditsPage() {
  const people = IMAGE_CREDITS.filter((c) => c.file.startsWith("/people/"));
  const products = IMAGE_CREDITS.filter((c) => c.file.startsWith("/products/"));

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-8">
      <header className="py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-subtle transition-colors hover:text-ink dark:hover:text-white"
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
          Home
        </Link>
      </header>

      <section className="py-8">
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-none tracking-tighter">
          Image credits
        </h1>
        <div className="mt-5 max-w-xl space-y-3 text-sm leading-relaxed text-subtle">
          <p>
            Every photograph here comes from Wikimedia Commons under a licence
            that permits reuse. Each is listed below with its author, its licence,
            and a link to the original file page.
          </p>
          <p>
            Photographs licensed CC BY-SA remain under CC BY-SA. Nothing on this
            page implies that any person or brand shown endorses, sponsors, or is
            affiliated with {SITE_NAME}. It is a satire, and no real money or
            property changes hands.
          </p>
        </div>
      </section>

      <CreditTable title="People" credits={people} />
      <CreditTable title="Products" credits={products} />

      <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-subtle">
        Spotted an attribution error?{" "}
        <a
          href="https://commons.wikimedia.org/"
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Wikimedia Commons
        </a>{" "}
        is the authority; this page mirrors what it reports.
      </p>
    </main>
  );
}

function CreditTable({
  title,
  credits,
}: {
  title: string;
  credits: typeof IMAGE_CREDITS;
}) {
  if (credits.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold tracking-tight">
        {title}{" "}
        <span className="font-normal text-subtle">({credits.length})</span>
      </h2>

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {credits.map((credit) => (
          <li
            key={credit.id}
            className="flex items-center gap-3 py-2.5 text-xs leading-relaxed"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={credit.file}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="h-10 w-10 shrink-0 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink dark:text-white">
                {credit.subject}
              </p>
              <p className="truncate text-subtle">
                {credit.author || "Unknown author"} · {credit.license}
              </p>
            </div>
            <a
              href={credit.source}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-medium text-accent hover:underline"
            >
              Source
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
