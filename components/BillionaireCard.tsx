"use client";

import { Avatar } from "@/components/Avatar";
import { formatCompact } from "@/lib/format";
import type { Billionaire } from "@/types";
import { cn } from "@/lib/utils";

interface BillionaireCardProps {
  billionaire: Billionaire;
  netWorth: number;
  index: number;
  onSelect: (billionaire: Billionaire) => void;
}

/**
 * The staggered entrance is CSS, not `<motion.button initial={{opacity:0}}>`.
 * Framer writes `initial` into the server-rendered inline style, which would ship
 * this whole grid invisible and leave it that way if JS never runs. See the note
 * in app/template.tsx.
 */
export function BillionaireCard({
  billionaire,
  netWorth,
  index,
  onSelect,
}: BillionaireCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(billionaire)}
      style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
      className={cn(
        "surface group flex animate-fade-up flex-col items-start gap-4 rounded-lg p-5 text-left",
        "transition-[transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-[3px] hover:shadow-lift active:translate-y-0 active:scale-[0.985]",
        billionaire.joke && "border-dashed",
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <Avatar billionaire={billionaire} size={48} />
        {billionaire.joke && (
          <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
            Bonus
          </span>
        )}
      </div>

      <div className="w-full">
        <h3 className="text-sm font-semibold tracking-tight">
          {billionaire.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-subtle">{billionaire.title}</p>
      </div>

      <div className="w-full">
        <div className="tnum text-2xl font-semibold tracking-tight sm:text-[28px]">
          {formatCompact(netWorth)}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-subtle transition-colors group-hover:text-accent">
          Spend it
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path
              d="M5 12h14m0 0-6-6m6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
