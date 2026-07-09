import type { Billionaire } from "@/types";

/** Shown in the footer. Bump whenever the numbers below are refreshed. */
export const NET_WORTH_LAST_UPDATED = "2026-01-15";

export const BILLIONAIRES: Billionaire[] = [
  {
    id: "elon-musk",
    photo: "/people/elon-musk.jpg",
    name: "Elon Musk",
    title: "Tesla, SpaceX & xAI",
    netWorth: 400_000_000_000,
    initials: "EM",
    accent: ["#1f2937", "#4b5563"],
    forbesName: "Elon Musk",
  },
  {
    id: "jeff-bezos",
    photo: "/people/jeff-bezos.jpg",
    name: "Jeff Bezos",
    title: "Amazon & Blue Origin",
    netWorth: 245_000_000_000,
    initials: "JB",
    accent: ["#0f766e", "#14b8a6"],
    forbesName: "Jeff Bezos",
  },
  {
    id: "mark-zuckerberg",
    photo: "/people/mark-zuckerberg.jpg",
    name: "Mark Zuckerberg",
    title: "Meta",
    netWorth: 215_000_000_000,
    initials: "MZ",
    accent: ["#1d4ed8", "#60a5fa"],
    forbesName: "Mark Zuckerberg",
  },
  {
    id: "larry-ellison",
    photo: "/people/larry-ellison.jpg",
    name: "Larry Ellison",
    title: "Oracle",
    netWorth: 205_000_000_000,
    initials: "LE",
    accent: ["#b91c1c", "#f87171"],
    forbesName: "Larry Ellison",
  },
  {
    id: "bernard-arnault",
    photo: "/people/bernard-arnault.jpg",
    name: "Bernard Arnault",
    title: "LVMH",
    netWorth: 180_000_000_000,
    initials: "BA",
    accent: ["#78350f", "#d97706"],
    forbesName: "Bernard Arnault & family",
  },
  {
    id: "larry-page",
    photo: "/people/larry-page.jpg",
    name: "Larry Page",
    title: "Google",
    netWorth: 160_000_000_000,
    initials: "LP",
    accent: ["#065f46", "#34d399"],
    forbesName: "Larry Page",
  },
  {
    id: "sergey-brin",
    photo: "/people/sergey-brin.jpg",
    name: "Sergey Brin",
    title: "Google",
    netWorth: 150_000_000_000,
    initials: "SB",
    accent: ["#7c2d12", "#fb923c"],
    forbesName: "Sergey Brin",
  },
  {
    id: "warren-buffett",
    photo: "/people/warren-buffett.jpg",
    name: "Warren Buffett",
    title: "Berkshire Hathaway",
    netWorth: 145_000_000_000,
    initials: "WB",
    accent: ["#334155", "#94a3b8"],
    forbesName: "Warren Buffett",
  },
  {
    id: "steve-ballmer",
    photo: "/people/steve-ballmer.jpg",
    name: "Steve Ballmer",
    title: "Microsoft & the Clippers",
    netWorth: 140_000_000_000,
    initials: "SB",
    accent: ["#3730a3", "#818cf8"],
    forbesName: "Steve Ballmer",
  },
  {
    id: "jensen-huang",
    photo: "/people/jensen-huang.jpg",
    name: "Jensen Huang",
    title: "NVIDIA",
    netWorth: 130_000_000_000,
    initials: "JH",
    accent: ["#166534", "#4ade80"],
    forbesName: "Jensen Huang",
  },
  {
    id: "mukesh-ambani",
    photo: "/people/mukesh-ambani.jpg",
    name: "Mukesh Ambani",
    title: "Reliance Industries",
    netWorth: 115_000_000_000,
    initials: "MA",
    accent: ["#9d174d", "#f472b6"],
    forbesName: "Mukesh Ambani",
  },
  {
    id: "bill-gates",
    photo: "/people/bill-gates.jpg",
    name: "Bill Gates",
    title: "Microsoft & the Gates Foundation",
    netWorth: 110_000_000_000,
    initials: "BG",
    accent: ["#075985", "#38bdf8"],
    forbesName: "Bill Gates",
  },
  {
    id: "gautam-adani",
    photo: "/people/gautam-adani.jpg",
    name: "Gautam Adani",
    title: "Adani Group",
    netWorth: 90_000_000_000,
    initials: "GA",
    accent: ["#713f12", "#eab308"],
    forbesName: "Gautam Adani",
  },
  {
    id: "broke-mode",
    name: "You (Broke Mode)",
    title: "Rent is due Friday",
    netWorth: 1_000,
    initials: "ME",
    accent: ["#525252", "#a3a3a3"],
    joke: true,
  },
];

export const BILLIONAIRES_BY_ID: Record<string, Billionaire> =
  Object.fromEntries(BILLIONAIRES.map((b) => [b.id, b]));

export function getBillionaire(id: string | null): Billionaire | null {
  if (!id) return null;
  return BILLIONAIRES_BY_ID[id] ?? null;
}

/** The static values, shaped like the /api/networth payload. */
export const STATIC_NET_WORTHS: Record<string, number> = Object.fromEntries(
  BILLIONAIRES.map((b) => [b.id, b.netWorth]),
);
