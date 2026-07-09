"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Avatar } from "@/components/Avatar";
import { formatFull } from "@/lib/format";
import type { Billionaire } from "@/types";

const COUNT_UP_SECONDS = 1.4;
const HOLD_AFTER_COUNT_MS = 380;

interface WalletLoadingProps {
  billionaire: Billionaire;
  netWorth: number;
  onDone: () => void;
}

/** Full-screen curtain between the landing grid and the shop. */
export function WalletLoading({
  billionaire,
  netWorth,
  onDone,
}: WalletLoadingProps) {
  const reduceMotion = useReducedMotion();
  const [target, setTarget] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setTarget(netWorth);
      const done = window.setTimeout(onDone, 300);
      return () => window.clearTimeout(done);
    }

    // One frame at $0 so the count-up has somewhere to start from.
    const start = window.setTimeout(() => setTarget(netWorth), 40);
    const done = window.setTimeout(
      onDone,
      COUNT_UP_SECONDS * 1000 + HOLD_AFTER_COUNT_MS,
    );
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(done);
    };
  }, [netWorth, onDone, reduceMotion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--bg)] px-6"
    >
      <div className="glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Avatar billionaire={billionaire} size={72} />
        </motion.div>

        <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-subtle">
          Loading wallet
        </p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight">
          {billionaire.name}
        </h2>

        <AnimatedNumber
          value={target}
          format={formatFull}
          durationSeconds={COUNT_UP_SECONDS}
          className="tnum mt-6 block text-[clamp(1.75rem,7vw,3.75rem)] font-semibold leading-none tracking-tighter"
        />

        <div className="mt-8 h-px w-40 overflow-hidden bg-line">
          <motion.div
            className="h-full w-full bg-accent"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: reduceMotion ? 0.2 : COUNT_UP_SECONDS,
              ease: "linear",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
