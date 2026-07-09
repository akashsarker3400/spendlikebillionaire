import { formatCompact, formatPercent } from "@/lib/format";
import { encodeHaul, haulPath, type Haul } from "@/lib/haul";

export interface ShareTarget {
  id: string;
  label: string;
  emoji: string;
  /** Builds the intent URL. Everything is encodeURIComponent'd by the caller. */
  href: (url: string, text: string) => string;
}

/**
 * Plain intent URLs, no SDKs, no tracking pixels, nothing to load. Every one of
 * these works from a static page.
 */
export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    emoji: "💬",
    href: (url, text) => `https://wa.me/?text=${enc(`${text} ${url}`)}`,
  },
  {
    id: "x",
    label: "X",
    emoji: "𝕏",
    href: (url, text) =>
      `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    emoji: "✈️",
    href: (url, text) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    emoji: "📘",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    emoji: "🤖",
    href: (url, text) =>
      `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text)}`,
  },
];

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** Absolute URL for a haul, safe to call on the server (origin may be empty). */
export function haulUrl(origin: string, haul: Haul): string {
  return `${origin}${haulPath(encodeHaul(haul))}`;
}

export function shareText(haul: Haul): string {
  const percent = formatPercent(
    haul.startingBalance > 0 ? (haul.spent / haul.startingBalance) * 100 : 0,
  );
  const who = haul.nickname ? `${haul.nickname} spent` : "I spent";
  return `${who} ${formatCompact(haul.spent)} — ${percent} of a fortune. Can you beat it?`;
}

/** The origin the browser is actually on. Empty string during SSR. */
export function currentOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
