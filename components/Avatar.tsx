import type { Billionaire } from "@/types";
import { cn } from "@/lib/utils";

interface AvatarProps {
  billionaire: Billionaire;
  size?: number;
  className?: string;
}

/**
 * A real photo where we have one (freely-licensed portraits from Wikimedia
 * Commons — see /credits), and a generated mark where we don't, which is only
 * the fictional "Broke Mode" player.
 *
 * Plain <img>, not next/image: the optimizer is the subject of several Next 14
 * advisories and these are already sized for their largest on-screen use.
 */
export function Avatar({ billionaire, size = 64, className }: AvatarProps) {
  const [from, to] = billionaire.accent;

  if (billionaire.photo) {
    return (
      // The gradient sits underneath, so a slow image reveals a coloured disc
      // rather than a hole in the layout.
      <span
        className={cn("block shrink-0 overflow-hidden rounded-full", className)}
        style={{
          width: size,
          height: size,
          backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={billionaire.photo}
          alt={billionaire.name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-[center_top]"
        />
      </span>
    );
  }

  return <GeneratedAvatar billionaire={billionaire} size={size} className={className} />;
}

function GeneratedAvatar({ billionaire, size = 64, className }: AvatarProps) {
  const gradientId = `avatar-gradient-${billionaire.id}`;
  const highlightId = `avatar-highlight-${billionaire.id}`;
  const [from, to] = billionaire.accent;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={billionaire.name}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <radialGradient id={highlightId} cx="0.32" cy="0.26" r="0.7">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="32" fill={`url(#${gradientId})`} />
      <circle cx="32" cy="32" r="32" fill={`url(#${highlightId})`} />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="22"
        fontWeight="600"
        letterSpacing="0.5"
        fontFamily="var(--font-inter), system-ui, sans-serif"
      >
        {billionaire.initials}
      </text>
    </svg>
  );
}
