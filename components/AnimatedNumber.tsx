"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef } from "react";

/** Avoids React's useLayoutEffect-on-the-server warning if this ever renders during SSR. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  durationSeconds?: number;
}

/**
 * Ticks a number to its new value by writing straight to the DOM node. React
 * never re-renders during the animation, which matters when the number is
 * $400,000,000,000 and it's changing sixty times a second.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  durationSeconds = 0.7,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);
  const reduceMotion = useReducedMotion();

  // Kept in a ref so an inline `format` prop doesn't re-subscribe every render.
  const formatRef = useRef(format);
  formatRef.current = format;

  // Layout effect, not a plain effect: the number must be painted in the first
  // frame or the balance bar shifts by a line height.
  useIsomorphicLayoutEffect(() => {
    const write = (v: number) => {
      if (ref.current) ref.current.textContent = formatRef.current(Math.round(v));
    };
    write(motionValue.get());
    return motionValue.on("change", write);
  }, [motionValue]);

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: durationSeconds,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, reduceMotion, motionValue, durationSeconds]);

  // The format function may change (compact <-> full) without the value changing.
  useEffect(() => {
    if (ref.current) ref.current.textContent = format(Math.round(motionValue.get()));
  }, [format, motionValue]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {/* Filled by the effect above; empty on the server and the first client render. */}
    </span>
  );
}
