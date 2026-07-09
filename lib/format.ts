const fullCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

const plainInteger = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const compactInteger = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

/** `$1,400,000` */
export function formatFull(amount: number): string {
  return fullCurrency.format(amount);
}

/** `$1.4M`, `$44B`. Anything under $1,000 renders in full — `$1.4K` reads worse than `$1,400`. */
export function formatCompact(amount: number): string {
  if (Math.abs(amount) < 1_000) return fullCurrency.format(amount);
  return compactCurrency.format(amount);
}

export function formatMoney(amount: number, compact: boolean): string {
  return compact ? formatCompact(amount) : formatFull(amount);
}

/** `66,666,666,666` */
export function formatCount(n: number): string {
  return plainInteger.format(n);
}

/** `66.7B` — for a cart badge, where 66,666,666,666 Big Macs will not fit. */
export function formatCountCompact(n: number): string {
  if (Math.abs(n) < 1_000) return plainInteger.format(n);
  return compactInteger.format(n);
}

/** Truncates rather than rounds: 99.96% must never render as "100.0%". */
export function formatPercent(pct: number): string {
  if (pct === 0) return "0%";
  if (pct > 0 && pct < 0.1) return "<0.1%";
  if (pct >= 100) return "100%";
  const places = pct >= 10 ? 1 : 2;
  const factor = 10 ** places;
  return `${(Math.floor(pct * factor) / factor).toFixed(places)}%`;
}

/** `1,240 years` / `3.2 years` — picks a sane precision for very large and very small values. */
export function formatQuantityWithUnit(value: number, unit: string): string {
  const rounded =
    value >= 1_000
      ? plainInteger.format(Math.round(value))
      : value >= 10
        ? value.toFixed(0)
        : value.toFixed(1);
  return `${rounded} ${unit}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

/** Formats a bare `YYYY-MM-DD` without letting the local timezone shift the day. */
export function formatIsoDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
