"use client";

import { useEffect, useState } from "react";

/**
 * The store rehydrates from localStorage after the first paint. Anything that
 * renders persisted state must wait for this, or the server HTML and the first
 * client render disagree and React throws a hydration error.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
