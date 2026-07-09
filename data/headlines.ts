import { formatCompact, formatFull, formatPercent } from "@/lib/format";

export interface HeadlineContext {
  billionaireName: string;
  totalSpent: number;
  remainingBalance: number;
  percentSpent: number;
  isJoke: boolean;
  /**
   * Nothing on the shelf is affordable any more. This — not `percentSpent >= 100`
   * — is what "the fortune is gone" means: prices are whole dollars, so a run
   * almost always ends a few dollars short of a true 100%.
   */
  isDestroyed: boolean;
}

interface HeadlineVariant {
  /** Inclusive lower bound of percent spent. */
  min: number;
  /** Exclusive upper bound, except for the final 100 bucket. */
  max: number;
  render: (ctx: HeadlineContext) => string;
}

/**
 * Ten variants, bucketed by percent spent. Two per bucket so the same run
 * doesn't always read identically, picked deterministically from totalSpent
 * so the headline never flickers between renders.
 */
const VARIANTS: HeadlineVariant[] = [
  {
    min: 0,
    max: 10,
    render: (c) =>
      `You spent ${formatCompact(c.totalSpent)} and ${c.billionaireName} didn't even feel it 🪶`,
  },
  {
    min: 0,
    max: 10,
    render: (c) =>
      `${formatCompact(c.totalSpent)} down. That's a rounding error, not a spending spree.`,
  },
  {
    min: 10,
    max: 25,
    render: (c) =>
      `${formatCompact(c.totalSpent)} gone and ${c.billionaireName} is still richer than your entire city 🏙️`,
  },
  {
    min: 10,
    max: 25,
    render: (c) =>
      `You've made a dent. A ${formatPercent(c.percentSpent)} dent. The accountant has been notified.`,
  },
  {
    min: 25,
    max: 50,
    render: (c) =>
      `You burned ${formatCompact(c.totalSpent)} of ${c.billionaireName}'s money and he's STILL a billionaire 💀`,
  },
  {
    min: 25,
    max: 50,
    render: (c) =>
      `${formatPercent(c.percentSpent)} incinerated. ${formatCompact(c.remainingBalance)} left to ruin.`,
  },
  {
    min: 50,
    max: 75,
    render: (c) =>
      `Past the halfway mark. ${formatCompact(c.remainingBalance)} stands between you and total annihilation 🔥`,
  },
  {
    min: 50,
    max: 75,
    render: (c) =>
      `You spent more than half of ${c.billionaireName}'s life's work in one sitting.`,
  },
  {
    min: 75,
    max: 100,
    render: (c) =>
      `${formatPercent(c.percentSpent)} obliterated. ${c.billionaireName} is checking the couch cushions 🛋️`,
  },
  {
    min: 75,
    max: 100,
    render: (c) =>
      `Only ${formatCompact(c.remainingBalance)} left. Finish the job.`,
  },
  {
    min: 100,
    max: Number.POSITIVE_INFINITY,
    render: (c) =>
      `FORTUNE DESTROYED. You spent every last dollar of ${c.billionaireName}'s ${formatCompact(c.totalSpent)} 🎉`,
  },
  {
    min: 100,
    max: Number.POSITIVE_INFINITY,
    render: (c) =>
      `${c.billionaireName} is broke. You did that. Hope it was worth it 💀🎉`,
  },
];

const EMPTY_CART = "An empty cart. Bold strategy.";
const brokeMode = (ctx: HeadlineContext) =>
  `You spent your rent money. Again. All ${formatFull(ctx.totalSpent)} of it 💀`;

export function pickHeadline(ctx: HeadlineContext): string {
  if (ctx.totalSpent === 0) return EMPTY_CART;
  if (ctx.isDestroyed && ctx.isJoke) return brokeMode(ctx);

  // Bucket on the *effective* percentage. A destroyed fortune sits at 99.9-something,
  // so keying the finale off the raw number would make it unreachable.
  const pct = ctx.isDestroyed ? 100 : ctx.percentSpent;
  const bucket = VARIANTS.filter((v) => pct >= v.min && pct < v.max);
  const pool = bucket.length > 0 ? bucket : [VARIANTS[VARIANTS.length - 1]!];

  // Deterministic: the same run always yields the same headline.
  const index = ctx.totalSpent % pool.length;
  return pool[index]!.render(ctx);
}

export const MILESTONE_MESSAGES: Record<number, string> = {
  25: "25% gone. The yacht broker has your number now.",
  50: "Halfway. Somewhere, an accountant just started crying.",
  75: "75% destroyed. The family office is in an emergency meeting.",
  100: "100%. The fortune is gone. Nothing remains. Congratulations.",
};
