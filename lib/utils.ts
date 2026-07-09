export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Strips everything but digits, then parses. Returns 0 for garbage input. */
export function parseIntegerInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 0) return 0;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(parsed, Number.MAX_SAFE_INTEGER);
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
